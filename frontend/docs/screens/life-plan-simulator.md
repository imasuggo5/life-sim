# 生活収支シミュレーション画面

## 画面の目的

現在年齢・現在の貯蓄額・平均年収・支出・年金関連情報を入力し、将来の年齢ごとの累積貯蓄額の推移を折れ線グラフで確認できるようにする。既存の老齢基礎年金単体試算画面(`BasicPensionSimulator`)を拡張してこの画面にする(新規画面は作らない)。

## レイアウト

- 左パネル: 入力フォーム(セクションごとに`<fieldset>`でグルーピング)
- 右パネル: シミュレーション結果(折れ線グラフ、Rechartsを使用)

入力欄は1行にラベル+入力欄+単位を並べる。ラベル部分の幅を固定することで全項目の入力欄の開始位置を揃え、単位(万円・歳・ヶ月)は入力欄の右側に表示する(ラベル文言には単位・範囲を含めない)。

## 入力項目(左パネル、セクション構成)

| セクション | 項目             | フィールド名                     | 型      | 単位(右表示) | 制約                 |
| ---------- | ---------------- | -------------------------------- | ------- | ------------ | -------------------- |
| 基本情報   | 現在年齢         | `currentAge`                     | integer | 歳           | 0〜120               |
| 収入       | 平均年収         | `annualIncomeManYen`             | integer | 万円         | 0以上                |
| 収入       | 退職年齢         | `retirementAge`                  | integer | 歳           | 0〜100(デフォルト65) |
| 収支       | 生活費(月額)     | `livingExpenseManYenPerMonth`    | integer | 万円         | 0以上                |
| 収支       | 住宅費(月額)     | `housingExpenseManYenPerMonth`   | integer | 万円         | 0以上                |
| 収支       | 保険料(月額)     | `insurancePremiumManYenPerMonth` | integer | 万円         | 0以上                |
| 資産       | 現在の貯蓄額     | `currentSavingsManYen`           | integer | 万円         | 0以上                |
| 年金       | 保険料納付済月数 | `paidMonths`                     | integer | ヶ月         | 0〜480               |
| 年金       | 受給開始年齢     | `claimAgeYears`                  | integer | 歳           | 60〜75(デフォルト65) |

支出は「生活費」「住宅費」「保険料」の3項目に月額で入力し、12倍した合計を年間支出として扱う。

ボタン: 「シミュレーション」

金額系の入力・グラフ表示はすべて万円単位とする(内部の計算は誤差蓄積を避けるため円単位で行い、表示直前に万円へ変換する)。

## 計算方法

1. `POST /api/pension/basic-pension` を1回呼び出し、`pensionAmount.annualAmountYen`(年金の年額、円)を取得する。
2. 入力(万円)を円に変換する:
   - `annualIncomeYen = annualIncomeManYen × 10,000`
   - `currentSavingsYen = currentSavingsManYen × 10,000`
   - `annualExpenseYen = (livingExpenseManYenPerMonth + housingExpenseManYenPerMonth + insurancePremiumManYenPerMonth) × 12 × 10,000`
3. 年齢`currentAge`〜`100`について、累積貯蓄額(円)を計算する:
   - `cumulative[currentAge] = currentSavingsYen`
   - 各年齢の収入は次のいずれか(退職と年金受給の重複は考慮しない簡易計算):
     - `age < retirementAge`: `annualIncomeYen`(在職中)
     - `retirementAge <= age かつ age < claimAgeYears`: `0`(退職済みだが年金受給前)
     - `age >= claimAgeYears`: 年金の年額(受給開始後)
   - `cumulative[age] = cumulative[age - 1] + 収入 - annualExpenseYen`
4. 表示直前に万円へ変換(`÷ 10,000`)し、横軸=年齢、縦軸=累積貯蓄額(万円)の折れ線グラフとして表示する。グラフには0万円のラインを強調表示する(赤色の基準線)。
5. グラフ上の各点をホバーした際のツールチップに、その年齢の「収入」「支出」「年間収支(収入−支出)」「累積貯蓄額」をあわせて表示する。

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
