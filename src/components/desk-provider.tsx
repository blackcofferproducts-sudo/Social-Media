"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { absorbDesk, normaliseDesk, type DeskState } from "@/lib/desk";

const KEY = "cityjam-desk-v4";

type DeskApi = {
  desk: DeskState;
  ready: boolean;
  deskRef: { current: DeskState };
  commit: (next: DeskState) => void;
};

const DeskContext = createContext<DeskApi | null>(null);

function readStored(): DeskState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normaliseDesk(JSON.parse(raw) as DeskState);
  } catch {
    return null;
  }
}

export function DeskProvider({ initial, children }: { initial: DeskState; children: React.ReactNode }) {
  const [desk, setDesk] = useState(initial);
  const deskRef = useRef(initial);
  const [ready, setReady] = useState(false);

  const commit = useCallback((next: DeskState) => {
    const merged = absorbDesk(deskRef.current, normaliseDesk(next));
    deskRef.current = merged;
    setDesk(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // The list still updates for this visit when the browser blocks storage.
    }
  }, []);

  useEffect(() => {
    const stored = readStored();
    const fromBrowser = stored ? absorbDesk(initial, stored) : initial;
    const merged = absorbDesk(fromBrowser, deskRef.current);
    deskRef.current = merged;
    setDesk(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // A blocked store still shows the comments for this visit.
    }
    setReady(true);
  }, [initial]);

  return <DeskContext.Provider value={{ desk, ready, deskRef, commit }}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error("Desk is not available.");
  return value;
}
