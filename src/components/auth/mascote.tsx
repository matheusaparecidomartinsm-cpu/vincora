"use client";
import { useEffect, useState } from "react";

type Estado = "neutro" | "olhando" | "tampando" | "espiando" | "festa" | "triste";

/**
 * Mascote da tela de login: uma caixinha de papelão.
 * Olha para o que você digita no e-mail, tampa os olhos com as abas na senha,
 * espia se a senha estiver visível, comemora ao entrar e fica triste se errar.
 */
export function Mascote() {
  const [estado, setEstado] = useState<Estado>("neutro");
  const [olhar, setOlhar] = useState(0); // -1 (esquerda) a 1 (direita)

  useEffect(() => {
    const doc = document;
    const alvo = (e: Event) => e.target as HTMLInputElement | null;
    const atualizar = (el: HTMLInputElement | null) => {
      if (!el || el.tagName !== "INPUT") return;
      if (el.type === "password") return setEstado("tampando");
      if (el.name === "senha" && el.type === "text") return setEstado("espiando");
      setEstado("olhando");
      const n = el.value.length;
      setOlhar(Math.max(-1, Math.min(1, n / 18 - 0.8)));
    };
    const onFocus = (e: Event) => atualizar(alvo(e));
    const onInput = (e: Event) => atualizar(alvo(e));
    const onBlur = () =>
      setTimeout(() => {
        const a = doc.activeElement as HTMLInputElement | null;
        if (!a || a.tagName !== "INPUT") setEstado((s) => (s === "festa" || s === "triste" ? s : "neutro"));
      }, 0);
    const onResultado = (e: Event) => {
      const r = (e as CustomEvent<string>).detail;
      setEstado(r === "ok" ? "festa" : "triste");
      if (r !== "ok") setTimeout(() => setEstado("neutro"), 1800);
    };
    doc.addEventListener("focusin", onFocus);
    doc.addEventListener("input", onInput);
    doc.addEventListener("focusout", onBlur);
    window.addEventListener("login:resultado", onResultado);
    return () => {
      doc.removeEventListener("focusin", onFocus);
      doc.removeEventListener("input", onInput);
      doc.removeEventListener("focusout", onBlur);
      window.removeEventListener("login:resultado", onResultado);
    };
  }, []);

  const px = estado === "olhando" ? olhar * 7 : 0;
  const py = estado === "olhando" ? 5 : 0;
  const tampa = estado === "tampando";
  const espia = estado === "espiando";

  return (
    <div className={`mascote mascote--${estado}`} aria-hidden="true">
      <svg viewBox="0 0 240 260" className="mascote__svg">
        <ellipse cx="120" cy="248" rx="72" ry="8" className="mascote__sombra" />
        <g className="mascote__corpo">
          {/* corpo */}
          <rect x="40" y="80" width="160" height="150" rx="10" fill="#c49a6c" />
          <rect x="40" y="80" width="160" height="150" rx="10" fill="url(#kraft)" opacity=".35" />
          <path d="M40 120h160" stroke="#a87e52" strokeWidth="3" />
          {/* olhos */}
          <g>
            <ellipse cx="88" cy="150" rx="18" ry={estado === "triste" ? 12 : 20} fill="#fff" />
            <ellipse cx="152" cy="150" rx="18" ry={estado === "triste" ? 12 : 20} fill="#fff" />
            {estado === "festa" ? (
              <>
                <path d="M76 152q12-14 24 0" stroke="#1b1b1b" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M140 152q12-14 24 0" stroke="#1b1b1b" strokeWidth="5" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle className="mascote__pupila" cx={88 + px} cy={152 + py} r="8" fill="#1b1b1b" />
                <circle className="mascote__pupila" cx={152 + px} cy={152 + py} r="8" fill="#1b1b1b" />
              </>
            )}
          </g>
          {/* bochechas e boca */}
          <circle cx="66" cy="182" r="8" fill="#e05a4f" opacity=".45" />
          <circle cx="174" cy="182" r="8" fill="#e05a4f" opacity=".45" />
          {estado === "festa" ? (
            <path d="M100 186q20 22 40 0z" fill="#7a1f1f" />
          ) : estado === "triste" ? (
            <path d="M104 196q16-12 32 0" stroke="#5b3a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
          ) : tampa || espia ? (
            <circle cx="120" cy="192" r="5" fill="#5b3a1e" />
          ) : (
            <path d="M106 188q14 10 28 0" stroke="#5b3a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
          )}
          {/* fita vermelha ProFood */}
          <rect x="112" y="80" width="16" height="40" fill="#d71920" />
        </g>
        {/* abas da caixa: abertas em cima; descem e tampam os olhos na senha */}
        <g className={`mascote__aba mascote__aba--esq ${tampa ? "fechada" : espia ? "espiando" : ""}`}>
          <path d="M40 82 L120 82 L104 30 L30 44 Z" fill="#b8875a" stroke="#9c7046" strokeWidth="2" />
        </g>
        <g className={`mascote__aba mascote__aba--dir ${tampa ? "fechada" : espia ? "espiando" : ""}`}>
          <path d="M120 82 L200 82 L210 44 L136 30 Z" fill="#b8875a" stroke="#9c7046" strokeWidth="2" />
        </g>
        <defs>
          <pattern id="kraft" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".7" fill="#7a5530" />
            <circle cx="4" cy="4" r=".5" fill="#7a5530" />
          </pattern>
        </defs>
      </svg>
      {estado === "festa" && (
        <div className="mascote__confete">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
      )}
    </div>
  );
}
