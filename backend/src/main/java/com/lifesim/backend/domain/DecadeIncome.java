package com.lifesim.backend.domain;

/**
 * ある年代(10年単位)の年収と働き方。
 *
 * @param decadeStartAge 年代の開始年齢(例: 20)
 * @param incomeManYen その年代の年収(万円)
 * @param workStyle その年代の働き方
 */
public record DecadeIncome(int decadeStartAge, long incomeManYen, WorkStyle workStyle) {}
