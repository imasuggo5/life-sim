# 生活収支シミュレーション画面

## 画面の目的

現在年齢・現在の貯蓄額・平均年収・支出・年金関連情報を入力し、将来の年齢ごとの累積貯蓄額の推移を折れ線グラフで確認できるようにする。既存の老齢基礎年金単体試算画面(`BasicPensionSimulator`)を拡張してこの画面にする(新規画面は作らない)。

## レイアウト

- 左パネル: 入力フォーム
- 右パネル: シミュレーション結果(折れ線グラフ、Rechartsを使用)

## 入力項目(左パネル)

| 項目                 | フィールド名             | 型      | 制約                 |
| -------------------- | ------------------------ | ------- | -------------------- |
| 現在年齢             | `currentAge`             | integer | 0〜120               |
| 現在の貯蓄額         | `currentSavingsManYen`   | integer | 0以上(単位: 万円)    |
| 平均年収(年間、額面) | `annualIncomeManYen`     | integer | 0以上(単位: 万円)    |
| 生活費(年間)         | `livingExpenseManYen`    | integer | 0以上(単位: 万円)    |
| 住宅費(年間)         | `housingExpenseManYen`   | integer | 0以上(単位: 万円)    |
| 保険料(年間)         | `insurancePremiumManYen` | integer | 0以上(単位: 万円)    |
| 保険料納付済月数     | `paidMonths`             | integer | 0〜480               |
| 受給開始年齢         | `claimAgeYears`          | integer | 60〜75(デフォルト65) |

支出は「生活費」「住宅費」「保険料」の3項目に分けて入力し、合計を年間支出として扱う。

ボタン: 「シミュレーション」

金額系の入力・グラフ表示はすべて万円単位とする(内部の計算は誤差蓄積を避けるため円単位で行い、表示直前に万円へ変換する)。

## 計算方法

1. `POST /api/pension/basic-pension` を1回呼び出し、`pensionAmount.annualAmountYen`(年金の年額、円)を取得する。
2. 入力(万円)を円に変換する: `annualIncomeYen = annualIncomeManYen × 10,000`、`currentSavingsYen = currentSavingsManYen × 10,000`、`annualExpenseYen = (livingExpenseManYen + housingExpenseManYen + insurancePremiumManYen) × 10,000`。
3. 年齢`currentAge`〜`100`について、累積貯蓄額(円)を計算する:
   - `cumulative[currentAge] = currentSavingsYen`
   - 各年齢について、`age < claimAgeYears`なら収入=`annualIncomeYen`、`age >= claimAgeYears`なら収入=年金の年額
   - `cumulative[age] = cumulative[age - 1] + 収入 - annualExpenseYen`
4. 表示直前に万円へ変換(`÷ 10,000`)し、横軸=年齢、縦軸=累積貯蓄額(万円)の折れ線グラフとして表示する。

## 前提・簡易化

- シミュレーション終了年齢は100歳固定。
- 年収・支出は生涯一定と仮定(昇給・インフレ・支出変化は考慮しない)。
- 老齢基礎年金以外の収入(厚生年金、貯蓄の運用益等)は考慮しない。
- 額面ベースの簡易計算(税・社会保険料控除は考慮しない)。

## 使用ライブラリ

[Recharts](https://recharts.org/)(React向けの代表的なOSSチャートライブラリ)を新規に追加する。

## 状態・エラー

- 入力必須項目が空の場合は送信不可
- API呼び出し失敗時はエラーメッセージ表示
- 計算中はローディング表示(ボタン無効化)
