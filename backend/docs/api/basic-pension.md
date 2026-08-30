# 老齢基礎年金 計算API

保険料納付済月数から、老齢基礎年金の年額・月額を計算するAPI。

## 前提・制約

- 免除期間・猶予期間の考慮はしない簡易計算(保険料納付済月数のみを扱う)。
- 受給資格期間は120ヶ月(10年)以上を要件とする。`paidMonths`が120未満の場合は年金額を`0`とする(受給要件を満たすかどうかはレスポンスの`paidMonths`から`paidMonths >= 120`で判定可能なため、専用フィールドは設けない)。
- 満額(年額)は令和8年度(新規裁定者)の額をコード内に固定値として持つ。年度改定があってもAPIからは変更できない。

## エンドポイント

```
GET /api/pension/basic-pension
```

### クエリパラメータ

| 名前 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `paidMonths` | integer | ✓ | 保険料納付済月数。`0`〜`480`(40年)の範囲。 |

### レスポンス(200 OK)

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `paidMonths` | integer | 計算に使用した保険料納付済月数 |
| `annualAmountYen` | integer | 年金額(年額、円)。120ヶ月未満の場合は`0` |
| `monthlyAmountYen` | integer | 年金額(月額、円)。120ヶ月未満の場合は`0` |

#### 例: 満額(480ヶ月)

```
GET /api/pension/basic-pension?paidMonths=480
```

```json
{
  "paidMonths": 480,
  "annualAmountYen": 847300,
  "monthlyAmountYen": 70608
}
```

#### 例: 受給資格ぎりぎり(120ヶ月)

```
GET /api/pension/basic-pension?paidMonths=120
```

```json
{
  "paidMonths": 120,
  "annualAmountYen": 211825,
  "monthlyAmountYen": 17652
}
```

#### 例: 受給資格未達(119ヶ月)

```
GET /api/pension/basic-pension?paidMonths=119
```

```json
{
  "paidMonths": 119,
  "annualAmountYen": 0,
  "monthlyAmountYen": 0
}
```

### エラーレスポンス(400 Bad Request)

`paidMonths`が`0`〜`480`の範囲外の場合。

```json
{
  "error": "paidMonths must be between 0 and 480"
}
```
