package com.lifesim.backend.domain;

import java.time.LocalDate;

/**
 * 老齢基礎年金の計算結果。
 *
 * @param eligibilityPeriod 計算に使用した受給資格期間
 * @param claimAge 計算に使用した受給開始年齢
 * @param pensionAmount 計算された年金額
 * @param effectiveDate この計算が基づく制度の施行日
 */
public record BasicPensionResult(
    EligibilityPeriod eligibilityPeriod,
    ClaimAge claimAge,
    PensionAmount pensionAmount,
    LocalDate effectiveDate) {}
