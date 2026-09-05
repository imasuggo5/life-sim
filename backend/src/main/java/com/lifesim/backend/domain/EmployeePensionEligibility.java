package com.lifesim.backend.domain;

/**
 * 老齢厚生年金の受給資格の算出結果。
 *
 * @param enrolledMonths 厚生年金加入月数
 * @param averageStandardRemunerationManYen 平均標準報酬額(月額、万円)
 */
public record EmployeePensionEligibility(
    int enrolledMonths, long averageStandardRemunerationManYen) {}
