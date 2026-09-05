import { useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_CLAIM_AGE_YEARS = 65;
const SIMULATION_END_AGE = 100;
const YEN_PER_MAN_YEN = 10_000;
const MONTHS_PER_YEAR = 12;

type WorkStyle = "employee" | "self_employed" | "dependent_spouse";

const WORK_STYLE_OPTIONS: { value: WorkStyle; label: string }[] = [
  { value: "employee", label: "会社員・公務員" },
  { value: "self_employed", label: "自営業・フリーランス" },
  { value: "dependent_spouse", label: "配偶者の扶養" },
];

type NumberInput = number | "";

interface DecadeIncome {
  decadeStartAge: number;
  label: string;
  incomeManYen: NumberInput;
  workStyle: WorkStyle;
}

const INITIAL_DECADE_INCOMES: DecadeIncome[] = [
  {
    decadeStartAge: 20,
    label: "20代",
    incomeManYen: 350,
    workStyle: "employee",
  },
  {
    decadeStartAge: 30,
    label: "30代",
    incomeManYen: 500,
    workStyle: "employee",
  },
  {
    decadeStartAge: 40,
    label: "40代",
    incomeManYen: 650,
    workStyle: "employee",
  },
  {
    decadeStartAge: 50,
    label: "50代",
    incomeManYen: 700,
    workStyle: "employee",
  },
  {
    decadeStartAge: 60,
    label: "60代",
    incomeManYen: 400,
    workStyle: "employee",
  },
];

interface BasicPensionResponse {
  pensionAmount: {
    annualAmountYen: number;
  };
}

interface EmployeePensionResponse {
  eligibility: {
    enrolledMonths: number;
    averageStandardRemunerationManYen: number;
  };
  pensionAmount: {
    annualAmountYen: number;
  };
}

interface ErrorResponse {
  error: string;
}

interface PensionSummary {
  basicAnnualManYen: number;
  employeeAnnualManYen: number;
  enrolledMonths: number;
  averageStandardRemunerationManYen: number;
}

interface ChartPoint {
  age: number;
  savingsManYen: number;
  incomeManYen: number;
  expenseManYen: number;
  annualBalanceManYen: number;
  assetTotalManYen: number;
  totalManYen: number;
}

interface AssetRecord {
  id: string;
  name: string;
  amountManYen: NumberInput;
  annualRatePercent: NumberInput;
}

const INITIAL_ASSET_RECORDS: AssetRecord[] = [
  { id: "asset-1", name: "現金", amountManYen: 1200, annualRatePercent: 0 },
];

function formatManYen(value: number): string {
  return `${Math.round(value).toLocaleString()}万円`;
}

/** 年齢に対応する年代の年収(万円)を返す。60代以降・20歳未満は端の年代の値を使う簡易化。 */
function getIncomeManYenForAge(
  age: number,
  decadeIncomes: { decadeStartAge: number; incomeManYen: number }[],
): number {
  let selected = decadeIncomes[0];
  for (const decade of decadeIncomes) {
    if (age >= decade.decadeStartAge) {
      selected = decade;
    }
  }
  return selected.incomeManYen;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;

  return (
    <div className="life-plan-simulator__tooltip">
      <p className="life-plan-simulator__tooltip-title">{label}歳</p>
      <p className="life-plan-simulator__tooltip-row">
        <span>収入</span>
        <span>{formatManYen(point.incomeManYen)}</span>
      </p>
      <p className="life-plan-simulator__tooltip-row">
        <span>支出</span>
        <span>{formatManYen(point.expenseManYen)}</span>
      </p>
      <p className="life-plan-simulator__tooltip-row">
        <span>年間収支</span>
        <span>{formatManYen(point.annualBalanceManYen)}</span>
      </p>
      <p className="life-plan-simulator__tooltip-row">
        <span>資産額</span>
        <span>{formatManYen(point.assetTotalManYen)}</span>
      </p>
      <p className="life-plan-simulator__tooltip-row">
        <span>貯金額</span>
        <span>{formatManYen(point.savingsManYen)}</span>
      </p>
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  unit: string;
  value: NumberInput;
  onChange: (value: NumberInput) => void;
  min?: number;
  max?: number;
}

/** ラベル+数値入力+単位を1行で並べる共通の入力部品。標準の`.form-row`レイアウトを使う。 */
function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: NumberFieldProps) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? "" : Number(v));
        }}
        required
      />
      <span className="unit">{unit}</span>
    </div>
  );
}

type UnitFieldProps = Omit<NumberFieldProps, "unit">;

function ManYenField(props: UnitFieldProps) {
  return <NumberField {...props} unit="万円" />;
}

function AgeField(props: UnitFieldProps) {
  return <NumberField {...props} unit="歳" />;
}

function MonthsField(props: UnitFieldProps) {
  return <NumberField {...props} unit="カ月" />;
}

function LifePlanSimulator() {
  const [currentAge, setCurrentAge] = useState<NumberInput>(40);
  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(
    INITIAL_ASSET_RECORDS,
  );
  const [decadeIncomes, setDecadeIncomes] = useState<DecadeIncome[]>(
    INITIAL_DECADE_INCOMES,
  );
  const [retirementAge, setRetirementAge] = useState<NumberInput>(65);
  const [retirementBonusManYen, setRetirementBonusManYen] =
    useState<NumberInput>(2000);
  const [livingExpenseManYenPerMonth, setLivingExpenseManYenPerMonth] =
    useState<NumberInput>(17);
  const [housingExpenseManYenPerMonth, setHousingExpenseManYenPerMonth] =
    useState<NumberInput>(8);
  const [insurancePremiumManYenPerMonth, setInsurancePremiumManYenPerMonth] =
    useState<NumberInput>(13);
  const [paidMonths, setPaidMonths] = useState<NumberInput>(480);
  const [claimAgeYears, setClaimAgeYears] = useState<NumberInput>(
    DEFAULT_CLAIM_AGE_YEARS,
  );

  const [chartData, setChartData] = useState<ChartPoint[] | null>(null);
  const [pensionSummary, setPensionSummary] = useState<PensionSummary | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateDecadeIncomeManYen = (
    index: number,
    incomeManYen: NumberInput,
  ) => {
    setDecadeIncomes((prev) =>
      prev.map((d, i) => (i === index ? { ...d, incomeManYen } : d)),
    );
  };

  const updateDecadeWorkStyle = (index: number, workStyle: WorkStyle) => {
    setDecadeIncomes((prev) =>
      prev.map((d, i) => (i === index ? { ...d, workStyle } : d)),
    );
  };

  const addAssetRecord = () => {
    setAssetRecords((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `資産${prev.length + 1}`,
        amountManYen: 0,
        annualRatePercent: 0,
      },
    ]);
  };

  const removeAssetRecord = (id: string) => {
    setAssetRecords((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAssetRecord = (
    id: string,
    patch: Partial<Omit<AssetRecord, "id">>,
  ) => {
    setAssetRecords((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      currentAge === "" ||
      assetRecords.some(
        (a) =>
          a.name.trim() === "" ||
          a.amountManYen === "" ||
          a.annualRatePercent === "",
      ) ||
      decadeIncomes.some((d) => d.incomeManYen === "") ||
      retirementAge === "" ||
      retirementBonusManYen === "" ||
      livingExpenseManYenPerMonth === "" ||
      housingExpenseManYenPerMonth === "" ||
      insurancePremiumManYenPerMonth === "" ||
      paidMonths === "" ||
      claimAgeYears === ""
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setChartData(null);
    setPensionSummary(null);

    try {
      const resolvedDecadeIncomes = decadeIncomes.map((d) => ({
        decadeStartAge: d.decadeStartAge,
        incomeManYen: d.incomeManYen as number,
        workStyle: d.workStyle,
      }));

      const [basicRes, employeeRes] = await Promise.all([
        fetch("/api/pension/basic-pension", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eligibilityPeriod: { paidMonths },
            claimAge: { years: claimAgeYears },
          }),
        }),
        fetch("/api/pension/employee-pension", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decadeIncomes: resolvedDecadeIncomes,
            retirementAge,
            claimAge: { years: claimAgeYears },
          }),
        }),
      ]);

      const basicData: BasicPensionResponse | ErrorResponse =
        await basicRes.json();
      const employeeData: EmployeePensionResponse | ErrorResponse =
        await employeeRes.json();

      if (!basicRes.ok) {
        setError("error" in basicData ? basicData.error : "計算に失敗しました");
        return;
      }
      if (!employeeRes.ok) {
        setError(
          "error" in employeeData ? employeeData.error : "計算に失敗しました",
        );
        return;
      }

      const basicAnnualAmountYen = (basicData as BasicPensionResponse)
        .pensionAmount.annualAmountYen;
      const employeeAnnualAmountYen = (employeeData as EmployeePensionResponse)
        .pensionAmount.annualAmountYen;
      const pensionAnnualAmountYen =
        basicAnnualAmountYen + employeeAnnualAmountYen;
      const eligibility = (employeeData as EmployeePensionResponse).eligibility;

      // 誤差が蓄積しないよう、内部の計算は円単位のまま行う。
      const annualExpenseYen =
        (livingExpenseManYenPerMonth +
          housingExpenseManYenPerMonth +
          insurancePremiumManYenPerMonth) *
        MONTHS_PER_YEAR *
        YEN_PER_MAN_YEN;

      const retirementBonusYen = retirementBonusManYen * YEN_PER_MAN_YEN;

      // 各資産はそれぞれの年利で複利成長させ、毎年の収支は資産の運用とは別に
      // 「現金バッファ」として利率なしで積み上げる(年利0%なら従来通りの単純合計と一致する)。
      let assetBalancesYen = assetRecords.map(
        (a) => (a.amountManYen as number) * YEN_PER_MAN_YEN,
      );
      let cashBufferYen = 0;

      const points: ChartPoint[] = [];
      for (let age = currentAge; age <= SIMULATION_END_AGE; age++) {
        // 退職年齢までは年代別の年収、退職後は年金開始年齢に達するまで収入0円、
        // 年金開始年齢以降は年金額とする(退職と年金受給の重複は考慮しない)。
        // 退職金は退職年齢の年に一時金として一度だけ収入に上乗せする。
        const incomeYen =
          (age < retirementAge
            ? getIncomeManYenForAge(age, resolvedDecadeIncomes) *
              YEN_PER_MAN_YEN
            : age >= claimAgeYears
              ? pensionAnnualAmountYen
              : 0) + (age === retirementAge ? retirementBonusYen : 0);
        if (age > currentAge) {
          assetBalancesYen = assetBalancesYen.map(
            (balance, i) =>
              balance *
              (1 + (assetRecords[i].annualRatePercent as number) / 100),
          );
          cashBufferYen += incomeYen - annualExpenseYen;
        }
        // 貯金額(現金バッファ)には資産を含めない(資産は「資産額」として別枠で表示する)。
        // グラフの縦軸は貯金額+資産額の合計を表示する。
        const assetTotalYen = assetBalancesYen.reduce(
          (sum, balance) => sum + balance,
          0,
        );
        const savingsManYen = cashBufferYen / YEN_PER_MAN_YEN;
        const assetTotalManYen = assetTotalYen / YEN_PER_MAN_YEN;
        points.push({
          age,
          savingsManYen,
          assetTotalManYen,
          totalManYen: savingsManYen + assetTotalManYen,
          incomeManYen: incomeYen / YEN_PER_MAN_YEN,
          expenseManYen: annualExpenseYen / YEN_PER_MAN_YEN,
          annualBalanceManYen: (incomeYen - annualExpenseYen) / YEN_PER_MAN_YEN,
        });
      }

      setChartData(points);
      setPensionSummary({
        basicAnnualManYen: basicAnnualAmountYen / YEN_PER_MAN_YEN,
        employeeAnnualManYen: employeeAnnualAmountYen / YEN_PER_MAN_YEN,
        enrolledMonths: eligibility.enrolledMonths,
        averageStandardRemunerationManYen:
          eligibility.averageStandardRemunerationManYen,
      });
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="life-plan-simulator">
      <h2>生活収支シミュレーション</h2>
      <div className="life-plan-simulator__panels">
        <div className="life-plan-simulator__panel-left">
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend>基本情報</legend>
              <AgeField
                id="currentAge"
                label="現在年齢"
                min={0}
                max={120}
                value={currentAge}
                onChange={setCurrentAge}
              />
            </fieldset>

            <fieldset>
              <legend>収入</legend>
              {decadeIncomes.map((decade, index) => (
                <div className="decade-row" key={decade.decadeStartAge}>
                  <span className="decade-row__label">{decade.label}</span>
                  <select
                    aria-label={`${decade.label}の働き方`}
                    value={decade.workStyle}
                    onChange={(e) => {
                      updateDecadeWorkStyle(index, e.target.value as WorkStyle);
                    }}
                  >
                    {WORK_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`${decade.label}の年収`}
                    type="number"
                    min={0}
                    value={decade.incomeManYen}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateDecadeIncomeManYen(
                        index,
                        value === "" ? "" : Number(value),
                      );
                    }}
                    required
                  />
                  <span className="unit">万円</span>
                </div>
              ))}
              <AgeField
                id="retirementAge"
                label="退職年齢"
                min={0}
                max={100}
                value={retirementAge}
                onChange={setRetirementAge}
              />
              <ManYenField
                id="retirementBonusManYen"
                label="退職金"
                min={0}
                value={retirementBonusManYen}
                onChange={setRetirementBonusManYen}
              />
            </fieldset>

            <fieldset>
              <legend>年金</legend>
              <MonthsField
                id="paidMonths"
                label="保険料納付済月数"
                min={0}
                max={480}
                value={paidMonths}
                onChange={setPaidMonths}
              />
              <AgeField
                id="claimAgeYears"
                label="受給開始年齢"
                min={60}
                max={75}
                value={claimAgeYears}
                onChange={setClaimAgeYears}
              />
            </fieldset>

            <fieldset>
              <legend>収支</legend>
              <ManYenField
                id="livingExpenseManYenPerMonth"
                label="生活費(月額)"
                min={0}
                value={livingExpenseManYenPerMonth}
                onChange={setLivingExpenseManYenPerMonth}
              />
              <ManYenField
                id="housingExpenseManYenPerMonth"
                label="住宅費(月額)"
                min={0}
                value={housingExpenseManYenPerMonth}
                onChange={setHousingExpenseManYenPerMonth}
              />
              <ManYenField
                id="insurancePremiumManYenPerMonth"
                label="保険料(月額)"
                min={0}
                value={insurancePremiumManYenPerMonth}
                onChange={setInsurancePremiumManYenPerMonth}
              />
            </fieldset>

            <fieldset>
              <legend>資産</legend>
              <div className="asset-row asset-row--header">
                <span className="asset-row__number"></span>
                <span className="asset-row__name">名前</span>
                <span className="asset-row__amount">金額</span>
                <span className="unit" style={{ visibility: "hidden" }}>
                  万円
                </span>
                <span className="asset-row__rate">年利</span>
                <span className="unit" style={{ visibility: "hidden" }}>
                  %
                </span>
                <span className="asset-row__delete"></span>
              </div>
              {assetRecords.map((asset, index) => (
                <div className="asset-row" key={asset.id}>
                  <span className="asset-row__number">{index + 1}</span>
                  <input
                    aria-label="資産名"
                    type="text"
                    className="asset-row__name"
                    value={asset.name}
                    onChange={(e) => {
                      updateAssetRecord(asset.id, { name: e.target.value });
                    }}
                    required
                  />
                  <input
                    aria-label="金額"
                    type="number"
                    className="asset-row__amount"
                    min={0}
                    value={asset.amountManYen}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateAssetRecord(asset.id, {
                        amountManYen: value === "" ? "" : Number(value),
                      });
                    }}
                    required
                  />
                  <span className="unit">万円</span>
                  <input
                    aria-label="年利"
                    type="number"
                    className="asset-row__rate"
                    value={asset.annualRatePercent}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateAssetRecord(asset.id, {
                        annualRatePercent: value === "" ? "" : Number(value),
                      });
                    }}
                    required
                  />
                  <span className="unit">%</span>
                  <button
                    type="button"
                    className="asset-row__delete"
                    aria-label="この資産を削除"
                    onClick={() => {
                      removeAssetRecord(asset.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={addAssetRecord}>
                資産を追加
              </button>
            </fieldset>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "計算中..." : "シミュレーション"}
            </button>
          </form>

          {error && <p role="alert">{error}</p>}
        </div>

        <div className="life-plan-simulator__panel-right">
          {pensionSummary && (
            <p className="life-plan-simulator__pension-summary">
              年金試算: 老齢基礎年金{" "}
              {formatManYen(pensionSummary.basicAnnualManYen)}/年 + 老齢厚生年金{" "}
              {formatManYen(pensionSummary.employeeAnnualManYen)}/年 = 合計{" "}
              {formatManYen(
                pensionSummary.basicAnnualManYen +
                  pensionSummary.employeeAnnualManYen,
              )}
              /年
              <br />
              (厚生年金加入月数: {pensionSummary.enrolledMonths}
              ヶ月、平均標準報酬額:{" "}
              {formatManYen(pensionSummary.averageStandardRemunerationManYen)}
              /月)
            </p>
          )}
          {chartData && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="age"
                  label={{ value: "年齢", position: "insideBottomRight" }}
                />
                <YAxis
                  tickFormatter={(value: number) => value.toLocaleString()}
                  label={{
                    value: "累積貯蓄額(万円)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={0}
                  stroke="#cc3333"
                  strokeWidth={2}
                  label={{
                    value: "0万円",
                    position: "insideBottomLeft",
                    fill: "#cc3333",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalManYen"
                  stroke="#3366cc"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

export default LifePlanSimulator;
