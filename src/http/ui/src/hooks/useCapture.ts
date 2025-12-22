import { captureApi, Capture } from "@b4.capture";
import { useCallback, useState } from "react";

export function useCaptures() {
  const [captures, setCaptures] = useState<Capture[]>([]);

  const loadCaptures = useCallback(async () => {
    try {
      const list = await captureApi.list();
      setCaptures(list);
      return list;
    } catch (e) {
      console.error("Failed to load captures:", e);
      return [];
    }
  }, []);

  return { captures, loadCaptures };
}
