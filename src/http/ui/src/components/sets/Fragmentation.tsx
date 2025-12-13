import { Grid, Alert, Divider, Chip, Typography, Box } from "@mui/material";
import { CallSplit as CallSplitIcon } from "@mui/icons-material";
import { B4Section, B4Switch, B4Select, B4Slider } from "@b4.elements";
import { B4SetConfig, FragmentationStrategy } from "@models/Config";
import { ComboSettings } from "./frags/Combo";
import { DisorderSettings } from "./frags/Disorder";
import { OverlapSettings } from "./frags/Overlap";
import { ExtSplitSettings } from "./frags/ExtSplit";
import { FirstByteSettings } from "./frags/FirstByte";
import { TcpIpSettings } from "./frags/TcpIp";

interface FragmentationSettingsProps {
  config: B4SetConfig;
  onChange: (
    field: string,
    value: string | boolean | number | string[]
  ) => void;
}

const fragmentationOptions: { label: string; value: FragmentationStrategy }[] =
  [
    { label: "Combo", value: "combo" },
    { label: "Hybrid", value: "hybrid" },
    { label: "Disorder", value: "disorder" },
    { label: "Overlap", value: "overlap" },
    { label: "Extension Split", value: "extsplit" },
    { label: "First-Byte Desync", value: "firstbyte" },
    { label: "TCP Segmentation", value: "tcp" },
    { label: "IP Fragmentation", value: "ip" },
    { label: "TLS Record Splitting", value: "tls" },
    { label: "OOB (Out-of-Band)", value: "oob" },
    { label: "Disabled", value: "none" },
  ];

export const FragmentationSettings = ({
  config,
  onChange,
}: FragmentationSettingsProps) => {
  const strategy = config.fragmentation.strategy;
  const isTcpOrIp = strategy === "tcp" || strategy === "ip";
  const isOob = strategy === "oob";
  const isTls = strategy === "tls";
  const isActive = strategy !== "none";

  return (
    <B4Section
      title="Fragmentation Strategy"
      description="Split packets to evade DPI pattern matching"
      icon={<CallSplitIcon />}
    >
      <Grid container spacing={3}>
        {/* Strategy Selection */}
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Select
            label="Method"
            value={strategy}
            options={fragmentationOptions}
            onChange={(e) =>
              onChange("fragmentation.strategy", e.target.value as string)
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <B4Switch
            label="Reverse Fragment Order"
            checked={config.fragmentation.reverse_order}
            onChange={(checked: boolean) =>
              onChange("fragmentation.reverse_order", checked)
            }
            description="Send second fragment first"
          />
        </Grid>

        {/* TCP/IP: Simplified SNI Split */}
        {isTcpOrIp && <TcpIpSettings config={config} onChange={onChange} />}

        {/* Combo Settings */}
        {strategy === "combo" && (
          <ComboSettings config={config} onChange={onChange} />
        )}

        {/* Disorder Settings */}
        {strategy === "disorder" && (
          <DisorderSettings config={config} onChange={onChange} />
        )}

        {/* Overlap Settings */}
        {strategy === "overlap" && (
          <OverlapSettings config={config} onChange={onChange} />
        )}

        {/* ExtSplit Settings */}
        {strategy === "extsplit" && <ExtSplitSettings />}

        {/* FirstByte Settings */}
        {strategy === "firstbyte" && <FirstByteSettings config={config} />}

        {/* OOB Settings */}
        {isOob && (
          <>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }}>
                <Chip label="OOB Configuration" size="small" />
              </Divider>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                Inserts a byte with TCP URG flag. Server ignores it, but
                stateful DPI gets confused.
              </Alert>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Insert Position"
                value={config.fragmentation.oob_position || 1}
                onChange={(value: number) =>
                  onChange("fragmentation.oob_position", value)
                }
                min={1}
                max={50}
                step={1}
                helperText="Bytes before OOB insertion"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  OOB Byte:{" "}
                  <code>
                    {String.fromCharCode(config.fragmentation.oob_char || 120)}
                  </code>{" "}
                  (0x
                  {(config.fragmentation.oob_char || 120)
                    .toString(16)
                    .padStart(2, "0")}
                  )
                </Typography>
              </Box>
            </Grid>
          </>
        )}

        {/* TLS Record Settings */}
        {isTls && (
          <>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }}>
                <Chip label="TLS Record Configuration" size="small" />
              </Divider>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                Splits ClientHello into multiple TLS records. DPI expecting
                single-record handshake fails to match.
              </Alert>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Record Split Position"
                value={config.fragmentation.tlsrec_pos || 1}
                onChange={(value: number) =>
                  onChange("fragmentation.tlsrec_pos", value)
                }
                min={1}
                max={100}
                step={1}
                helperText="First TLS record size in bytes"
              />
            </Grid>
          </>
        )}

        {/* Disabled state */}
        {!isActive && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="warning">
              Fragmentation disabled. Only fake packets (if enabled) will be
              used for bypass.
            </Alert>
          </Grid>
        )}
      </Grid>
    </B4Section>
  );
};
