import { useState, useCallback } from "react";
import { B4SetConfig } from "@models/Config";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useSets() {
  const [loading, setLoading] = useState(false);

  const createSet = useCallback(
    async (set: Omit<B4SetConfig, "id">): Promise<ApiResponse<B4SetConfig>> => {
      setLoading(true);
      try {
        const response = await fetch("/api/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(set),
        });
        if (!response.ok) {
          return { success: false, error: await response.text() };
        }
        const data = (await response.json()) as B4SetConfig;
        return { success: true, data };
      } catch (e) {
        return { success: false, error: String(e) };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateSet = useCallback(
    async (set: B4SetConfig): Promise<ApiResponse<B4SetConfig>> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/sets/${set.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(set),
        });
        if (!response.ok) {
          return { success: false, error: await response.text() };
        }
        const data = (await response.json()) as B4SetConfig;
        return { success: true, data };
      } catch (e) {
        return { success: false, error: String(e) };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSet = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/sets/${id}`, { method: "DELETE" });
        if (!response.ok) {
          return { success: false, error: await response.text() };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const duplicateSet = useCallback(
    async (set: B4SetConfig): Promise<ApiResponse<B4SetConfig>> => {
      const cloned: Omit<B4SetConfig, "id"> = {
        ...set,
        name: `${set.name} (copy)`,
        targets: { ...set.targets },
        tcp: { ...set.tcp },
        udp: { ...set.udp },
        fragmentation: { ...set.fragmentation },
        faking: { ...set.faking },
      };
      // @ts-expect-error - removing id for creation
      delete cloned.id;
      return createSet(cloned);
    },
    [createSet]
  );

  const reorderSets = useCallback(
    async (setIds: string[]): Promise<ApiResponse<void>> => {
      setLoading(true);
      try {
        const response = await fetch("/api/sets/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ set_ids: setIds }),
        });
        if (!response.ok) {
          return { success: false, error: await response.text() };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createSet,
    updateSet,
    deleteSet,
    duplicateSet,
    reorderSets,
    loading,
  };
}
