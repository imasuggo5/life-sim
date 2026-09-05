package com.lifesim.backend.domain;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * 老齢厚生年金を簡易計算式(平均標準報酬額 × 加入月数 × 5.481/1000)で算出する。
 *
 * <p>年代別の年収・働き方(`働き方 == employee`の年代のみ加入対象)から、加入月数と平均標準報酬額をこのクラスで算出する。受給開始年齢(60〜75歳)による
 * 繰り上げ・繰り下げの増減は{@link BasicPensionCalculator}と同じ率を用いる。
 *
 * <p>簡易化: 乗率は現行(平成15年4月以降)の5.481/1000のみを使用し、それ以前の高い乗率(7.125/1000)は考慮しない。厚生年金加入の最低期間要件(実際は1ヶ月以上)は
 * 簡略化し、加入月数が0なら年金額を0とする。
 */
@Component
public class EmployeePensionCalculator {

  /** 現行(平成15年4月以降)の給付乗率の分子。実際の乗率は{@value}/1000。 */
  static final double BENEFIT_RATE_PER_MILLE = 5.481;

  static final int MILLE = 1000;

  /** 1年代の長さ(年)。 */
  static final int DECADE_LENGTH_YEARS = 10;

  static final long YEN_PER_MAN_YEN = 10_000;

  static final int MINIMUM_RETIREMENT_AGE = 0;
  static final int MAXIMUM_RETIREMENT_AGE = 100;

  private static final int MONTHS_PER_YEAR = 12;

  /** この計算が基づく制度(総報酬制、給付乗率5.481/1000)の施行日。 */
  static final LocalDate EFFECTIVE_DATE = LocalDate.of(2003, 4, 1);

  /**
   * 年代別の年収・働き方、退職年齢、受給開始年齢から老齢厚生年金額を計算する。
   *
   * @param decadeIncomes 年代別の年収・働き方
   * @param retirementAge 退職年齢({@value #MINIMUM_RETIREMENT_AGE}〜{@value #MAXIMUM_RETIREMENT_AGE}歳)
   * @param claimAge 受給開始年齢({@value BasicPensionCalculator#MINIMUM_CLAIM_AGE_YEARS}〜{@value
   *     BasicPensionCalculator#MAXIMUM_CLAIM_AGE_YEARS}歳)
   * @return 計算結果。加入月数が0の場合は年金額0
   * @throws IllegalArgumentException 年収が負の値、退職年齢または受給開始年齢が範囲外の場合
   */
  public EmployeePensionResult calculate(
      List<DecadeIncome> decadeIncomes, int retirementAge, ClaimAge claimAge) {
    for (DecadeIncome decade : decadeIncomes) {
      if (decade.incomeManYen() < 0) {
        throw new IllegalArgumentException("incomeManYen must not be negative");
      }
    }
    if (retirementAge < MINIMUM_RETIREMENT_AGE || retirementAge > MAXIMUM_RETIREMENT_AGE) {
      throw new IllegalArgumentException(
          "retirementAge must be between "
              + MINIMUM_RETIREMENT_AGE
              + " and "
              + MAXIMUM_RETIREMENT_AGE);
    }

    int claimAgeYears = claimAge.years();
    if (claimAgeYears < BasicPensionCalculator.MINIMUM_CLAIM_AGE_YEARS
        || claimAgeYears > BasicPensionCalculator.MAXIMUM_CLAIM_AGE_YEARS) {
      throw new IllegalArgumentException(
          "claimAgeYears must be between "
              + BasicPensionCalculator.MINIMUM_CLAIM_AGE_YEARS
              + " and "
              + BasicPensionCalculator.MAXIMUM_CLAIM_AGE_YEARS);
    }

    long enrolledMonths = 0;
    long weightedIncomeManYenMonths = 0;
    for (DecadeIncome decade : decadeIncomes) {
      if (decade.workStyle() != WorkStyle.EMPLOYEE) {
        continue;
      }
      int decadeEndAge = decade.decadeStartAge() + DECADE_LENGTH_YEARS;
      int cappedEndAge = Math.min(decadeEndAge, retirementAge);
      int enrolledYears = Math.max(0, cappedEndAge - decade.decadeStartAge());
      long decadeEnrolledMonths = (long) enrolledYears * MONTHS_PER_YEAR;

      enrolledMonths += decadeEnrolledMonths;
      weightedIncomeManYenMonths += decade.incomeManYen() * decadeEnrolledMonths;
    }

    if (enrolledMonths == 0) {
      return new EmployeePensionResult(
          new EmployeePensionEligibility(0, 0), claimAge, new PensionAmount(0, 0), EFFECTIVE_DATE);
    }

    long averageStandardRemunerationManYen =
        Math.round((double) weightedIncomeManYenMonths / enrolledMonths / MONTHS_PER_YEAR);
    double averageStandardRemunerationYen = averageStandardRemunerationManYen * YEN_PER_MAN_YEN;

    double baseAnnualAmountYen =
        averageStandardRemunerationYen * enrolledMonths * BENEFIT_RATE_PER_MILLE / MILLE;

    int offsetMonths =
        (claimAgeYears - BasicPensionCalculator.STANDARD_CLAIM_AGE_YEARS) * MONTHS_PER_YEAR;
    double adjustmentRate =
        offsetMonths < 0
            ? 1
                - BasicPensionCalculator.EARLY_CLAIM_REDUCTION_RATE_PER_MONTH
                    * Math.abs(offsetMonths)
            : 1 + BasicPensionCalculator.DEFERRED_CLAIM_INCREASE_RATE_PER_MONTH * offsetMonths;

    long annualAmountYen = Math.round(baseAnnualAmountYen * adjustmentRate);
    long monthlyAmountYen = Math.round(annualAmountYen / (double) MONTHS_PER_YEAR);

    return new EmployeePensionResult(
        new EmployeePensionEligibility((int) enrolledMonths, averageStandardRemunerationManYen),
        claimAge,
        new PensionAmount(annualAmountYen, monthlyAmountYen),
        EFFECTIVE_DATE);
  }
}
