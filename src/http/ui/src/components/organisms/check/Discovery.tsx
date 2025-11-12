import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Divider,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Snackbar,
  Alert as MuiAlert,
  CircularProgress,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { colors } from "@design";
import { useConfigLoad } from "@hooks/useConfig";
import { B4SetConfig } from "@/models/Config";

interface DomainPresetResult {
  preset_name: string;
  status: "complete" | "failed";
  duration: number;
  speed: number;
  bytes_read: number;
  error?: string;
  status_code: number;
  set?: B4SetConfig;
}

interface DomainDiscoveryResult {
  domain: string;
  best_preset: string;
  best_speed: number;
  best_success: boolean;
  results: Record<string, DomainPresetResult>;
}

interface DiscoverySuite {
  id: string;
  status: "pending" | "running" | "complete" | "failed" | "canceled";
  start_time: string;
  end_time: string;
  total_checks: number;
  completed_checks: number;
  domain_discovery_results?: Record<string, DomainDiscoveryResult>;
}

interface ConfigDetail {
  category: string;
  settings: Array<{ label: string; value: string }>;
}

export const DiscoveryRunner: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [suite, setSuite] = useState<DiscoverySuite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const { config } = useConfigLoad();

  // Poll for discovery status
  useEffect(() => {
    if (!suiteId || !running) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/check/status?id=${suiteId}`);
        if (!response.ok) throw new Error("Failed to fetch discovery status");

        const data = (await response.json()) as DiscoverySuite;
        setSuite(data);

        if (["complete", "failed", "canceled"].includes(data.status)) {
          setRunning(false);
        }
      } catch (err) {
        console.error("Failed to fetch discovery status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setRunning(false);
      }
    };

    const interval = setInterval(() => {
      void fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [suiteId, running]);

  const startDiscovery = async () => {
    setError(null);
    setRunning(true);
    setSuite(null);

    try {
      const timeout = (config?.system.checker.timeout || 15) * 1e9;
      const maxConcurrent = config?.system.checker.max_concurrent || 3;

      const response = await fetch("/api/check/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeout: timeout,
          max_concurrent: maxConcurrent,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to start discovery");
      }

      const data = (await response.json()) as { id: string; message: string };
      setSuiteId(data.id);
    } catch (err) {
      console.error("Failed to start discovery:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start discovery"
      );
      setRunning(false);
    }
  };

  const cancelDiscovery = async () => {
    if (!suiteId) return;

    try {
      await fetch(`/api/check/cancel?id=${suiteId}`, { method: "DELETE" });
      setRunning(false);
    } catch (err) {
      console.error("Failed to cancel discovery:", err);
    }
  };

  const resetDiscovery = () => {
    setSuiteId(null);
    setSuite(null);
    setError(null);
    setRunning(false);
  };

  const handleAddStrategy = async (
    domain: string,
    result: DomainPresetResult
  ) => {
    if (!result.set) {
      setSnackbar({
        open: true,
        message: "Configuration data not available",
        severity: "error",
      });
      return;
    }

    setAddingPreset(`${domain}-${result.preset_name}`);

    try {
      const configToAdd = {
        ...result.set,
        targets: {
          ...result.set.targets,
          sni_domains: [domain],
        },
      };

      const response = await fetch("/api/check/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToAdd),
      });

      if (!response.ok) {
        throw new Error("Failed to add configuration");
      }

      const data = (await response.json()) as { message: string };

      setSnackbar({
        open: true,
        message: `✅ ${data.message}`,
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to add strategy:", err);
      setSnackbar({
        open: true,
        message: "Failed to add configuration",
        severity: "error",
      });
    } finally {
      setAddingPreset(null);
    }
  };

  const progress = suite
    ? (suite.completed_checks / suite.total_checks) * 100
    : 0;

  function formatConfigDetails(presetName: string): ConfigDetail[] {
    const details: ConfigDetail[] = [];

    // TCP
    details.push({
      category: "TCP Configuration",
      settings: [
        { label: "Connection Bytes", value: "19 bytes" },
        {
          label: "Segment Delay",
          value: presetName.includes("delay") ? "5-10ms" : "0ms",
        },
      ],
    });

    // Fragmentation
    if (presetName.includes("tcp-frag")) {
      const position = presetName.includes("pos1")
        ? "1"
        : presetName.includes("pos2")
        ? "2"
        : "Variable";
      details.push({
        category: "Fragmentation",
        settings: [
          { label: "Strategy", value: "TCP" },
          { label: "SNI Position", value: position },
          {
            label: "Reverse Order",
            value: presetName.includes("reverse") ? "Yes" : "No",
          },
          {
            label: "Middle SNI",
            value: presetName.includes("middle") ? "Yes" : "No",
          },
        ],
      });
    } else if (presetName.includes("ip-frag")) {
      details.push({
        category: "Fragmentation",
        settings: [
          { label: "Strategy", value: "IP-level" },
          { label: "SNI Position", value: "1" },
          {
            label: "Reverse Order",
            value: presetName.includes("reverse") ? "Yes" : "No",
          },
        ],
      });
    } else if (presetName.includes("no-frag")) {
      details.push({
        category: "Fragmentation",
        settings: [{ label: "Strategy", value: "None" }],
      });
    }

    // Faking
    if (presetName.includes("no-fake")) {
      details.push({
        category: "Fake Packets",
        settings: [{ label: "Status", value: "Disabled" }],
      });
    } else if (presetName.includes("fake")) {
      const ttl = presetName.includes("ttl-low") ? "3" : "5-8";
      const strategy = presetName.includes("randseq")
        ? "Random Seq"
        : presetName.includes("md5sum")
        ? "MD5"
        : "Past Seq";
      const count = presetName.includes("multi")
        ? "5"
        : presetName.includes("aggressive")
        ? "3-5"
        : "1-2";

      details.push({
        category: "Fake Packets",
        settings: [
          { label: "TTL", value: ttl },
          { label: "Strategy", value: strategy },
          { label: "Count", value: count },
        ],
      });
    } else {
      details.push({
        category: "Fake Packets",
        settings: [
          { label: "TTL", value: "8" },
          { label: "Strategy", value: "Past Seq" },
          { label: "Count", value: "1" },
        ],
      });
    }

    // UDP/QUIC
    if (presetName.includes("quic-drop")) {
      details.push({
        category: "UDP/QUIC",
        settings: [
          { label: "Mode", value: "Drop" },
          { label: "QUIC Filter", value: "All" },
        ],
      });
    } else if (presetName.includes("quic-fake")) {
      details.push({
        category: "UDP/QUIC",
        settings: [
          { label: "Mode", value: "Fake & Frag" },
          { label: "Fake Count", value: "10" },
          { label: "Fake Size", value: "128 bytes" },
        ],
      });
    } else {
      details.push({
        category: "UDP/QUIC",
        settings: [
          { label: "Mode", value: "Fake & Frag" },
          { label: "Fake Count", value: "6" },
          { label: "QUIC Filter", value: "Disabled" },
        ],
      });
    }

    return details;
  }

  return (
    <Stack spacing={3}>
      {/* Control Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: colors.background.paper,
          border: `1px solid ${colors.border.default}`,
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={{ color: colors.text.primary }}>
              Configuration Discovery
            </Typography>
            <Stack direction="row" spacing={1}>
              {!running && !suite && (
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={() => {
                    void startDiscovery();
                  }}
                  sx={{
                    bgcolor: colors.secondary,
                    "&:hover": { bgcolor: colors.primary },
                  }}
                >
                  Start Discovery
                </Button>
              )}
              {running && (
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={() => {
                    void cancelDiscovery();
                  }}
                  sx={{
                    borderColor: colors.quaternary,
                    color: colors.quaternary,
                  }}
                >
                  Cancel
                </Button>
              )}
              {suite && !running && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={resetDiscovery}
                  sx={{
                    borderColor: colors.secondary,
                    color: colors.secondary,
                  }}
                >
                  New Discovery
                </Button>
              )}
            </Stack>
          </Box>

          <Alert severity="warning" sx={{ bgcolor: colors.accent.tertiary }}>
            <strong>Warning:</strong> Discovery mode will temporarily apply
            different configurations to test effectiveness. This may briefly
            affect your service traffic during testing.
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}

          {running && suite && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Testing configurations: {suite.completed_checks} of{" "}
                  {suite.total_checks} checks completed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progress.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: colors.background.dark,
                  "& .MuiLinearProgress-bar": {
                    bgcolor: colors.secondary,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Results Table */}
      {suite?.domain_discovery_results &&
        Object.keys(suite.domain_discovery_results).length > 0 && (
          <Stack spacing={2}>
            {Object.values(suite.domain_discovery_results)
              .sort((a, b) => b.best_speed - a.best_speed)
              .map((domainResult) => {
                const configDetails = domainResult.best_success
                  ? formatConfigDetails(domainResult.best_preset)
                  : [];

                return (
                  <Paper
                    key={domainResult.domain}
                    elevation={0}
                    sx={{
                      bgcolor: colors.background.paper,
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    {/* Domain Header */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: colors.accent.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ color: colors.text.primary }}
                        >
                          {domainResult.domain}
                        </Typography>
                        {domainResult.best_success ? (
                          <Chip
                            label="Success"
                            size="small"
                            sx={{
                              bgcolor: colors.secondary,
                              color: colors.background.default,
                            }}
                          />
                        ) : (
                          <Chip
                            label="Failed"
                            size="small"
                            sx={{
                              bgcolor: colors.quaternary,
                              color: colors.text.primary,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ color: colors.secondary, fontWeight: 600 }}
                      >
                        {domainResult.best_success
                          ? `${(domainResult.best_speed / 1024 / 1024).toFixed(
                              2
                            )} MB/s`
                          : "No successful config"}
                      </Typography>
                    </Box>

                    {/* Configuration Details */}
                    {domainResult.best_success && (
                      <Box sx={{ p: 3 }}>
                        <Box
                          sx={{
                            mb: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: colors.text.secondary,
                                textTransform: "uppercase",
                                fontSize: "0.7rem",
                              }}
                            >
                              Best Configuration
                            </Typography>
                            <Chip
                              icon={<SpeedIcon />}
                              label={`${domainResult.best_preset} • ${(
                                domainResult.best_speed /
                                1024 /
                                1024
                              ).toFixed(2)} MB/s`}
                              sx={{
                                bgcolor: colors.accent.secondary,
                                color: colors.secondary,
                                fontWeight: 600,
                                "& .MuiChip-icon": {
                                  color: colors.secondary,
                                },
                              }}
                            />
                          </Box>

                          <Button
                            variant="contained"
                            startIcon={
                              addingPreset ===
                              `${domainResult.domain}-${domainResult.best_preset}` ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <AddIcon />
                              )
                            }
                            onClick={() => {
                              const bestResult =
                                domainResult.results[domainResult.best_preset];
                              void handleAddStrategy(
                                domainResult.domain,
                                bestResult
                              );
                            }}
                            disabled={
                              addingPreset ===
                              `${domainResult.domain}-${domainResult.best_preset}`
                            }
                            sx={{
                              bgcolor: colors.secondary,
                              color: colors.background.default,
                              fontWeight: 600,
                              "&:hover": {
                                bgcolor: colors.primary,
                                transform: "translateY(-2px)",
                                boxShadow: `0 4px 8px ${colors.secondary}44`,
                              },
                              transition: "all 0.2s",
                              "&:disabled": {
                                bgcolor: colors.accent.secondary,
                              },
                            }}
                          >
                            {addingPreset ===
                            `${domainResult.domain}-${domainResult.best_preset}`
                              ? "Adding..."
                              : "Use This Strategy"}
                          </Button>
                        </Box>

                        <Divider
                          sx={{ my: 2, borderColor: colors.border.default }}
                        />

                        <Grid container spacing={2}>
                          {configDetails.map((detail, idx) => (
                            <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: colors.background.dark,
                                  borderRadius: 1,
                                  border: `1px solid ${colors.border.light}`,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    color: colors.secondary,
                                    fontWeight: 600,
                                    mb: 1.5,
                                    textTransform: "uppercase",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  {detail.category}
                                </Typography>
                                <Stack spacing={1}>
                                  {detail.settings.map((setting, i) => (
                                    <Box key={i}>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: colors.text.secondary,
                                          display: "block",
                                          fontSize: "0.7rem",
                                        }}
                                      >
                                        {setting.label}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: colors.text.primary,
                                          fontWeight: 500,
                                        }}
                                      >
                                        {setting.value}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>

                        {/* All Tested Configs */}
                        <Box sx={{ mt: 3 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: colors.text.secondary,
                              mb: 1,
                              textTransform: "uppercase",
                              fontSize: "0.7rem",
                            }}
                          >
                            All Tested Configurations
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            gap={1}
                          >
                            {Object.values(domainResult.results)
                              .sort((a, b) => b.speed - a.speed)
                              .map((result) => (
                                <Box
                                  key={result.preset_name}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Chip
                                    label={`${result.preset_name}: ${
                                      result.status === "complete"
                                        ? `${(
                                            result.speed /
                                            1024 /
                                            1024
                                          ).toFixed(2)} MB/s`
                                        : "Failed"
                                    }`}
                                    size="small"
                                    sx={{
                                      bgcolor:
                                        result.preset_name ===
                                        domainResult.best_preset
                                          ? colors.accent.secondary
                                          : colors.background.dark,
                                      color:
                                        result.status === "complete"
                                          ? colors.text.primary
                                          : colors.quaternary,
                                      border:
                                        result.preset_name ===
                                        domainResult.best_preset
                                          ? `2px solid ${colors.secondary}`
                                          : `1px solid ${colors.border.light}`,
                                    }}
                                  />
                                  {result.status === "complete" &&
                                    result.preset_name !==
                                      domainResult.best_preset && (
                                      <Tooltip title="Use this configuration">
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            void handleAddStrategy(
                                              domainResult.domain,
                                              result
                                            );
                                          }}
                                          disabled={
                                            addingPreset ===
                                            `${domainResult.domain}-${result.preset_name}`
                                          }
                                          sx={{
                                            p: 0.5,
                                            bgcolor: colors.background.dark,
                                            border: `1px solid ${colors.border.light}`,
                                            "&:hover": {
                                              bgcolor: colors.accent.secondary,
                                              borderColor: colors.secondary,
                                            },
                                          }}
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                </Box>
                              ))}
                          </Stack>
                        </Box>
                      </Box>
                    )}

                    {/* Failed state */}
                    {!domainResult.best_success && (
                      <Box sx={{ p: 3 }}>
                        <Alert severity="error">
                          All {Object.keys(domainResult.results).length} tested
                          configurations failed for this domain. Check your
                          network connection and domain accessibility.
                        </Alert>
                      </Box>
                    )}
                  </Paper>
                );
              })}
          </Stack>
        )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            bgcolor:
              snackbar.severity === "success"
                ? colors.secondary
                : colors.quaternary,
            color: colors.background.default,
          }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Stack>
  );
};
