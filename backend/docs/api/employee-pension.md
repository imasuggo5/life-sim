# 老齢厚生年金 計算API

## 設計方針

平均標準報酬額・加入月数の算出はバックエンドで行う。フロントエンドは各年代の年収・働き方をそのまま渡す。

## エンドポイント

```
POST /api/pension/employee-pension
Content-Type: application/json
```

### リクエストボディ

```json
{
  "decadeIncomes": [
    { "decadeStartAge": 20, "incomeManYen": 350, "workStyle": "employee" },
    { "decadeStartAge": 30, "incomeManYen": 500, "workStyle": "employee" },
    { "decadeStartAge": 40, "incomeManYen": 650, "workStyle": "employee" },
    { "decadeStartAge": 50, "incomeManYen": 700, "workStyle": "employee" },
    { "decadeStartAge": 60, "incomeManYen": 400, "workStyle": "employee" }
  ],
  "retirementAge": 65,
  "claimAge": { "years": 65 }
}
```

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `decadeIncomes[].decadeStartAge` | integer | ✓ | 年代の開始年齢(例: 20) |
| `decadeIncomes[].incomeManYen` | integer | ✓ | その年代の年収(万円)、0以上 |
| `decadeIncomes[].workStyle` | string | ✓ | `employee` / `self_employed` / `dependent_spouse` のいずれか |
| `retirementAge` | integer | ✓ | 退職年齢(歳)、0〜100 |
| `claimAge.years` | integer | 任意(省略時65) | 受給開始年齢(歳)、60〜75。老齢基礎年金と同じ`ClaimAge`を再利用 |

### 計算方法(バックエンド)

1. 各`decadeIncomes`要素について、`workStyle == employee`の場合のみ加入対象とし、加入月数を求める:
   - `enrolledMonths_i = max(0, min(decadeStartAge + 10, retirementAge) - decadeStartAge) × 12`
   - `employee`以外(`self_employed`/`dependent_spouse`)は`enrolledMonths_i = 0`
2. `enrolledMonths = Σ enrolledMonths_i`
3. `enrolledMonths == 0`の場合、年金額は年額・月額とも`0`
4. それ以外の場合:
   - `averageStandardRemunerationManYen(月額換算) = Σ(incomeManYen_i × enrolledMonths_i) / enrolledMonths / 12`(加入期間で加重平均した年収を月額に換算)
   - `報酬比例部分(年額、円) = averageStandardRemunerationYen(月額) × enrolledMonths × 5.481/1000`
   - 老齢基礎年金と同じ繰り上げ(0.4%/月)・繰り下げ(0.7%/月)を`claimAge`に応じて適用する

### レスポンス(200 OK)

```json
{
  "eligibility": { "enrolledMonths": 480, "averageStandardRemunerationManYen": 540 },
  "claimAge": { "years": 65 },
  "pensionAmount": { "annualAmountYen": 33465288, "monthlyAmountYen": 2788774 }
}
```

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `eligibility.enrolledMonths` | integer | 計算に使用した厚生年金加入月数 |
| `eligibility.averageStandardRemunerationManYen` | integer | 計算に使用した平均標準報酬額(月額、万円) |
| `claimAge.years` | integer | 計算に使用した受給開始年齢(歳) |
| `pensionAmount.annualAmountYen` | integer | 年金額(年額、円) |
| `pensionAmount.monthlyAmountYen` | integer | 年金額(月額、円) |

### エラーレスポンス(400 Bad Request)

- `incomeManYen`が負の値
- `retirementAge`が0〜100の範囲外
- `claimAge.years`が60〜75の範囲外
- `workStyle`が不正な値

```json
{ "error": "incomeManYen must not be negative" }
```

### 簡易化する点

- 乗率は現行(平成15年4月以降)の5.481/1000のみを使用し、それ以前の高い乗率(7.125/1000)は考慮しない
- 厚生年金加入の最低期間要件(実際は1ヶ月以上)は簡略化し、加入月数が0なら年金額0とする
- 年代の途中で退職した場合は、その年代を月数按分して加入月数を切り詰める(20歳未満は考慮しない = 20代開始を最速とする)
