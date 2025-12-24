import { useState, useCallback, useEffect, useRef } from "react";
import { ApiError, ApiResponse } from "@api/apiClient";
import { discoveryApi, DiscoverySuite } from "@b4.discovery";
import { B4SetConfig } from "@b4.sets";

export function useDiscovery() {
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [suite, setSuite] = useState<DiscoverySuite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("discovery_suiteId");
    if (saved) {
      setSuiteId(saved);
      setDiscoveryRunning(true);
    }
  }, []);

  useEffect(() => {
    if (suiteId) {
      localStorage.setItem("discovery_suiteId", suiteId);
    }
  }, [suiteId]);

  useEffect(() => {
    if (!suiteId || !discoveryRunning) return;

    const fetchStatus = async () => {
      try {
        const data = await discoveryApi.status(suiteId);
        setSuite(data);
        if (["complete", "failed", "canceled"].includes(data.status)) {
          setDiscoveryRunning(false);
          localStorage.removeItem("discovery_suiteId");
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setDiscoveryRunning(false);
          localStorage.removeItem("discovery_suiteId");
          setSuiteId(null);
          return;
        }
        setError(e instanceof Error ? e.message : "Unknown error");
        setDiscoveryRunning(false);
      }
    };

    pollRef.current = setInterval(() => void fetchStatus(), 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [suiteId, discoveryRunning]);

  const startDiscovery = useCallback(
    async (url: string): Promise<ApiResponse<void>> => {
      setError(null);
      setSuite(null);
      setDiscoveryRunning(true);
      try {
        url = url.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        const res = await discoveryApi.start(url);
        setSuiteId(res.id); // assuming start returns { id: string }
        return { success: true };
      } catch (e) {
        setDiscoveryRunning(false);
        if (e instanceof ApiError) {
          return { success: false, error: JSON.stringify(e.body ?? e.message) };
        }
        return { success: false, error: String(e) };
      }
    },
    []
  );

  const cancelDiscovery = useCallback(async (): Promise<void> => {
    if (!suiteId) return;
    try {
      await discoveryApi.cancel(suiteId);
      setDiscoveryRunning(false);
    } catch (e) {
      console.error("Failed to cancel discovery:", e);
    }
  }, [suiteId]);

  const resetDiscovery = useCallback(() => {
    localStorage.removeItem("discovery_suiteId");
    setSuiteId(null);
    setSuite(null);
    setError(null);
    setDiscoveryRunning(false);
  }, []);

  const addPresetAsSet = useCallback(
    async (config: B4SetConfig): Promise<ApiResponse<void>> => {
      try {
        await discoveryApi.addPresetAsSet(config);
        return { success: true };
      } catch (e) {
        if (e instanceof ApiError) {
          return { success: false, error: JSON.stringify(e.body ?? e.message) };
        }
        return { success: false, error: String(e) };
      }
    },
    []
  );

  return {
    discoveryRunning,
    suiteId,
    suite,
    error,
    startDiscovery,
    cancelDiscovery,
    resetDiscovery,
    addPresetAsSet,
  };
}
