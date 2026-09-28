"use client";

import { useState } from "react";
import {
  listaDeSafras,
  MENSAGEM_SAFRA_INVALIDA,
  normalizarSafra,
} from "@/lib/safra";
import { Campo } from "./forms";

const OUTRA = "__outra__";
const SEM_SAFRA = "";

export function CampoSafra({
  name = "safra",
  defaultValue,
  usadas = [],
  id = "safra",
  obrigatoria = false,
}: {
  name?: string;
  defaultValue?: string | null;
  usadas?: string[];
  id?: string;
  obrigatoria?: boolean;
}) {
  const inicial = normalizarSafra(defaultValue);
  const [bruta, setBruta] = useState(inicial ?? "");
  const [outra, setOutra] = useState(false);
  const [digitada, setDigitada] = useState(defaultValue ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const opcoes = listaDeSafras([...usadas, inicial].filter(Boolean) as string[]);
  const preview = outra ? normalizarSafra(digitada) : null;
  const valorEnviado = outra ? (preview ?? "") : bruta;

  function aoTrocar(v: string) {
    if (v === OUTRA) {
      setOutra(true);
      setErro(null);
      return;
    }
    setOutra(false);
    setBruta(v);
  }

  function aoDigitar(v: string) {
    setDigitada(v);
    if (!v.trim()) {
      setErro(null);
      return;
    }
    const n = normalizarSafra(v);
    setErro(n ? null : MENSAGEM_SAFRA_INVALIDA);
  }

  return (
    <>
      <input type="hidden" name={name} value={valorEnviado} />
      <Campo
        label="Safra"
        htmlFor={id}
        hint={
          outra
            ? undefined
            : "Escolha a safra. Ela agrupa o histórico, os custos e o lucro."
        }
      >
        <select
          id={id}
          className="field-input"
          value={outra ? OUTRA : bruta}
          onChange={(e) => aoTrocar(e.target.value)}
          required={obrigatoria}
        >
          <option value={SEM_SAFRA}>Sem safra</option>
          {opcoes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={OUTRA}>Outra safra…</option>
        </select>
      </Campo>

      {outra && (
        <Campo
          label="Digitar safra"
          htmlFor={`${id}-outra`}
          hint="Formato AAAA/AA — ex.: 2025/26. O app corrige o formato ao salvar."
        >
          <input
            id={`${id}-outra`}
            className="field-input tnum"
            inputMode="numeric"
            value={digitada}
            onChange={(e) => aoDigitar(e.target.value)}
            placeholder="2025/26"
          />
        </Campo>
      )}

      {outra && preview && (
        <p className="text-sm text-ink-2">
          Será gravada como <strong className="tnum">{preview}</strong>.
        </p>
      )}
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </>
  );
}
