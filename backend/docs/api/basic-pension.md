# 老齢基礎年金 計算API

## 設計方針

- 計算専用(副作用なし)のエンドポイントだが、リクエストが構造化されているためPOST + JSONボディを採用する。
- リクエスト・レスポンスとも、関連する値をオブジェクトとしてグルーピングする。将来的に各オブジェクトの配下にフィールドを追加できるようにする(例: `eligibilityPeriod`に免除期間、`claimAge`に`months`)。
- ドメイン層に`EligibilityPeriod`・`ClaimAge`・`PensionAmount`の値オブジェクト(record)を新設し、`BasicPensionCalculator`はこれらを介して計算する。

## 制度の前提

- 免除期間・猶予期間の考慮はしない簡易計算(保険料納付済月数のみを扱う)。
- 受給資格期間は120ヶ月(10年)以上を要件とする。満たない場合は年金額を`0`とする。
- 原則の受給開始年齢は65歳。繰り上げ受給(60〜64歳)は前倒し月数×0.4%減額、繰り下げ受給(66〜75歳)は繰り下げ月数×0.7%増額(現行世代向けの率のみサポート)。
- 満額(年額)は令和8年度(新規裁定者)の額(847,300円)をコード内に固定値として持つ。基準額780,900円×改定率1.085は公表用の丸め誤差により公式の満額と一致しないため、参照用定数として保持しつつ実計算には公式値を直接使用する。

### 制度基準日

令和8年度(2026年度)の制度内容(満額・受給資格期間・繰り上げ/繰り下げ率)を基に実装。2026-08-30時点で[日本年金機構の情報](https://www.nenkin.go.jp/oshirase/taisetu/kojin/2026/202604/0401.html)を確認済み。制度改正・年度改定があった場合は、`BasicPensionCalculator`の定数とこのドキュメントを合わせて更新すること。

## エンドポイント

```
POST /api/pension/basic-pension
Content-Type: application/json
```

### リクエストボディ

```json
{
  "eligibilityPeriod": { "paidMonths": 480 },
  "claimAge": { "years": 65 }
}
```

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `eligibilityPeriod.paidMonths` | integer | ✓ | 保険料納付済月数。`0`〜`480`の範囲。 |
| `claimAge.years` | integer | 任意(省略時`65`) | 受給開始年齢(歳)。範囲は`60`〜`75`。 |

### レスポンス(200 OK)

```json
{
  "eligibilityPeriod": { "paidMonths": 480 },
  "claimAge": { "years": 65 },
  "pensionAmount": { "annualAmountYen": 847300, "monthlyAmountYen": 70608 },
  "effectiveDate": "2026-04-01"
}
```

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `effectiveDate` | string (ISO 8601 date) | この計算が基づく制度の施行日。令和8年度分の年金額はこの日付から適用されている。 |

#### 例: 60歳受給(5年繰り上げ)

リクエスト:

```json
{ "eligibilityPeriod": { "paidMonths": 480 }, "claimAge": { "years": 60 } }
```

レスポンス:

```json
{
  "eligibilityPeriod": { "paidMonths": 480 },
  "claimAge": { "years": 60 },
  "pensionAmount": { "annualAmountYen": 643948, "monthlyAmountYen": 53662 },
  "effectiveDate": "2026-04-01"
}
```

#### 例: 70歳受給(5年繰り下げ)

レスポンス:

```json
{
  "eligibilityPeriod": { "paidMonths": 480 },
  "claimAge": { "years": 70 },
  "pensionAmount": { "annualAmountYen": 1203166, "monthlyAmountYen": 100264 },
  "effectiveDate": "2026-04-01"
}
```

#### 例: 受給資格未達(119ヶ月)

リクエスト:

```json
{ "eligibilityPeriod": { "paidMonths": 119 } }
```

レスポンス:

```json
{
  "eligibilityPeriod": { "paidMonths": 119 },
  "claimAge": { "years": 65 },
  "pensionAmount": { "annualAmountYen": 0, "monthlyAmountYen": 0 },
  "effectiveDate": "2026-04-01"
}
```

### エラーレスポンス(400 Bad Request)

- `eligibilityPeriod`が無い場合
- `eligibilityPeriod.paidMonths`が`0`〜`480`の範囲外
- `claimAge.years`が`60`〜`75`の範囲外

```json
{ "error": "paidMonths must be between 0 and 480" }
```

```json
{ "error": "claimAgeYears must be between 60 and 75" }
```
