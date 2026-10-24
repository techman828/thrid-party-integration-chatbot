"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as db from "./db";
import { fetchModels } from "./api";
import { ensureSession, supabaseConfigured } from "./supabase";
import { BUILTIN_PROVIDER_ID, type ModelInfo, type Provider } from "./types";

export interface ProviderStatus {
  loading: boolean;
  error: string | null;
  count: number;
  /** False when the built-in provider has no API key (neither in Settings nor on the server). */
  configured: boolean;
}

export interface ProviderInput {
  name: string;
  base_url: string;
  /** Omitted on edit to keep the stored key. */
  api_key?: string;
}

type ProviderModelsState = ProviderStatus & { models: ModelInfo[] };

const BUILTIN_NAME = "OneProvider";

/** The user's API providers and the models each one serves. Shared by the chat and the settings page. */
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [builtinOverride, setBuiltinOverride] = useState<Provider | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModelsState>>({});
  const [error, setError] = useState<string | null>(null);

  // Built-in provider first, then user-added ones in the order they were created.
  const providerOrder = useMemo(
    () => [{ id: BUILTIN_PROVIDER_ID, name: BUILTIN_NAME }, ...providers.map(({ id, name }) => ({ id, name }))],
    [providers],
  );
  const models = useMemo(
    () => providerOrder.flatMap((p) => providerModels[p.id]?.models ?? []),
    [providerOrder, providerModels],
  );
  const modelsLoading = providerOrder.some((p) => providerModels[p.id]?.loading ?? true);
  const modelsError =
    providerOrder
      .filter((p) => providerModels[p.id]?.error)
      .map((p) => `${p.name}: ${providerModels[p.id].error}`)
      .join("\n") || null;

  const loadProviderModels = useCallback(async (providerId: string, providerName: string) => {
    setProviderModels((prev) => ({
      ...prev,
      [providerId]: { models: prev[providerId]?.models ?? [], count: prev[providerId]?.count ?? 0, configured: true, loading: true, error: null },
    }));
    let next: ProviderModelsState;
    try {
      const { models: list, configured } = await fetchModels(providerId);
      const withProvider = list.map((m) => ({ ...m, provider_id: providerId, provider_name: providerName }));
      next = { models: withProvider, count: list.length, configured, loading: false, error: null };
    } catch (err) {
      next = { models: [], count: 0, configured: true, loading: false, error: (err as Error).message };
    }
    setProviderModels((prev) => ({ ...prev, [providerId]: next }));
  }, []);

  const loadAllModels = useCallback(
    (list: Provider[]) => {
      void loadProviderModels(BUILTIN_PROVIDER_ID, BUILTIN_NAME);
      for (const p of list) void loadProviderModels(p.id, p.name);
    },
    [loadProviderModels],
  );

  useEffect(() => {
    if (!supabaseConfigured) return;
    (async () => {
      try {
        await ensureSession();
        const [list, override] = await Promise.all([db.listProviders(), db.getBuiltinOverride()]);
        setProviders(list);
        setBuiltinOverride(override);
        loadAllModels(list);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [loadAllModels]);

  async function createProvider(input: ProviderInput) {
    const created = await db.createProvider({ ...input, api_key: input.api_key ?? "" });
    setProviders((prev) => [...prev, created]);
    void loadProviderModels(created.id, created.name);
  }

  async function updateProvider(id: string, input: ProviderInput) {
    const updated = await db.updateProvider(id, input);
    setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
    void loadProviderModels(updated.id, updated.name);
  }

  async function deleteProvider(id: string) {
    await db.deleteProvider(id);
    setProviders((prev) => prev.filter((p) => p.id !== id));
    setProviderModels((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveBuiltin(input: ProviderInput) {
    const saved = builtinOverride
      ? await db.updateProvider(builtinOverride.id, { base_url: input.base_url, api_key: input.api_key })
      : await db.createBuiltinOverride({ base_url: input.base_url, api_key: input.api_key ?? "" });
    setBuiltinOverride(saved);
    void loadProviderModels(BUILTIN_PROVIDER_ID, BUILTIN_NAME);
  }

  async function resetBuiltin() {
    if (!builtinOverride) return;
    await db.deleteProvider(builtinOverride.id);
    setBuiltinOverride(null);
    void loadProviderModels(BUILTIN_PROVIDER_ID, BUILTIN_NAME);
  }

  function refreshProvider(id: string) {
    const name = providerOrder.find((p) => p.id === id)?.name ?? id;
    void loadProviderModels(id, name);
  }

  return {
    providers,
    builtinOverride,
    /** Per-provider model list and status, keyed by provider id. */
    status: providerModels as Record<string, ProviderStatus>,
    models,
    modelsLoading,
    modelsError,
    error,
    reloadModels: () => loadAllModels(providers),
    createProvider,
    updateProvider,
    deleteProvider,
    saveBuiltin,
    resetBuiltin,
    refreshProvider,
  };
}
