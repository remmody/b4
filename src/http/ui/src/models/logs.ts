export interface ParsedLog {
  timestamp: string;
  protocol: "TCP" | "UDP";
  hostSet: string;
  ipSet: string;
  domain: string;
  source: string;
  sourceAlias: string;
  destination: string;
  raw: string;
}
