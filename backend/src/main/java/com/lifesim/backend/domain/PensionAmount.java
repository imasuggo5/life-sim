package com.lifesim.backend.domain;

/**
 * 老齢基礎年金の年金額。
 *
 * @param annualAmountYen 年金額(年額、円)
 * @param monthlyAmountYen 年金額(月額、円)
 */
public record PensionAmount(long annualAmountYen, long monthlyAmountYen) {}
