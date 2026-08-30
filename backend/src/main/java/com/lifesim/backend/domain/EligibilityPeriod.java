package com.lifesim.backend.domain;

/**
 * 老齢基礎年金の受給資格期間。現時点では保険料納付済月数のみを扱うが、将来的に免除期間等を追加する余地を持たせている。
 *
 * @param paidMonths 保険料納付済月数
 */
public record EligibilityPeriod(int paidMonths) {}
