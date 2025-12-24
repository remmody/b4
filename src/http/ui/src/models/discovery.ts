import { B4SetConfig } from "@b4.sets";
export type StrategyFamily =
  | "none"
  | "tcp_frag"
  | "tls_record"
  | "oob"
  | "ip_frag"
  | "fake_sni"
  | "sack"
  | "syn_fake"
  | "desync"
  | "delay"
  | "disorder"
  | "overlap"
  | "extsplit"
  | "firstbyte"
  | "combo"
  | "hybrid"
  | "window"
  | "mutation";

export type DiscoveryPhase =
  | "fingerprint"
  | "baseline"
  | "strategy_detection"
  | "optimization"
  | "dns_detection"
  | "combination";

export type DPIType =
  | "unknown"
  | "tspu"
  | "sandvine"
  | "huawei"
  | "allot"
  | "fortigate"
  | "none";

export type BlockingMethod =
  | "rst_inject"
  | "timeout"
  | "redirect"
  | "content_inject"
  | "tls_alert"
  | "none";

export interface DPIFingerprint {
  type: DPIType;
  blocking_method: BlockingMethod;
  inspection_depth: string;
  rst_latency_ms: number;
  dpi_hop_count: number;
  is_inline: boolean;
  confidence: number;
  optimal_ttl: number;
  vulnerable_to_ttl: boolean;
  vulnerable_to_frag: boolean;
  vulnerable_to_desync: boolean;
  vulnerable_to_oob: boolean;
  recommended_families: StrategyFamily[];
}
export interface DomainPresetResult {
  preset_name: string;
  family?: StrategyFamily;
  phase?: DiscoveryPhase;
  status: "complete" | "failed";
  duration: number;
  speed: number;
  bytes_read: number;
  error?: string;
  status_code: number;
  set?: B4SetConfig;
}

export interface DiscoveryResult {
  domain: string;
  best_preset: string;
  best_speed: number;
  best_success: boolean;
  results: Record<string, DomainPresetResult>;
  baseline_speed?: number;
  improvement?: number;
  fingerprint?: DPIFingerprint;
}

export interface DiscoverySuite {
  id: string;
  status: "pending" | "running" | "complete" | "failed" | "canceled";
  start_time: string;
  end_time: string;
  total_checks: number;
  completed_checks: number;
  current_phase?: DiscoveryPhase;
  domain_discovery_results?: Record<string, DiscoveryResult>;
  fingerprint?: DPIFingerprint;
}

export interface DiscoveryResponse {
  id: string;
  estimated_tests: number;
  message: string;
  domain: string;
  check_url: string;
}
