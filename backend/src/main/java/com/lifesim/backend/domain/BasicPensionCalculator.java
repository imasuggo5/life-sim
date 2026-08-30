package com.lifesim.backend.domain;

import org.springframework.stereotype.Component;

/**
 * 老齢基礎年金を簡易計算式(満額 × 保険料納付済月数 ÷
 * 480ヶ月)で算出する。免除期間は考慮せず、保険料納付済月数のみを扱う。受給資格期間(120ヶ月)未満の場合は年金額を0とする。受給開始年齢(60〜75歳)による繰り上げ・繰り下げの増減も考慮する。
 *
 * <p>制度基準日: 令和8年度(2026年度)の制度内容(満額・受給資格期間・繰り上げ/繰り下げ率)を基に実装。2026-08-30時点でnenkin.go.jpの情報を確認済み。
 * 制度改正・年度改定があった場合は、このクラスの定数を更新すること。
 */
@Component
public class BasicPensionCalculator {

  /**
   * 満額の計算の基準となる額(年額、円)。平成16年改正で定められた水準で、法律上はここに毎年度の改定率を乗じて満額が決まる。 参照:
   * https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html
   */
  static final long BASE_AMOUNT_YEN = 780_900;

  /**
   * 令和8年度(新規裁定者)の改定率。毎年度改定される。確認日: 2026-08-30。 参照:
   * https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html
   */
  static final double REVISION_RATE = 1.085;

  /**
   * 令和8年度(新規裁定者)の満額(年額、円)。
   *
   * <p>本来は{@link #BASE_AMOUNT_YEN} × {@link #REVISION_RATE}
   * で算出されるが、改定率は公表用に3桁へ丸めた値のため、単純に掛け算すると公式に公表されている満額(847,300円)とは一致しない(847,277円になる)。
   * そのため、公式に公表されている満額をこの定数として直接保持する。
   */
  static final long FULL_ANNUAL_AMOUNT_YEN = 847_300;

  /** 満額となる納付済月数(40年 = 480ヶ月)。 */
  static final int FULL_CONTRIBUTION_MONTHS = 480;

  /** 受給資格期間(10年 = 120ヶ月)。これに満たない場合は年金額が発生しない。 */
  static final int MINIMUM_ELIGIBLE_MONTHS = 120;

  /** 原則の受給開始年齢(歳)。 */
  static final int STANDARD_CLAIM_AGE_YEARS = 65;

  /** 繰り上げ受給できる最も早い年齢(歳)。 */
  static final int MINIMUM_CLAIM_AGE_YEARS = 60;

  /** 繰り下げ受給できる最も遅い年齢(歳)。 */
  static final int MAXIMUM_CLAIM_AGE_YEARS = 75;

  /** 繰り上げ受給1ヶ月あたりの減額率。2022年4月以降に60歳に達する世代向けの率のみ対応。 */
  static final double EARLY_CLAIM_REDUCTION_RATE_PER_MONTH = 0.004;

  /** 繰り下げ受給1ヶ月あたりの増額率。 */
  static final double DEFERRED_CLAIM_INCREASE_RATE_PER_MONTH = 0.007;

  private static final int MONTHS_PER_YEAR = 12;

  /**
   * 受給資格期間・受給開始年齢から年金額を計算する。
   *
   * @param eligibilityPeriod 受給資格期間(保険料納付済月数は0〜{@value #FULL_CONTRIBUTION_MONTHS})
   * @param claimAge 受給開始年齢({@value #MINIMUM_CLAIM_AGE_YEARS}〜{@value #MAXIMUM_CLAIM_AGE_YEARS}歳)
   * @return 計算結果。保険料納付済月数が{@value #MINIMUM_ELIGIBLE_MONTHS}未満の場合は年金額0
   * @throws IllegalArgumentException 保険料納付済月数または受給開始年齢が範囲外の場合
   */
  public BasicPensionResult calculate(EligibilityPeriod eligibilityPeriod, ClaimAge claimAge) {
    int paidMonths = eligibilityPeriod.paidMonths();
    int claimAgeYears = claimAge.years();

    if (paidMonths < 0 || paidMonths > FULL_CONTRIBUTION_MONTHS) {
      throw new IllegalArgumentException(
          "paidMonths must be between 0 and " + FULL_CONTRIBUTION_MONTHS);
    }
    if (claimAgeYears < MINIMUM_CLAIM_AGE_YEARS || claimAgeYears > MAXIMUM_CLAIM_AGE_YEARS) {
      throw new IllegalArgumentException(
          "claimAgeYears must be between "
              + MINIMUM_CLAIM_AGE_YEARS
              + " and "
              + MAXIMUM_CLAIM_AGE_YEARS);
    }

    if (paidMonths < MINIMUM_ELIGIBLE_MONTHS) {
      return new BasicPensionResult(eligibilityPeriod, claimAge, new PensionAmount(0, 0));
    }

    int offsetMonths = (claimAgeYears - STANDARD_CLAIM_AGE_YEARS) * MONTHS_PER_YEAR;
    double adjustmentRate =
        offsetMonths < 0
            ? 1 - EARLY_CLAIM_REDUCTION_RATE_PER_MONTH * Math.abs(offsetMonths)
            : 1 + DEFERRED_CLAIM_INCREASE_RATE_PER_MONTH * offsetMonths;

    double proportionalAmount =
        (double) FULL_ANNUAL_AMOUNT_YEN * paidMonths / FULL_CONTRIBUTION_MONTHS;
    long annualAmountYen = Math.round(proportionalAmount * adjustmentRate);
    long monthlyAmountYen = Math.round(annualAmountYen / (double) MONTHS_PER_YEAR);

    return new BasicPensionResult(
        eligibilityPeriod, claimAge, new PensionAmount(annualAmountYen, monthlyAmountYen));
  }
}
