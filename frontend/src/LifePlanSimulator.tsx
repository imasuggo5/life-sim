import { useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_CLAIM_AGE_YEARS = 65;
const SIMULATION_END_AGE = 100;

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
  savingsYen: number;
}

type NumberInput = number | "";

function LifePlanSimulator() {
  const [currentAge, setCurrentAge] = useState<NumberInput>(30);
  const [currentSavingsYen, setCurrentSavingsYen] = useState<NumberInput>(0);
  const [annualIncomeYen, setAnnualIncomeYen] =
    useState<NumberInput>(4_000_000);
  const [annualExpenseYen, setAnnualExpenseYen] =
    useState<NumberInput>(3_000_000);
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
      currentSavingsYen === "" ||
      annualIncomeYen === "" ||
      annualExpenseYen === "" ||
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

      const points: ChartPoint[] = [];
      let savingsYen = currentSavingsYen;
      for (let age = currentAge; age <= SIMULATION_END_AGE; age++) {
        if (age > currentAge) {
          const incomeYen =
            age < claimAgeYears ? annualIncomeYen : pensionAnnualAmountYen;
          savingsYen += incomeYen - annualExpenseYen;
        }
        points.push({ age, savingsYen });
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
            <div>
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
            </div>
            <div>
              <label htmlFor="currentSavingsYen">現在の貯蓄額(円)</label>
              <input
                id="currentSavingsYen"
                type="number"
                min={0}
                value={currentSavingsYen}
                onChange={(e) => {
                  const value = e.target.value;
                  setCurrentSavingsYen(value === "" ? "" : Number(value));
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="annualIncomeYen">平均年収(年間、円)</label>
              <input
                id="annualIncomeYen"
                type="number"
                min={0}
                value={annualIncomeYen}
                onChange={(e) => {
                  const value = e.target.value;
                  setAnnualIncomeYen(value === "" ? "" : Number(value));
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="annualExpenseYen">支出(年間、円)</label>
              <input
                id="annualExpenseYen"
                type="number"
                min={0}
                value={annualExpenseYen}
                onChange={(e) => {
                  const value = e.target.value;
                  setAnnualExpenseYen(value === "" ? "" : Number(value));
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="paidMonths">保険料納付済月数(0〜480ヶ月)</label>
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
            </div>
            <div>
              <label htmlFor="claimAgeYears">受給開始年齢(60〜75歳)</label>
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
            </div>
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
                    value: "累積貯蓄額(円)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toLocaleString()}円`}
                  labelFormatter={(age) => `${age}歳`}
                />
                <Line
                  type="monotone"
                  dataKey="savingsYen"
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
