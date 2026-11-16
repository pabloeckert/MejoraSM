/* eslint-disable react-refresh/only-export-components */
// src/context/ProspectCaseContext.tsx
// ESTADO COMPARTIDO DE EXPEDIENTE CONSULTIVO B2B (MejoraSM 2026-2027)
// Sincroniza los datos del prospecto entre los 9 motores consultivos
// (Diagnóstico A4, Dossier 1 a 1, Propuesta B2B, Costo Inacción, Objeciones, Kickoff, Autonomía)

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";

export interface ActiveProspectCase {
  id: string;
  directivo: string;
  empresa: string;
  dolorDetectado: string;
  facturacionMensualARS: number;
  arquetipo: ArquetipoDolor;
  canal: string;
  actualizadoEn: string;
}

const STORAGE_KEY = "mejorasm_active_prospect_cases_v1";

interface ProspectCaseContextType {
  activeCase: ActiveProspectCase | null;
  setActiveCase: (c: ActiveProspectCase | null) => void;
  updateCaseFields: (fields: Partial<ActiveProspectCase>) => void;
  getCaseForLead: (leadId: string, defaults?: Partial<ActiveProspectCase>) => ActiveProspectCase;
  saveCaseForLead: (c: ActiveProspectCase) => void;
}

const ProspectCaseContext = createContext<ProspectCaseContextType | undefined>(undefined);

export function ProspectCaseProvider({ children }: { children: ReactNode }) {
  const [casesMap, setCasesMap] = useState<Record<string, ActiveProspectCase>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeCase, setActiveCaseState] = useState<ActiveProspectCase | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(casesMap));
    } catch {
      // ignore
    }
  }, [casesMap]);

  function saveCaseForLead(c: ActiveProspectCase) {
    setCasesMap((prev) => ({
      ...prev,
      [c.id]: { ...c, actualizadoEn: new Date().toISOString() },
    }));
    if (activeCase?.id === c.id) {
      setActiveCaseState(c);
    }
  }

  function setActiveCase(c: ActiveProspectCase | null) {
    setActiveCaseState(c);
    if (c) {
      saveCaseForLead(c);
    }
  }

  function updateCaseFields(fields: Partial<ActiveProspectCase>) {
    if (!activeCase) return;
    const updated: ActiveProspectCase = {
      ...activeCase,
      ...fields,
      actualizadoEn: new Date().toISOString(),
    };
    setActiveCase(updated);
  }

  function getCaseForLead(leadId: string, defaults?: Partial<ActiveProspectCase>): ActiveProspectCase {
    if (casesMap[leadId]) {
      return casesMap[leadId];
    }
    const newCase: ActiveProspectCase = {
      id: leadId,
      directivo: defaults?.directivo || "Director / Dueño",
      empresa: defaults?.empresa || "Empresa PyME",
      dolorDetectado: defaults?.dolorDetectado || "Falta de claridad en procesos y saturación operativa",
      facturacionMensualARS: defaults?.facturacionMensualARS || 15_000_000,
      arquetipo: defaults?.arquetipo || "fundador_saturado",
      canal: defaults?.canal || "instagram",
      actualizadoEn: new Date().toISOString(),
    };
    return newCase;
  }

  return (
    <ProspectCaseContext.Provider
      value={{
        activeCase,
        setActiveCase,
        updateCaseFields,
        getCaseForLead,
        saveCaseForLead,
      }}
    >
      {children}
    </ProspectCaseContext.Provider>
  );
}

export function useProspectCase() {
  const context = useContext(ProspectCaseContext);
  if (!context) {
    // Fallback soberano desacoplado si se usa fuera de Provider
    return {
      activeCase: null,
      setActiveCase: () => {},
      updateCaseFields: () => {},
      getCaseForLead: (leadId: string, defaults?: Partial<ActiveProspectCase>): ActiveProspectCase => ({
        id: leadId,
        directivo: defaults?.directivo || "Director / Dueño",
        empresa: defaults?.empresa || "Empresa PyME",
        dolorDetectado: defaults?.dolorDetectado || "Saturación operativa",
        facturacionMensualARS: defaults?.facturacionMensualARS || 15_000_000,
        arquetipo: defaults?.arquetipo || "fundador_saturado",
        canal: defaults?.canal || "instagram",
        actualizadoEn: new Date().toISOString(),
      }),
      saveCaseForLead: () => {},
    };
  }
  return context;
}
