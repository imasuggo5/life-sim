import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main>
      <h1>life-sim</h1>
      <p>API status: {status}</p>
    </main>
  );
}

export default App;
