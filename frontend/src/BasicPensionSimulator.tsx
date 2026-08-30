import { useState, type FormEvent } from "react";

const DEFAULT_CLAIM_AGE_YEARS = 65;

interface PensionAmount {
  annualAmountYen: number;
  monthlyAmountYen: number;
}

interface BasicPensionResponse {
  eligibilityPeriod: { paidMonths: number };
  claimAge: { years: number };
  pensionAmount: PensionAmount;
  effectiveDate: string;
}

interface ErrorResponse {
  error: string;
}

function BasicPensionSimulator() {
  const [paidMonths, setPaidMonths] = useState<number | "">(480);
  const [claimAgeYears, setClaimAgeYears] = useState<number | "">(
    DEFAULT_CLAIM_AGE_YEARS,
  );
  const [result, setResult] = useState<BasicPensionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (paidMonths === "" || claimAgeYears === "") {
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

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

      setResult(data as BasicPensionResponse);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2>老齢基礎年金シミュレーション</h2>
      <form onSubmit={handleSubmit}>
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

      {result && (
        <>
          <dl>
            <dt>年金額(年額)</dt>
            <dd>{result.pensionAmount.annualAmountYen.toLocaleString()}円</dd>
            <dt>年金額(月額)</dt>
            <dd>{result.pensionAmount.monthlyAmountYen.toLocaleString()}円</dd>
          </dl>
          <p>※{result.effectiveDate}時点の制度に基づく試算です。</p>
        </>
      )}
    </section>
  );
}

export default BasicPensionSimulator;
