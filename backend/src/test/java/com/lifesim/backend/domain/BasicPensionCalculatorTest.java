package com.lifesim.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Tests for {@link BasicPensionCalculator}. */
class BasicPensionCalculatorTest {

  private final BasicPensionCalculator calculator = new BasicPensionCalculator();

  @Test
  void fullContributionReturnsFullAmount() {
    BasicPensionResult result = calculator.calculate(480);

    assertThat(result.paidMonths()).isEqualTo(480);
    assertThat(result.annualAmountYen()).isEqualTo(847_300);
    assertThat(result.monthlyAmountYen()).isEqualTo(70_608);
  }

  @Test
  void halfContributionReturnsHalfAmount() {
    BasicPensionResult result = calculator.calculate(240);

    assertThat(result.annualAmountYen()).isEqualTo(423_650);
  }

  @Test
  void zeroMonthsReturnsZero() {
    BasicPensionResult result = calculator.calculate(0);

    assertThat(result.annualAmountYen()).isZero();
    assertThat(result.monthlyAmountYen()).isZero();
  }

  @Test
  void belowMinimumEligibleMonthsReturnsZero() {
    BasicPensionResult result = calculator.calculate(119);

    assertThat(result.paidMonths()).isEqualTo(119);
    assertThat(result.annualAmountYen()).isZero();
    assertThat(result.monthlyAmountYen()).isZero();
  }

  @Test
  void minimumEligibleMonthsReturnsCalculatedAmount() {
    BasicPensionResult result = calculator.calculate(120);

    assertThat(result.annualAmountYen()).isEqualTo(211_825);
    assertThat(result.monthlyAmountYen()).isEqualTo(17_652);
  }

  @Test
  void negativeMonthsIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(-1)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void moreThanFullContributionIsRejected() {
    assertThatThrownBy(() -> calculator.calculate(481))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
