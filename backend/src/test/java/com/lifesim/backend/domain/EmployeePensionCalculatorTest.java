package com.lifesim.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Tests for {@link EmployeePensionCalculator}. */
class EmployeePensionCalculatorTest {

  private final EmployeePensionCalculator calculator = new EmployeePensionCalculator();

  @Test
  void allDecadesEmployeeReturnsCalculatedAmount() {
    List<DecadeIncome> decadeIncomes =
        List.of(
            new DecadeIncome(20, 350, WorkStyle.EMPLOYEE),
            new DecadeIncome(30, 500, WorkStyle.EMPLOYEE),
            new DecadeIncome(40, 650, WorkStyle.EMPLOYEE),
            new DecadeIncome(50, 700, WorkStyle.EMPLOYEE),
            new DecadeIncome(60, 400, WorkStyle.EMPLOYEE));

    EmployeePensionResult result = calculator.calculate(decadeIncomes, 65, new ClaimAge(65));

    // 20-60代のうち60代は60-65の5年(60ヶ月)のみ加入。合計加入月数:
    // 20代120 + 30代120 + 40代120 + 50代120 + 60代60 = 540ヶ月
    assertThat(result.eligibility().enrolledMonths()).isEqualTo(540);
    // 加重平均年収 = (350*120 + 500*120 + 650*120 + 700*120 + 400*60) / 540 = 533.33万円
    // 平均標準報酬額(月額) = 533.33 / 12 = 44万円(四捨五入)
    assertThat(result.eligibility().averageStandardRemunerationManYen()).isEqualTo(44);
    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(1_302_286);
  }

  @Test
  void noEmployeeDecadesReturnsZero() {
    List<DecadeIncome> decadeIncomes =
        List.of(
            new DecadeIncome(20, 350, WorkStyle.SELF_EMPLOYED),
            new DecadeIncome(30, 500, WorkStyle.DEPENDENT_SPOUSE));

    EmployeePensionResult result = calculator.calculate(decadeIncomes, 65, new ClaimAge(65));

    assertThat(result.eligibility().enrolledMonths()).isZero();
    assertThat(result.eligibility().averageStandardRemunerationManYen()).isZero();
    assertThat(result.pensionAmount().annualAmountYen()).isZero();
    assertThat(result.pensionAmount().monthlyAmountYen()).isZero();
  }

  @Test
  void singleFullDecadeCalculatesExpectedAmount() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, 600, WorkStyle.EMPLOYEE));

    EmployeePensionResult result = calculator.calculate(decadeIncomes, 30, new ClaimAge(65));

    assertThat(result.eligibility().enrolledMonths()).isEqualTo(120);
    assertThat(result.eligibility().averageStandardRemunerationManYen()).isEqualTo(50);
    // 50万円 * 10,000円 * 120ヶ月 * 5.481/1000 = 328,860円
    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(328_860);
  }

  @Test
  void retirementBeforeDecadeStartExcludesThatDecade() {
    List<DecadeIncome> decadeIncomes =
        List.of(
            new DecadeIncome(20, 350, WorkStyle.EMPLOYEE),
            new DecadeIncome(60, 400, WorkStyle.EMPLOYEE));

    EmployeePensionResult result = calculator.calculate(decadeIncomes, 30, new ClaimAge(65));

    assertThat(result.eligibility().enrolledMonths()).isEqualTo(120);
  }

  @Test
  void earlyClaimAt60ReducesAmount() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, 600, WorkStyle.EMPLOYEE));

    EmployeePensionResult full = calculator.calculate(decadeIncomes, 30, new ClaimAge(65));
    EmployeePensionResult early = calculator.calculate(decadeIncomes, 30, new ClaimAge(60));

    assertThat(early.pensionAmount().annualAmountYen())
        .isLessThan(full.pensionAmount().annualAmountYen());
  }

  @Test
  void deferredClaimAt70IncreasesAmount() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, 600, WorkStyle.EMPLOYEE));

    EmployeePensionResult full = calculator.calculate(decadeIncomes, 30, new ClaimAge(65));
    EmployeePensionResult deferred = calculator.calculate(decadeIncomes, 30, new ClaimAge(70));

    assertThat(deferred.pensionAmount().annualAmountYen())
        .isGreaterThan(full.pensionAmount().annualAmountYen());
  }

  @Test
  void negativeIncomeIsRejected() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, -1, WorkStyle.EMPLOYEE));

    assertThatThrownBy(() -> calculator.calculate(decadeIncomes, 65, new ClaimAge(65)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void retirementAgeAboveMaximumIsRejected() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, 350, WorkStyle.EMPLOYEE));

    assertThatThrownBy(() -> calculator.calculate(decadeIncomes, 101, new ClaimAge(65)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void claimAgeOutOfRangeIsRejected() {
    List<DecadeIncome> decadeIncomes = List.of(new DecadeIncome(20, 350, WorkStyle.EMPLOYEE));

    assertThatThrownBy(() -> calculator.calculate(decadeIncomes, 65, new ClaimAge(59)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
