package com.lifesim.backend.domain;

/**
 * 老齢基礎年金の受給開始年齢。現時点では歳単位のみを扱うが、将来的に月単位の端数を追加する余地を持たせている。
 *
 * @param years 受給開始年齢(歳)
 */
public record ClaimAge(int years) {}
