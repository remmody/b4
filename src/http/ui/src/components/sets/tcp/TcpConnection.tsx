import { Grid, FormControlLabel, Switch, Typography, Box } from "@mui/material";
import {
  B4SetConfig,
  WindowMode,
} from "@models/config";
import {
  B4Slider,
  B4RangeSlider,
  B4Select,
  B4TextField,
  B4Alert,
  B4FormHeader,
  B4PlusButton,
  B4ChipList,
} from "@b4.elements";
import { useState } from "react";

interface TcpConnectionProps {
  config: B4SetConfig;
  main: B4SetConfig;
  onChange: (
    field: string,
    value: string | number | boolean | number[],
  ) => void;
}

const windowModeOptions: { label: string; value: WindowMode }[] = [
  { label: "Disabled", value: "off" },
  { label: "Zero Window", value: "zero" },
  { label: "Random Window", value: "random" },
  { label: "Oscillate", value: "oscillate" },
  { label: "Escalate", value: "escalate" },
];

const windowModeDescriptions: Record<WindowMode, string> = {
  off: "No window manipulation - use actual TCP window",
  zero: "Send fake packets: first with window=0, then window=65535",
  random: "Send 3-5 fake packets with random window sizes from your list",
  oscillate: "Cycle through your custom window values sequentially",
  escalate: "Gradually increase: 0 → 100 → 500 → 1460 → 8192 → 32768 → 65535",
};

export const TcpConnection = ({ config, main, onChange }: TcpConnectionProps) => {
  const [newWinValue, setNewWinValue] = useState("");

  const winValues = config.tcp.win.values || [0, 1460, 8192, 65535];
  const showWinValues = ["oscillate", "random"].includes(config.tcp.win.mode);

  const handleAddWinValue = () => {
    const val = Number.parseInt(newWinValue, 10);
    if (
      !Number.isNaN(val) &&
      val >= 0 &&
      val <= 65535 &&
      !winValues.includes(val)
    ) {
      onChange(
        "tcp.win.values",
        [...winValues, val].sort((a, b) => a - b),
      );
      setNewWinValue("");
    }
  };

  const handleRemoveWinValue = (val: number) => {
    onChange(
      "tcp.win.values",
      winValues.filter((v) => v !== val),
    );
  };

  const dup = config.tcp.duplicate ?? { enabled: false, count: 3 };

  return (
    <>
      {/* Basic TCP Settings */}
      <B4FormHeader label="Basic TCP Settings" />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Slider
            label="Connection Bytes Limit"
            value={config.tcp.conn_bytes_limit}
            onChange={(value: number) =>
              onChange("tcp.conn_bytes_limit", value)
            }
            min={1}
            max={main.id === config.id ? 100 : main.tcp.conn_bytes_limit}
            step={1}
            helperText={
              main.id === config.id
                ? "Main set limit (changing requires service restart to take effect)"
                : `Max: ${main.tcp.conn_bytes_limit} (limited by main set)`
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4RangeSlider
            label="Segment 2 Delay"
            value={[
              config.tcp.seg2delay,
              config.tcp.seg2delay_max || config.tcp.seg2delay,
            ]}
            onChange={(value: [number, number]) => {
              onChange("tcp.seg2delay", value[0]);
              onChange("tcp.seg2delay_max", value[1]);
            }}
            min={0}
            max={1000}
            step={10}
            valueSuffix=" ms"
            helperText="Delay between TCP segments. Use a range for random delay per packet."
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.tcp.drop_sack || false}
                onChange={(e) => onChange("tcp.drop_sack", e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Drop SACK Options
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Strip Selective Acknowledgment from TCP headers to confuse
                  stateful DPI
                </Typography>
              </Box>
            }
          />
        </Grid>
      </Grid>

      {/* Packet Duplication */}
      <B4FormHeader label="Packet Duplication" />
      <Grid container spacing={3}>
        <B4Alert>
          Some ISPs throttle by randomly dropping outgoing packets to specific
          IP ranges (e.g. Telegram subnets). Duplication sends multiple copies
          of each packet. When enabled, all other DPI evasion is bypassed for
          this set. Only applies to TCP port 443.
        </B4Alert>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControlLabel
            control={
              <Switch
                checked={dup.enabled}
                onChange={(e) =>
                  onChange("tcp.duplicate.enabled", e.target.checked)
                }
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Enable Packet Duplication
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Drop original packet and send multiple copies via raw socket
                </Typography>
              </Box>
            }
          />
        </Grid>
        {dup.enabled && (
          <Grid size={{ xs: 12, md: 6 }}>
            <B4Slider
              label="Copy Count"
              value={dup.count}
              onChange={(value: number) => onChange("tcp.duplicate.count", value)}
              min={1}
              max={10}
              step={1}
              helperText="Number of packet copies to send (original is dropped)"
            />
          </Grid>
        )}
      </Grid>

      {/* TCP Window Configuration */}
      <B4FormHeader label="TCP Window Manipulation" />
      <Grid container spacing={3}>
        <B4Alert>
          Window manipulation sends fake ACK packets with modified TCP window
          sizes before your real packet. These fakes use low TTL so they expire
          before reaching the server but confuse middlebox DPI.
        </B4Alert>

        <Grid size={{ xs: 12, md: 6 }}>
          <B4Select
            label="Window Mode"
            value={config.tcp.win.mode}
            options={windowModeOptions}
            onChange={(e) => onChange("tcp.win.mode", e.target.value as string)}
            helperText={windowModeDescriptions[config.tcp.win.mode]}
          />
        </Grid>

        {showWinValues && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>
              Custom Window Values
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {config.tcp.win.mode === "oscillate"
                ? "Packets will cycle through these values in order"
                : "Random values will be picked from this list"}
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    mt: 1,
                    alignItems: "center",
                  }}
                >
                  <B4TextField
                    label="Add Value (0-65535)"
                    value={newWinValue}
                    onChange={(e) => setNewWinValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddWinValue();
                      }
                    }}
                    type="number"
                  />

                  <B4PlusButton
                    onClick={handleAddWinValue}
                    disabled={!newWinValue}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <B4ChipList
                  items={winValues}
                  getKey={(v) => v}
                  getLabel={(v) => v.toLocaleString()}
                  onDelete={handleRemoveWinValue}
                  emptyMessage="No values configured - defaults will be used"
                  showEmpty
                />
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
    </>
  );
};
