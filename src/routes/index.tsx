import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Subway Premiado — Corre e ganha até 110.000 Kz" },
      {
        name: "description",
        content:
          "Joga a corrida Subway Premiado, junta 110 moedas e saca 110.000 Kz por Multicaixa Express ou Unitel Money.",
      },
      { property: "og:title", content: "Subway Premiado — Corre e ganha até 110.000 Kz" },
      {
        property: "og:description",
        content:
          "Corrida 3D no telemóvel: apanha moedas, atinge a meta e levanta os teus ganhos em Kz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // Warm the game's critical resources while the user is still on the
      // funnel, so "JOGAR AGORA" transitions to a running game near-instantly.
      { rel: "prefetch", href: "/game/index.html", as: "document" },
      { rel: "prefetch", href: "/game/game.css", as: "style" },
      { rel: "prefetch", href: "/game/game.js", as: "script" },
      { rel: "prefetch", href: "/js/games_lib/ludiAdapter.js", as: "script" },
      { rel: "prefetch", href: "/js/inflate.min.js", as: "script" },
      { rel: "prefetch", href: "/js/vendor.js", as: "script" },
      { rel: "prefetch", href: "/js/main.js", as: "script" },
      { rel: "prefetch", href: "/assets/data/config.json", as: "fetch" },
      { rel: "prefetch", href: "/assets/preload/splash_mip.png", as: "image" },
    ],
  }),
});

const META_COINS = 110;

function fmtKz(v: number) {
  return v.toLocaleString("pt-PT").replace(/[\s\u00a0\u202f,]/g, ".") + " Kz";
}

function useFade() {
  const [fading, setFading] = useState(false);
  const go = (url: string) => {
    setFading(true);
    setTimeout(() => {
      window.location.assign(url + (window.location.search || ""));
    }, 600);
  };
  return { fading, go };
}

function Index() {
  const [step, setStep] = useState<"menu" | "withdraw">("menu");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setStep(p.get("step") === "withdraw" ? "withdraw" : "menu");
  }, []);

  return step === "withdraw" ? <Withdraw /> : <Menu />;
}

/* ============ MENU ============ */
function Menu() {
  const { fading, go } = useFade();
  const [coins, setCoins] = useState(0);
  const [record, setRecord] = useState(0);

  useEffect(() => {
    try {
      setCoins(parseInt(localStorage.getItem("subway_total_coins") || "0", 10) || 0);
      setRecord(parseInt(localStorage.getItem("subway_highscore") || "0", 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const progress = Math.min((coins / META_COINS) * 100, 100);

  return (
    <div className="sw-screen">
      <FontLinks />
      <div className={"sw-transition" + (fading ? " active" : "")} />
      <div className="sw-bg" />
      <main className="sw-menu">
        <h1 className="sw-logo">
          SUBWAY
          <span>PREMIADO</span>
        </h1>
        <p className="sw-tag">Corre, apanha moedas e transforma em Kz!</p>

        <div className="sw-card">
          <div className="sw-row">
            <span>💰 Saldo</span>
            <strong className="green">{fmtKz(coins * 1000)}</strong>
          </div>
          <div className="sw-row">
            <span>🪙 Moedas</span>
            <strong className="gold">
              {coins} / {META_COINS}
            </strong>
          </div>
          <div className="sw-row">
            <span>🏆 Recorde</span>
            <strong className="blue">{record.toLocaleString("pt-PT")}</strong>
          </div>
          <div className="sw-track">
            <div className="sw-fill" style={{ width: progress + "%" }} />
          </div>
          <div className="sw-hint">
            {coins >= META_COINS
              ? "✅ Meta atingida! Podes sacar!"
              : `Faltam ${META_COINS - coins} moedas para sacar 110.000 Kz`}
          </div>
        </div>

        <button className="sw-btn play" onClick={() => go("/game/index.html")}>
          ▶ JOGAR AGORA
        </button>
        <button
          className="sw-btn withdraw"
          onClick={() => go("/?step=withdraw")}
          disabled={coins < META_COINS}
          style={coins < META_COINS ? { opacity: 0.5 } : undefined}
        >
          💰 SACAR
        </button>

        <ul className="sw-how">
          <li>Desliza para trocar de linha, saltar e rolar.</li>
          <li>Cada moeda vale 1.000 Kz.</li>
          <li>Ao chegar a 110 moedas podes levantar o prémio.</li>
        </ul>
      </main>
      <Styles />
    </div>
  );
}

/* ============ WITHDRAW ============ */
function Withdraw() {
  const { fading, go } = useFade();
  const [amount, setAmount] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("Multicaixa Express");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const a = parseInt(localStorage.getItem("subway_withdrawal_amount") || "0", 10);
      const coins = parseInt(localStorage.getItem("subway_total_coins") || "0", 10) || 0;
      setAmount(a || coins * 1000 || 110000);
    } catch {
      setAmount(110000);
    }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return setError("Escreve o teu nome completo.");
    if (!/^[0-9\s+]{9,15}$/.test(phone.trim())) return setError("Número de telemóvel inválido.");
    setError("");
    setDone(true);
  };

  return (
    <div className="sw-screen">
      <FontLinks />
      <div className={"sw-transition" + (fading ? " active" : "")} />
      <div className="sw-bg" />
      <main className="sw-menu">
        {done ? (
          <div className="sw-card center">
            <div className="sw-big">🎉</div>
            <h2 className="sw-title">Pedido enviado!</h2>
            <p className="sw-text">
              O levantamento de <strong className="green">{fmtKz(amount)}</strong> foi registado para{" "}
              <strong>{name}</strong> ({phone}) via {method}.
            </p>
            <p className="sw-text small">Vais receber a confirmação por SMS.</p>
            <button className="sw-btn play" onClick={() => go("/")}>
              Voltar ao Menu
            </button>
          </div>
        ) : (
          <>
            <h1 className="sw-logo small">
              SACAR
              <span>OS TEUS GANHOS</span>
            </h1>
            <div className="sw-card">
              <div className="sw-amount">
                <span>Disponível para levantamento</span>
                <strong className="green">{fmtKz(amount)}</strong>
              </div>
              <form onSubmit={submit}>
                <label className="sw-label">Nome completo</label>
                <input
                  className="sw-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: João Domingos"
                />
                <label className="sw-label">Telemóvel</label>
                <input
                  className="sw-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9XX XXX XXX"
                  inputMode="tel"
                />
                <label className="sw-label">Método</label>
                <div className="sw-methods">
                  {["Multicaixa Express", "Unitel Money"].map((m) => (
                    <button
                      type="button"
                      key={m}
                      className={"sw-method" + (method === m ? " on" : "")}
                      onClick={() => setMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {error && <div className="sw-error">{error}</div>}
                <button className="sw-btn play" type="submit">
                  CONFIRMAR SAQUE
                </button>
              </form>
            </div>
            <button className="sw-btn ghost" onClick={() => go("/")}>
              Voltar ao Menu
            </button>
          </>
        )}
      </main>
      <Styles />
    </div>
  );
}

function FontLinks() {
  return (
    <>
      <link rel="stylesheet" href="/assets/font/lilita-one.css" />
      <link rel="stylesheet" href="/assets/font/titan-one.css" />
    </>
  );
}

function Styles() {
  return (
    <style>{`
    .sw-screen { position: relative; min-height: 100vh; width: 100%; overflow-x: hidden;
      font-family: 'Lilita One', cursive; color: #fff; background: #14122b; }
    .sw-bg { position: fixed; inset: 0; z-index: 0;
      background:
        radial-gradient(circle at 20% 10%, rgba(255,164,205,0.35), transparent 55%),
        radial-gradient(circle at 85% 20%, rgba(243,156,18,0.35), transparent 50%),
        linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f1226 100%); }
    .sw-menu { position: relative; z-index: 1; max-width: 420px; margin: 0 auto;
      padding: 28px 18px 40px; display: flex; flex-direction: column; gap: 14px; }
    .sw-logo { font-family: 'Titan One', cursive; text-align: center; margin: 8px 0 0;
      font-size: 44px; line-height: 0.95; color: #ffd700; letter-spacing: 1px;
      text-shadow: 3px 3px 0 #33281a, 0 8px 20px rgba(0,0,0,0.6); }
    .sw-logo.small { font-size: 34px; }
    .sw-logo span { display: block; font-size: 20px; color: #fff; letter-spacing: 4px; }
    .sw-tag { text-align: center; font-size: 14px; color: rgba(255,255,255,0.75); margin: 0 0 4px; }
    .sw-card { background: #ebe5d3; border: 5px solid #33281a; border-radius: 22px;
      padding: 16px; box-shadow: 0 8px 0 #33281a, 0 18px 40px rgba(0,0,0,0.45); color: #5a4e3c; }
    .sw-card.center { text-align: center; }
    .sw-row { display: flex; justify-content: space-between; align-items: center;
      background: #faf6ec; border: 3px solid #33281a; border-radius: 14px;
      padding: 10px 14px; margin-bottom: 8px; box-shadow: 0 3px 0 #d4cbb8; font-size: 16px; }
    .sw-row strong { font-size: 18px; }
    .green { color: #16a34a; } .gold { color: #e67e22; } .blue { color: #2563eb; }
    .sw-track { height: 16px; background: rgba(0,0,0,0.35); border-radius: 9px;
      overflow: hidden; border: 2px solid #33281a; margin-top: 6px; }
    .sw-fill { height: 100%; background: linear-gradient(90deg,#2ecc71,#f1c40f,#e67e22);
      transition: width .5s ease; }
    .sw-hint { text-align: center; font-size: 13px; margin-top: 8px; color: #5a4e3c; }
    .sw-btn { font-family: 'Lilita One', cursive; border-radius: 16px; padding: 15px 18px;
      font-size: 20px; letter-spacing: 1.2px; text-transform: uppercase; color: #fff;
      border: 3px solid #1a5c2e; cursor: pointer; width: 100%;
      text-shadow: 2px 2px 0 rgba(0,0,0,0.35); box-shadow: 0 5px 0 #1a5c2e, 0 8px 16px rgba(0,0,0,0.35); }
    .sw-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #1a5c2e; }
    .sw-btn.play { background: linear-gradient(180deg,#4cd137 0%,#27ae60 100%); }
    .sw-btn.withdraw { background: linear-gradient(180deg,#ffd700 0%,#e67e22 100%); }
    .sw-btn.ghost { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25);
      box-shadow: none; font-size: 16px; }
    .sw-how { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 6px;
      font-size: 13px; color: rgba(255,255,255,0.7); text-align: center; }
    .sw-amount { text-align: center; margin-bottom: 14px; }
    .sw-amount span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .sw-amount strong { font-size: 34px; }
    .sw-label { display: block; font-size: 13px; margin: 10px 0 4px; color: #5a4e3c; }
    .sw-input { width: 100%; box-sizing: border-box; border: 3px solid #33281a; border-radius: 12px;
      padding: 12px; font-size: 16px; font-family: inherit; background: #faf6ec; color: #33281a; }
    .sw-methods { display: flex; gap: 8px; }
    .sw-method { flex: 1; border: 3px solid #33281a; border-radius: 12px; padding: 10px 6px;
      font-family: inherit; font-size: 13px; background: #faf6ec; color: #33281a; cursor: pointer; }
    .sw-method.on { background: #4cd137; color: #fff; }
    .sw-error { color: #d63031; font-size: 13px; margin: 10px 0 0; text-align: center; }
    .sw-title { font-size: 26px; color: #33281a; margin: 6px 0; }
    .sw-text { font-size: 15px; margin: 6px 0; } .sw-text.small { font-size: 13px; opacity: .8; }
    .sw-big { font-size: 54px; }
    .sw-transition { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none;
      z-index: 99999; transition: opacity .6s ease-in-out; }
    .sw-transition.active { opacity: 1; pointer-events: all; }
  `}</style>
  );
}
