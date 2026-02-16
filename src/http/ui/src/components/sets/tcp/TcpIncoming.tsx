import { Grid } from "@mui/material";
import {
  B4SetConfig,
  IncomingMode,
} from "@models/config";
import {
  B4Slider,
  B4Select,
  B4Alert,
  B4FormHeader,
} from "@b4.elements";

interface TcpIncomingProps {
  config: B4SetConfig;
  onChange: (
    field: string,
    value: string | number | boolean | number[],
  ) => void;
}

const incomingModeOptions: { label: string; value: IncomingMode }[] = [
  { label: "Disabled", value: "off" },
  { label: "Fake Packets", value: "fake" },
  { label: "Reset Injection", value: "reset" },
  { label: "FIN Injection", value: "fin" },
  { label: "Desync Combo", value: "desync" },
];

const incomingModeDescriptions: Record<IncomingMode, string> = {
  off: "No incoming packet manipulation",
  fake: "Inject corrupted ACK packets toward server with low TTL on every incoming data packet",
  reset: "Inject fake RST packets when incoming bytes threshold reached",
  fin: "Inject fake FIN packets when incoming bytes threshold reached",
  desync: "Inject RST+FIN+ACK combo when incoming bytes threshold reached",
};

const incomingStrategyOptions: { label: string; value: string }[] = [
  { label: "Bad Checksum", value: "badsum" },
  { label: "Bad Sequence", value: "badseq" },
  { label: "Bad ACK", value: "badack" },
  { label: "Random", value: "rand" },
  { label: "All Corruptions", value: "all" },
];

const incomingStrategyDescriptions: Record<string, string> = {
  badsum: "Corrupt TCP checksum only - packets dropped by kernel",
  badseq: "Corrupt sequence number - packets ignored by TCP stack",
  badack: "Corrupt ACK number - packets ignored by TCP stack",
  rand: "Randomly pick corruption method per packet",
  all: "Apply all corruptions: bad seq + bad ack + bad checksum",
};

export const TcpIncoming = ({ config, onChange }: TcpIncomingProps) => {
  return (
    <>
      <B4FormHeader label="Incoming Response Bypass" />
      <Grid container spacing={3}>
        <B4Alert>
          Manipulates incoming server responses to bypass DPI that throttles
          connections after receiving ~15-20KB. Injects fake packets toward
          server that DPI sees but die before reaching destination.
        </B4Alert>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Select
            label="Incoming Mode"
            value={config.tcp.incoming?.mode || "off"}
            options={incomingModeOptions}
            onChange={(e) =>
              onChange("tcp.incoming.mode", e.target.value as string)
            }
            helperText={
              incomingModeDescriptions[config.tcp.incoming?.mode || "off"]
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Select
            label="Corruption Strategy"
            value={config.tcp.incoming?.strategy || "badsum"}
            options={incomingStrategyOptions}
            onChange={(e) =>
              onChange("tcp.incoming.strategy", e.target.value as string)
            }
            disabled={config.tcp.incoming?.mode === "off"}
            helperText={
              config.tcp.incoming?.mode === "off"
                ? "Enable incoming mode first"
                : incomingStrategyDescriptions[
                    config.tcp.incoming?.strategy || "badsum"
                  ]
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Slider
            label="Fake TTL"
            value={config.tcp.incoming?.fake_ttl || 3}
            onChange={(value: number) =>
              onChange("tcp.incoming.fake_ttl", value)
            }
            min={1}
            max={20}
            step={1}
            disabled={config.tcp.incoming?.mode === "off"}
            helperText="Low TTL ensures fakes expire before reaching server"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Slider
            label="Fake Count"
            value={config.tcp.incoming?.fake_count || 3}
            onChange={(value: number) =>
              onChange("tcp.incoming.fake_count", value)
            }
            min={1}
            max={10}
            step={1}
            disabled={config.tcp.incoming?.mode === "off"}
            helperText="Number of fake packets per injection"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Slider
            label="Threshold Min"
            value={config.tcp.incoming?.min || 14}
            onChange={(value: number) => onChange("tcp.incoming.min", value)}
            min={5}
            max={config.tcp.incoming?.max || 150}
            step={1}
            valueSuffix=" KB"
            disabled={
              config.tcp.incoming?.mode === "off" ||
              config.tcp.incoming?.mode === "fake"
            }
            helperText={
              config.tcp.incoming?.mode === "fake"
                ? "Not used in fake mode (triggers on every packet)"
                : "Minimum threshold for injection trigger"
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <B4Slider
            label="Threshold Max"
            value={config.tcp.incoming?.max || 14}
            onChange={(value: number) => onChange("tcp.incoming.max", value)}
            min={config.tcp.incoming?.min || 5}
            max={50}
            step={1}
            valueSuffix=" KB"
            disabled={
              config.tcp.incoming?.mode === "off" ||
              config.tcp.incoming?.mode === "fake"
            }
            helperText={
              config.tcp.incoming?.mode === "fake"
                ? "Not used in fake mode"
                : config.tcp.incoming?.min === config.tcp.incoming?.max
                  ? "Fixed threshold (min = max)"
                  : "Threshold randomized between min-max per connection"
            }
          />
        </Grid>
      </Grid>
    </>
  );
};
