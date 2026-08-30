package com.lifesim.backend.domain;

import org.springframework.stereotype.Component;

/**
 * 老齢基礎年金を簡易計算式(満額 × 保険料納付済月数 ÷ 480ヶ月)で算出する。免除期間は考慮せず、保険料納付済月数のみを扱う。受給資格期間(120ヶ月)未満の場合は年金額を0とする。
 *
 * <p>制度基準日: 令和8年度(2026年度)の制度内容(満額・受給資格期間)を基に実装。2026-08-30時点でnenkin.go.jpの情報を確認済み。
 * 制度改正・年度改定があった場合は、このクラスの定数を更新すること。
 */
@Component
public class BasicPensionCalculator {

  /**
   * 満額の計算の基準となる額(年額、円)。平成16年改正で定められた水準で、法律上はここに毎年度の改定率を乗じて満額が決まる。 参照:
   * https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html
   */
  static final long BASE_AMOUNT_YEN = 780_900;

  /**
   * 令和8年度(新規裁定者)の改定率。毎年度改定される。確認日: 2026-08-30。 参照:
   * https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html
   */
  static final double REVISION_RATE = 1.085;

  /**
   * 令和8年度(新規裁定者)の満額(年額、円)。
   *
   * <p>本来は{@link #BASE_AMOUNT_YEN} × {@link #REVISION_RATE}
   * で算出されるが、改定率は公表用に3桁へ丸めた値のため、単純に掛け算すると公式に公表されている満額(847,300円)とは一致しない(847,277円になる)。
   * そのため、公式に公表されている満額をこの定数として直接保持する。
   */
  static final long FULL_ANNUAL_AMOUNT_YEN = 847_300;

  /** 満額となる納付済月数(40年 = 480ヶ月)。 */
  static final int FULL_CONTRIBUTION_MONTHS = 480;

  /** 受給資格期間(10年 = 120ヶ月)。これに満たない場合は年金額が発生しない。 */
  static final int MINIMUM_ELIGIBLE_MONTHS = 120;

  /**
   * 保険料納付済月数から年金額を計算する。
   *
   * @param paidMonths 保険料納付済月数(0〜{@value #FULL_CONTRIBUTION_MONTHS})
   * @return 計算結果。paidMonthsが{@value #MINIMUM_ELIGIBLE_MONTHS}未満の場合は年金額0
   * @throws IllegalArgumentException paidMonthsが範囲外の場合
   */
  public BasicPensionResult calculate(int paidMonths) {
    if (paidMonths < 0 || paidMonths > FULL_CONTRIBUTION_MONTHS) {
      throw new IllegalArgumentException(
          "paidMonths must be between 0 and " + FULL_CONTRIBUTION_MONTHS);
    }

    if (paidMonths < MINIMUM_ELIGIBLE_MONTHS) {
      return new BasicPensionResult(paidMonths, 0, 0);
    }

    long annualAmountYen =
        Math.round((double) FULL_ANNUAL_AMOUNT_YEN * paidMonths / FULL_CONTRIBUTION_MONTHS);
    long monthlyAmountYen = Math.round(annualAmountYen / 12.0);

    return new BasicPensionResult(paidMonths, annualAmountYen, monthlyAmountYen);
  }
}
