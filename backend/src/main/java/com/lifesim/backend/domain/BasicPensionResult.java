package com.lifesim.backend.domain;

/**
 * 老齢基礎年金の計算結果。
 *
 * @param paidMonths 計算に使用した保険料納付済月数
 * @param annualAmountYen 計算された年金額(年額、円)
 * @param monthlyAmountYen 計算された年金額(月額、円)
 */
public record BasicPensionResult(int paidMonths, long annualAmountYen, long monthlyAmountYen) {}
