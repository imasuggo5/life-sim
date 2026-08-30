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
}

type NumberInput = number | "";

function LifePlanSimulator() {
  const [currentAge, setCurrentAge] = useState<NumberInput>(40);
  const [currentSavingsManYen, setCurrentSavingsManYen] =
    useState<NumberInput>(1200);
  const [annualIncomeManYen, setAnnualIncomeManYen] =
    useState<NumberInput>(600);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      currentAge === "" ||
      currentSavingsManYen === "" ||
      annualIncomeManYen === "" ||
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
      const annualIncomeYen = annualIncomeManYen * YEN_PER_MAN_YEN;
      const annualExpenseYen =
        (livingExpenseManYenPerMonth +
          housingExpenseManYenPerMonth +
          insurancePremiumManYenPerMonth) *
        MONTHS_PER_YEAR *
        YEN_PER_MAN_YEN;

      const points: ChartPoint[] = [];
      let savingsYen = currentSavingsManYen * YEN_PER_MAN_YEN;
      for (let age = currentAge; age <= SIMULATION_END_AGE; age++) {
        if (age > currentAge) {
          const incomeYen =
            age < claimAgeYears ? annualIncomeYen : pensionAnnualAmountYen;
          savingsYen += incomeYen - annualExpenseYen;
        }
        points.push({ age, savingsManYen: savingsYen / YEN_PER_MAN_YEN });
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
              <div className="form-row">
                <label htmlFor="currentAge">現在年齢</label>
                <input
                  id="currentAge"
                  type="number"
                  min={0}
                  max={120}
                  value={currentAge}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentAge(value === "" ? "" : Number(value));
                  }}
                  required
                />
                <span className="unit">歳</span>
              </div>
            </fieldset>

            <fieldset>
              <legend>収入</legend>
              <div className="form-row">
                <label htmlFor="annualIncomeManYen">平均年収</label>
                <input
                  id="annualIncomeManYen"
                  type="number"
                  min={0}
                  value={annualIncomeManYen}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAnnualIncomeManYen(value === "" ? "" : Number(value));
                  }}
                  required
                />
                <span className="unit">万円</span>
              </div>
            </fieldset>

            <fieldset>
              <legend>収支</legend>
              <div className="form-row">
                <label htmlFor="livingExpenseManYenPerMonth">
                  生活費(月額)
                </label>
                <input
                  id="livingExpenseManYenPerMonth"
                  type="number"
                  min={0}
                  value={livingExpenseManYenPerMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLivingExpenseManYenPerMonth(
                      value === "" ? "" : Number(value),
                    );
                  }}
                  required
                />
                <span className="unit">万円</span>
              </div>
              <div className="form-row">
                <label htmlFor="housingExpenseManYenPerMonth">
                  住宅費(月額)
                </label>
                <input
                  id="housingExpenseManYenPerMonth"
                  type="number"
                  min={0}
                  value={housingExpenseManYenPerMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHousingExpenseManYenPerMonth(
                      value === "" ? "" : Number(value),
                    );
                  }}
                  required
                />
                <span className="unit">万円</span>
              </div>
              <div className="form-row">
                <label htmlFor="insurancePremiumManYenPerMonth">
                  保険料(月額)
                </label>
                <input
                  id="insurancePremiumManYenPerMonth"
                  type="number"
                  min={0}
                  value={insurancePremiumManYenPerMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInsurancePremiumManYenPerMonth(
                      value === "" ? "" : Number(value),
                    );
                  }}
                  required
                />
                <span className="unit">万円</span>
              </div>
            </fieldset>

            <fieldset>
              <legend>資産</legend>
              <div className="form-row">
                <label htmlFor="currentSavingsManYen">現在の貯蓄額</label>
                <input
                  id="currentSavingsManYen"
                  type="number"
                  min={0}
                  value={currentSavingsManYen}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentSavingsManYen(value === "" ? "" : Number(value));
                  }}
                  required
                />
                <span className="unit">万円</span>
              </div>
            </fieldset>

            <fieldset>
              <legend>年金</legend>
              <div className="form-row">
                <label htmlFor="paidMonths">保険料納付済月数</label>
                <input
                  id="paidMonths"
                  type="number"
                  min={0}
                  max={480}
                  value={paidMonths}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaidMonths(value === "" ? "" : Number(value));
                  }}
                  required
                />
                <span className="unit">ヶ月</span>
              </div>
              <div className="form-row">
                <label htmlFor="claimAgeYears">受給開始年齢</label>
                <input
                  id="claimAgeYears"
                  type="number"
                  min={60}
                  max={75}
                  value={claimAgeYears}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClaimAgeYears(value === "" ? "" : Number(value));
                  }}
                  required
                />
                <span className="unit">歳</span>
              </div>
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
                <Tooltip
                  formatter={(value) =>
                    `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}万円`
                  }
                  labelFormatter={(age) => `${age}歳`}
                />
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
