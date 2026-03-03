"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DecisionLogEntry } from "@/types/decision";

interface DecisionLogState {
  entries: DecisionLogEntry[];
  addEntry: (entry: DecisionLogEntry) => void;
  clearAll: () => void;
}

export const useDecisionLogStore = create<DecisionLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries],
        })),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: "idss-decision-log",
    }
  )
);
