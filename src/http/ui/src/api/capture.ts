import { apiGet } from "./apiClient";
import { Capture } from "@models/settings";

export const captureApi = {
  list: () => apiGet<Capture[]>("/api/capture/list"),
};
