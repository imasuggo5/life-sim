package com.lifesim.backend.domain;

/**
 * 老齢基礎年金の計算結果。
 *
 * @param eligibilityPeriod 計算に使用した受給資格期間
 * @param claimAge 計算に使用した受給開始年齢
 * @param pensionAmount 計算された年金額
 */
public record BasicPensionResult(
    EligibilityPeriod eligibilityPeriod, ClaimAge claimAge, PensionAmount pensionAmount) {}
