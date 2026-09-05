package com.lifesim.backend.interfaces;

import com.lifesim.backend.domain.ClaimAge;
import com.lifesim.backend.domain.DecadeIncome;
import java.util.List;

/**
 * 老齢厚生年金計算APIのリクエストボディ。
 *
 * @param decadeIncomes 年代別の年収・働き方
 * @param retirementAge 退職年齢
 * @param claimAge 受給開始年齢(省略時は65歳として扱う)
 */
record EmployeePensionRequest(
    List<DecadeIncome> decadeIncomes, int retirementAge, ClaimAge claimAge) {}
