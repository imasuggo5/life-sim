package com.lifesim.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Tests for {@link BasicPensionCalculator}. */
class BasicPensionCalculatorTest {

  private final BasicPensionCalculator calculator = new BasicPensionCalculator();

  @Test
  void fullContributionAtStandardAgeReturnsFullAmount() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(480), new ClaimAge(65));

    assertThat(result.eligibilityPeriod().paidMonths()).isEqualTo(480);
    assertThat(result.claimAge().years()).isEqualTo(65);
    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(847_300);
    assertThat(result.pensionAmount().monthlyAmountYen()).isEqualTo(70_608);
  }

  @Test
  void halfContributionReturnsHalfAmount() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(240), new ClaimAge(65));

    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(423_650);
  }

  @Test
  void zeroMonthsReturnsZero() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(0), new ClaimAge(65));

    assertThat(result.pensionAmount().annualAmountYen()).isZero();
    assertThat(result.pensionAmount().monthlyAmountYen()).isZero();
  }

  @Test
  void belowMinimumEligibleMonthsReturnsZero() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(119), new ClaimAge(65));

    assertThat(result.eligibilityPeriod().paidMonths()).isEqualTo(119);
    assertThat(result.pensionAmount().annualAmountYen()).isZero();
    assertThat(result.pensionAmount().monthlyAmountYen()).isZero();
  }

  @Test
  void minimumEligibleMonthsReturnsCalculatedAmount() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(120), new ClaimAge(65));

    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(211_825);
    assertThat(result.pensionAmount().monthlyAmountYen()).isEqualTo(17_652);
  }

  @Test
  void negativeMonthsIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(new EligibilityPeriod(-1), new ClaimAge(65)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void moreThanFullContributionIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(new EligibilityPeriod(481), new ClaimAge(65)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void earlyClaimAt60ReducesAmount() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(480), new ClaimAge(60));

    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(643_948);
    assertThat(result.pensionAmount().monthlyAmountYen()).isEqualTo(53_662);
  }

  @Test
  void deferredClaimAt70IncreasesAmount() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(480), new ClaimAge(70));

    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(1_203_166);
    assertThat(result.pensionAmount().monthlyAmountYen()).isEqualTo(100_264);
  }

  @Test
  void deferredClaimAt75ReturnsMaximumIncrease() {
    BasicPensionResult result = calculator.calculate(new EligibilityPeriod(480), new ClaimAge(75));

    assertThat(result.pensionAmount().annualAmountYen()).isEqualTo(1_559_032);
    assertThat(result.pensionAmount().monthlyAmountYen()).isEqualTo(129_919);
  }

  @Test
  void claimAgeBelowMinimumIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(new EligibilityPeriod(480), new ClaimAge(59)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void claimAgeAboveMaximumIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(new EligibilityPeriod(480), new ClaimAge(76)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
