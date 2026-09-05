package com.lifesim.backend.domain;

/**
 * 老齢厚生年金の計算結果。
 *
 * @param eligibility 計算に使用した受給資格(加入月数・平均標準報酬額)
 * @param claimAge 計算に使用した受給開始年齢
 * @param pensionAmount 計算された年金額
 */
public record EmployeePensionResult(
    EmployeePensionEligibility eligibility, ClaimAge claimAge, PensionAmount pensionAmount) {}
