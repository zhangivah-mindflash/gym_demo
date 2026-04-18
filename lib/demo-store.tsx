"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialDemoState } from "@/lib/mock-data";
import type { AssistantMode, AssistantResponse, DemoState, MemberProfile } from "@/lib/demo-types";

type CoachEditPayload = {
  memberId: string;
  dayId: string;
  focus: string;
  intensity: string;
  coachNote: string;
  reason: string;
};

type ReviewPayload = {
  memberId: string;
  completedSessions: number;
  fatigueScore: number;
  weightChangeKg: number;
  note: string;
};

type DemoContextValue = {
  state: DemoState;
  isBootstrapped: boolean;
  isSaving: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  saveProfile: (profile: MemberProfile) => Promise<void>;
  togglePlanDay: (dayId: string) => Promise<void>;
  applyCoachEdit: (payload: CoachEditPayload) => Promise<boolean>;
  submitReview: (payload: ReviewPayload) => Promise<void>;
  toggleKnowledgeBase: (id: string) => Promise<void>;
  updateKnowledgeBase: (payload: { id: string; name: string; description: string; category: string; documents: number; enabled: boolean }) => Promise<void>;
  updateModelSetting: (id: string, value: string) => Promise<void>;
  applyAssistantResult: (mode: AssistantMode, response: AssistantResponse) => Promise<void>;
  selectMember: (memberId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

async function requestDemoState(action?: string, payload?: Record<string, unknown>): Promise<DemoState> {
  const response = await fetch("/api/demo", {
    method: action ? "POST" : "GET",
    headers: action ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
    body: action ? JSON.stringify({ action, ...payload }) : undefined,
  });
  if (!response.ok) {
    throw new Error("Failed to sync demo state");
  }
  const json = (await response.json()) as { data: DemoState };
  return json.data;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    const nextState = await requestDemoState();
    setState(nextState);
    setIsBootstrapped(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const nextState = await requestDemoState(action, payload);
      setState(nextState);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        return false;
      }
      await refresh();
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setState(initialDemoState);
      await refresh();
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      isBootstrapped,
      isSaving,
      login,
      logout,
      saveProfile: async (profile) => runMutation("save_profile", { profile }),
      togglePlanDay: async (dayId) => runMutation("toggle_plan_day", { dayId }),
      applyCoachEdit: async (payload) => {
        if (!payload.reason.trim()) return false;
        await runMutation("apply_coach_edit", payload);
        return true;
      },
      submitReview: async (payload) => runMutation("submit_review", payload),
      toggleKnowledgeBase: async (id) => runMutation("toggle_knowledge_base", { id }),
      updateKnowledgeBase: async (payload) => runMutation("update_knowledge_base", payload),
      updateModelSetting: async (id, value) => runMutation("update_model_setting", { id, value }),
      applyAssistantResult: async (mode, response) =>
        runMutation("apply_assistant_result", { mode, response, memberId: state.memberProfile.id }),
      selectMember: async (memberId) => runMutation("select_member", { memberId }),
      refresh,
    }),
    [state, isBootstrapped, isSaving, login, logout, runMutation, refresh],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return context;
}
