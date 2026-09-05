package com.lifesim.backend.domain;

import java.time.LocalDate;

/**
 * 老齢厚生年金の計算結果。
 *
 * @param eligibility 計算に使用した受給資格(加入月数・平均標準報酬額)
 * @param claimAge 計算に使用した受給開始年齢
 * @param pensionAmount 計算された年金額
 * @param effectiveDate この計算が基づく制度の施行日
 */
public record EmployeePensionResult(
    EmployeePensionEligibility eligibility,
    ClaimAge claimAge,
    PensionAmount pensionAmount,
    LocalDate effectiveDate) {}
