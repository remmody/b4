import { useEffect, useState } from "react";
import { Grid, Box, Stack, Typography } from "@mui/material";
import { SecurityIcon } from "@b4.icons";
import { Link } from "react-router-dom";
import {
  B4Section,
  B4Switch,
  B4Select,
  B4Slider,
  B4TextField,
  B4FormHeader,
  B4ChipList,
  B4PlusButton,
  B4Alert,
} from "@b4.elements";
import { useCaptures } from "@b4.capture";

import { B4SetConfig, FakingPayloadType, MutationMode } from "@models/config";

interface FakingSettingsProps {
  config: B4SetConfig;
  onChange: (
    field: string,
    value: string | boolean | number | string[],
  ) => void;
}

const FAKE_STRATEGIES = [
  { value: "ttl", label: "TTL" },
  { value: "randseq", label: "Random Sequence" },
  { value: "pastseq", label: "Past Sequence" },
  { value: "tcp_check", label: "TCP Check" },
  { value: "md5sum", label: "MD5 Sum" },
  { value: "timestamp", label: "TCP Timestamp" },
];

const FAKE_PAYLOAD_TYPES = [
  { value: 0, label: "Random" },
  // { value: 1, label: "Custom" },
  { value: 2, label: "Preset: Google (classic)" },
  { value: 3, label: "Preset: DuckDuckGo" },
  { value: 4, label: "My own Payload File" },
];

const MUTATION_MODES: { value: MutationMode; label: string }[] = [
  { value: "off", label: "Disabled" },
  { value: "random", label: "Random" },
  { value: "grease", label: "GREASE Extensions" },
  { value: "padding", label: "Padding" },
  { value: "fakeext", label: "Fake Extensions" },
  { value: "fakesni", label: "Fake SNIs" },
  { value: "advanced", label: "Advanced (All)" },
];

const mutationModeDescriptions: Record<MutationMode, string> = {
  off: "No ClientHello mutation applied",
  random: "Randomize extension order and add noise",
  grease: "Insert GREASE extensions to confuse DPI",
  padding: "Add padding extension to reach target size",
  fakeext: "Insert fake/unknown TLS extensions",
  fakesni: "Add additional fake SNI entries",
  advanced: "Combine multiple mutation techniques",
};

export const FakingSettings = ({ config, onChange }: FakingSettingsProps) => {
  const [newFakeSni, setNewFakeSni] = useState("");
  const { captures, loadCaptures } = useCaptures();

  useEffect(() => {
    void loadCaptures();
  }, [loadCaptures]);

  const mutation = config.faking.sni_mutation || {
    mode: "off" as MutationMode,
    grease_count: 3,
    padding_size: 2048,
    fake_ext_count: 5,
    fake_snis: [],
  };

  const isMutationEnabled = mutation.mode !== "off";
  const showGreaseSettings = ["grease", "advanced"].includes(mutation.mode);
  const showPaddingSettings = ["padding", "advanced"].includes(mutation.mode);
  const showFakeExtSettings = ["fakeext", "advanced"].includes(mutation.mode);
  const showFakeSniSettings = ["fakesni", "advanced"].includes(mutation.mode);

  const handleAddFakeSni = () => {
    if (newFakeSni.trim()) {
      const current = mutation.fake_snis || [];
      if (!current.includes(newFakeSni.trim())) {
        onChange("faking.sni_mutation.fake_snis", [
          ...current,
          newFakeSni.trim(),
        ]);
      }
      setNewFakeSni("");
    }
  };

  const handleRemoveFakeSni = (sni: string) => {
    const current = mutation.fake_snis || [];
    onChange(
      "faking.sni_mutation.fake_snis",
      current.filter((s) => s !== sni),
    );
  };

  return (
    <>
      <B4Section
        title="Fake SNI Configuration"
        description="Configure fake SNI packets to confuse DPI"
        icon={<SecurityIcon />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <B4Switch
              label="Enable Fake SNI"
              checked={config.faking.sni}
              onChange={(checked: boolean) => onChange("faking.sni", checked)}
              description="Send fake SNI packets before real ClientHello"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <B4Select
              label="Fake Strategy"
              value={config.faking.strategy}
              options={FAKE_STRATEGIES}
              onChange={(e) =>
                onChange("faking.strategy", e.target.value as string)
              }
              helperText="How to make fake packets unprocessable by server"
              disabled={!config.faking.sni}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack>
              <B4Select
                label="Fake Payload Type"
                value={config.faking.sni_type}
                options={FAKE_PAYLOAD_TYPES}
                onChange={(e) =>
                  onChange("faking.sni_type", Number(e.target.value))
                }
                helperText="Content of fake packets"
                disabled={!config.faking.sni}
              />

              {config.faking.sni_type === FakingPayloadType.CUSTOM && (
                <Box sx={{ mt: 2 }}>
                  <B4TextField
                    label="Custom Payload (Hex)"
                    value={config.faking.custom_payload}
                    onChange={(e) =>
                      onChange("faking.custom_payload", e.target.value)
                    }
                    helperText="Hex-encoded payload for fake packets (use Capture feature to get real payloads)"
                    disabled={!config.faking.sni}
                    multiline
                    rows={2}
                  />
                </Box>
              )}
            </Stack>
          </Grid>
          {config.faking.sni_type === FakingPayloadType.CAPTURE && (
            <Grid container size={{ xs: 12 }}>
              {captures.length > 0 && (
                <Grid size={{ xs: 6 }}>
                  <B4Select
                    label="Generated Payload"
                    value={config.faking.payload_file}
                    options={[
                      { value: "", label: "Select a payload..." },
                      ...captures.map((c) => ({
                        value: c.filepath,
                        label: `${c.domain} (${c.size} bytes)`,
                      })),
                    ]}
                    onChange={(e) =>
                      onChange("faking.payload_file", e.target.value as string)
                    }
                    helperText={
                      captures.length === 0
                        ? "No payloads available. Generate one in Settings first."
                        : "Select a generated/uploaded TLS ClientHello (SNI-first)"
                    }
                    disabled={!config.faking.sni || captures.length === 0}
                  />
                </Grid>
              )}
              <Grid size={{ xs: captures.length > 0 ? 6 : 12 }}>
                <B4Alert>
                  {captures.length === 0 &&
                    "No TLS payloads available. Generate optimized payloads (SNI-first for DPI bypass) or upload your own."}

                  <Link to="/settings/capture">
                    {" "}
                    Navigate to Settings to generate or upload TLS ClientHello
                    payloads.
                  </Link>
                </B4Alert>
              </Grid>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 4 }}>
            <B4Slider
              label="Fake TTL"
              value={config.faking.ttl}
              onChange={(value: number) => onChange("faking.ttl", value)}
              min={1}
              max={64}
              step={1}
              helperText="TTL for fake packets (should expire before server)"
              disabled={!config.faking.sni}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <B4TextField
              label="Sequence Offset"
              type="number"
              value={config.faking.seq_offset}
              onChange={(e) =>
                onChange("faking.seq_offset", Number(e.target.value))
              }
              helperText="TCP sequence number offset for pastseq strategy"
              disabled={!config.faking.sni}
            />
          </Grid>
          {config.faking.strategy === "timestamp" && (
            <Grid size={{ xs: 12, md: 4 }}>
              <B4TextField
                label="Timestamp Decrease"
                type="number"
                value={config.faking.timestamp_decrease || 600000}
                onChange={(e) =>
                  onChange("faking.timestamp_decrease", Number(e.target.value))
                }
                helperText="Amount to decrease TCP timestamp option (default: 600000)"
                disabled={!config.faking.sni}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 4 }}>
            <B4Slider
              label="Fake Packet Count"
              value={config.faking.sni_seq_length}
              onChange={(value: number) =>
                onChange("faking.sni_seq_length", value)
              }
              min={1}
              max={20}
              step={1}
              helperText="Number of fake packets to send"
              disabled={!config.faking.sni}
            />
          </Grid>
          {/* TLS Mod Options - only show when payload has TLS structure */}
          {config.faking.sni_type !== FakingPayloadType.RANDOM && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Fake Packet TLS Modification
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Modify fake TLS ClientHello to improve bypass
              </Typography>
              <Stack direction="row" spacing={2}>
                <B4Switch
                  label="Randomize TLS Random"
                  checked={(config.faking.tls_mod || []).includes("rnd")}
                  onChange={(checked: boolean) => {
                    const current = config.faking.tls_mod || [];
                    const next = checked
                      ? [...current.filter((m) => m !== "rnd"), "rnd"]
                      : current.filter((m) => m !== "rnd");
                    onChange("faking.tls_mod", next);
                  }}
                  description="Replace 32-byte Random field in fake packets"
                  disabled={!config.faking.sni}
                />
                <B4Switch
                  label="Duplicate Session ID"
                  checked={(config.faking.tls_mod || []).includes("dupsid")}
                  onChange={(checked: boolean) => {
                    const current = config.faking.tls_mod || [];
                    const next = checked
                      ? [...current.filter((m) => m !== "dupsid"), "dupsid"]
                      : current.filter((m) => m !== "dupsid");
                    onChange("faking.tls_mod", next);
                  }}
                  description="Copy Session ID from real ClientHello into fake"
                  disabled={!config.faking.sni}
                />
              </Stack>
            </Grid>
          )}
        </Grid>
      </B4Section>

      {/* SNI Mutation Section */}
      <B4Section
        title="ClientHello Mutation"
        description="Modify TLS ClientHello structure to evade fingerprinting"
        icon={<SecurityIcon />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <B4Select
              label="Mutation Mode"
              value={mutation.mode}
              options={MUTATION_MODES}
              onChange={(e) =>
                onChange("faking.sni_mutation.mode", e.target.value as string)
              }
              helperText={mutationModeDescriptions[mutation.mode]}
            />
          </Grid>

          {isMutationEnabled && (
            <>
              {showGreaseSettings && (
                <>
                  <B4FormHeader label="GREASE Configuration" />
                  <Grid size={{ xs: 12 }}>
                    <B4Slider
                      label="GREASE Extension Count"
                      value={mutation.grease_count}
                      onChange={(value: number) =>
                        onChange("faking.sni_mutation.grease_count", value)
                      }
                      min={1}
                      max={10}
                      step={1}
                      helperText="Number of GREASE extensions to insert"
                    />
                  </Grid>
                </>
              )}

              {showPaddingSettings && (
                <>
                  <B4FormHeader label="Padding Configuration" />
                  <Grid size={{ xs: 12 }}>
                    <B4Slider
                      label="Padding Size"
                      value={mutation.padding_size}
                      onChange={(value: number) =>
                        onChange("faking.sni_mutation.padding_size", value)
                      }
                      min={256}
                      max={16384}
                      step={256}
                      valueSuffix=" bytes"
                      helperText="Target ClientHello size with padding"
                    />
                  </Grid>
                </>
              )}

              {showFakeExtSettings && (
                <>
                  <B4FormHeader label="Fake Extensions Configuration" />
                  <Grid size={{ xs: 12 }}>
                    <B4Slider
                      label="Fake Extension Count"
                      value={mutation.fake_ext_count}
                      onChange={(value: number) =>
                        onChange("faking.sni_mutation.fake_ext_count", value)
                      }
                      min={1}
                      max={15}
                      step={1}
                      helperText="Number of fake TLS extensions to insert"
                    />
                  </Grid>
                </>
              )}

              {showFakeSniSettings && (
                <>
                  <B4FormHeader label="Fake SNI Configuration" />
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <B4TextField
                        label="Add Fake SNI"
                        value={newFakeSni}
                        onChange={(e) => setNewFakeSni(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddFakeSni();
                          }
                        }}
                        placeholder="e.g., ya.ru, vk.com"
                        helperText="Additional SNI values to inject into ClientHello"
                      />
                      <B4PlusButton
                        onClick={handleAddFakeSni}
                        disabled={!newFakeSni.trim()}
                      />
                    </Box>
                  </Grid>
                  <B4ChipList
                    items={mutation.fake_snis || []}
                    getKey={(s) => s}
                    getLabel={(s) => s}
                    onDelete={handleRemoveFakeSni}
                    title="Active Fake SNIs"
                    gridSize={{ xs: 12, md: 6 }}
                  />
                </>
              )}
            </>
          )}
        </Grid>
      </B4Section>
    </>
  );
};
