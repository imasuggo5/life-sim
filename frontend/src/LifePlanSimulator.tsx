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

interface ErrorResponse {
  error: string;
}

interface ChartPoint {
  age: number;
  savingsManYen: number;
  incomeManYen: number;
  expenseManYen: number;
  annualBalanceManYen: number;
}

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
        <span>累積貯蓄額</span>
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
  const [currentSavingsManYen, setCurrentSavingsManYen] =
    useState<NumberInput>(1200);
  const [decadeIncomes, setDecadeIncomes] = useState<DecadeIncome[]>(
    INITIAL_DECADE_INCOMES,
  );
  const [retirementAge, setRetirementAge] = useState<NumberInput>(65);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      currentAge === "" ||
      currentSavingsManYen === "" ||
      decadeIncomes.some((d) => d.incomeManYen === "") ||
      retirementAge === "" ||
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

    try {
      const res = await fetch("/api/pension/basic-pension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eligibilityPeriod: { paidMonths },
          claimAge: { years: claimAgeYears },
        }),
      });

      const data: BasicPensionResponse | ErrorResponse = await res.json();

      if (!res.ok) {
        setError("error" in data ? data.error : "計算に失敗しました");
        return;
      }

      const pensionAnnualAmountYen = (data as BasicPensionResponse)
        .pensionAmount.annualAmountYen;

      // 誤差が蓄積しないよう、内部の計算は円単位のまま行う。
      const resolvedDecadeIncomes = decadeIncomes.map((d) => ({
        decadeStartAge: d.decadeStartAge,
        incomeManYen: d.incomeManYen as number,
      }));
      const annualExpenseYen =
        (livingExpenseManYenPerMonth +
          housingExpenseManYenPerMonth +
          insurancePremiumManYenPerMonth) *
        MONTHS_PER_YEAR *
        YEN_PER_MAN_YEN;

      const points: ChartPoint[] = [];
      let savingsYen = currentSavingsManYen * YEN_PER_MAN_YEN;
      for (let age = currentAge; age <= SIMULATION_END_AGE; age++) {
        // 退職年齢までは年代別の年収、退職後は年金開始年齢に達するまで収入0円、
        // 年金開始年齢以降は年金額とする(退職と年金受給の重複は考慮しない)。
        const incomeYen =
          age < retirementAge
            ? getIncomeManYenForAge(age, resolvedDecadeIncomes) *
              YEN_PER_MAN_YEN
            : age >= claimAgeYears
              ? pensionAnnualAmountYen
              : 0;
        if (age > currentAge) {
          savingsYen += incomeYen - annualExpenseYen;
        }
        points.push({
          age,
          savingsManYen: savingsYen / YEN_PER_MAN_YEN,
          incomeManYen: incomeYen / YEN_PER_MAN_YEN,
          expenseManYen: annualExpenseYen / YEN_PER_MAN_YEN,
          annualBalanceManYen: (incomeYen - annualExpenseYen) / YEN_PER_MAN_YEN,
        });
      }

      setChartData(points);
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
              <ManYenField
                id="currentSavingsManYen"
                label="現在の貯蓄額"
                min={0}
                value={currentSavingsManYen}
                onChange={setCurrentSavingsManYen}
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

            <button type="submit" disabled={isLoading}>
              {isLoading ? "計算中..." : "シミュレーション"}
            </button>
          </form>

          {error && <p role="alert">{error}</p>}
        </div>

        <div className="life-plan-simulator__panel-right">
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
                  dataKey="savingsManYen"
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
