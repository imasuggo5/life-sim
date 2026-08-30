package com.lifesim.backend.interfaces;

import com.lifesim.backend.domain.ClaimAge;
import com.lifesim.backend.domain.EligibilityPeriod;

/**
 * 老齢基礎年金計算APIのリクエストボディ。
 *
 * @param eligibilityPeriod 受給資格期間
 * @param claimAge 受給開始年齢(省略時は65歳として扱う)
 */
record BasicPensionRequest(EligibilityPeriod eligibilityPeriod, ClaimAge claimAge) {}
