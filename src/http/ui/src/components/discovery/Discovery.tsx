import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  LinearProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Collapse,
} from "@mui/material";
import {
  StartIcon,
  StopIcon,
  RefreshIcon,
  AddIcon,
  SpeedIcon,
  ExpandIcon,
  CollapseIcon,
  ImprovementIcon,
  DiscoveryIcon,
  FingerprintIcon,
  SecurityIcon,
} from "@b4.icons";
import { colors } from "@design";
import { B4SetConfig } from "@models/config";
import { DiscoveryAddDialog } from "./AddDialog";
import { B4Alert, B4Badge, B4Section, B4TextField } from "@b4.elements";
import { useSnackbar } from "@context/SnackbarProvider";
import {
  useDiscovery,
  StrategyFamily,
  DiscoveryPhase,
  DomainPresetResult,
  DPIFingerprint,
  DPIType,
  BlockingMethod,
} from "@b4.discovery";
import { useSets } from "@hooks/useSets";

// Friendly names for strategy families
const familyNames: Record<StrategyFamily, string> = {
  none: "Baseline",
  tcp_frag: "TCP Fragmentation",
  tls_record: "TLS Record Split",
  oob: "Out-of-Band",
  ip_frag: "IP Fragmentation",
  fake_sni: "Fake SNI",
  sack: "SACK Drop",
  syn_fake: "SYN Fake",
  desync: "Desync",
  delay: "Delay",
  disorder: "Disorder",
  overlap: "Overlap",
  extsplit: "Extension Split",
  firstbyte: "First-Byte",
  combo: "Combo",
  hybrid: "Hybrid",
  window: "Window Manipulation",
  mutation: "Mutation",
};

// Friendly names for phases
const phaseNames: Record<DiscoveryPhase, string> = {
  fingerprint: "DPI Fingerprinting",
  baseline: "Baseline Test",
  strategy_detection: "Strategy Detection",
  optimization: "Optimization",
  combination: "Combination Test",
  dns_detection: "DNS Detection",
};

export const DiscoveryRunner = () => {
  const {
    startDiscovery,
    cancelDiscovery,
    resetDiscovery,
    addPresetAsSet,
    discoveryRunning: running,
    suiteId,
    suite,
    error,
  } = useDiscovery();
  const { showSuccess, showError } = useSnackbar();

  const { addDomainToSet } = useSets();

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );

  const [checkUrl, setCheckUrl] = useState("");
  const [addingPreset, setAddingPreset] = useState(false);
  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    domain: string;
    presetName: string;
    setConfig: B4SetConfig | null;
  }>({ open: false, domain: "", presetName: "", setConfig: null });
  const domainInputRef = useRef<HTMLInputElement | null>(null);

  const progress = suite
    ? (suite.completed_checks / suite.total_checks) * 100
    : 0;
  const isReconnecting = suiteId && running && !suite;

  const handleAddStrategy = (domain: string, result: DomainPresetResult) => {
    setAddDialog({
      open: true,
      domain,
      presetName: result.preset_name,
      setConfig: result.set || null,
    });
  };
  const toggleDomainExpand = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleDomainKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      if (!checkUrl.trim()) return;
      e.preventDefault();
      void startDiscovery(checkUrl);
    },
    [checkUrl, startDiscovery]
  );

  const handleAddNew = async (name: string, domain: string) => {
    if (!addDialog.setConfig) return;
    setAddingPreset(true);
    const configToAdd = {
      ...addDialog.setConfig,
      name,
      targets: { ...addDialog.setConfig.targets, sni_domains: [domain] },
    };
    const res = await addPresetAsSet(configToAdd);
    if (res.success) {
      showSuccess(`Created set "${name}"`);
      setAddDialog({
        open: false,
        domain: "",
        presetName: "",
        setConfig: null,
      });
    } else {
      showError("Failed to create set");
    }
    setAddingPreset(false);
  };

  const handleAddToExisting = async (setId: string, domain: string) => {
    setAddingPreset(true);
    const res = await addDomainToSet(setId, domain);
    if (res.success) {
      showSuccess(`Added domain to set`);
      setAddDialog({
        open: false,
        domain: "",
        presetName: "",
        setConfig: null,
      });
    } else {
      showError("Failed to add domain to set");
    }
    setAddingPreset(false);
  };

  const handleReset = useCallback(() => {
    resetDiscovery();
    setExpandedDomains(new Set());
  }, [resetDiscovery]);

  // Group results by phase for display
  const groupResultsByPhase = (results: Record<string, DomainPresetResult>) => {
    const grouped: Record<DiscoveryPhase, DomainPresetResult[]> = {
      baseline: [],
      strategy_detection: [],
      optimization: [],
      combination: [],
      fingerprint: [],
      dns_detection: [],
    };

    Object.values(results).forEach((result) => {
      const phase = result.phase || "strategy_detection";
      grouped[phase].push(result);
    });

    return grouped;
  };

  const FingerprintDisplay = ({
    fingerprint,
  }: {
    fingerprint: DPIFingerprint;
  }) => {
    const dpiTypeLabels: Record<DPIType, string> = {
      unknown: "Unknown DPI",
      tspu: "TSPU (Russia)",
      sandvine: "Sandvine",
      huawei: "Huawei",
      allot: "Allot",
      fortigate: "FortiGate",
      none: "No DPI Detected",
    };

    const blockingLabels: Record<BlockingMethod, string> = {
      rst_inject: "RST Injection",
      timeout: "Silent Drop",
      redirect: "HTTP Redirect",
      content_inject: "Content Injection",
      tls_alert: "TLS Alert",
      none: "None",
    };

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: colors.accent.primary,
          border: `1px solid ${colors.border.default}`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FingerprintIcon sx={{ color: colors.secondary }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            DPI Fingerprint
          </Typography>
          <B4Badge
            label={`${fingerprint.confidence}% confidence`}
            size="small"
          />
        </Box>

        {/* Main Info Row */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <B4Badge
            icon={<SecurityIcon />}
            label={dpiTypeLabels[fingerprint.type]}
            color="primary"
          />
          <B4Badge
            label={`Method: ${blockingLabels[fingerprint.blocking_method]}`}
            color="primary"
          />
          {fingerprint.dpi_hop_count > 0 && (
            <B4Badge
              label={`${fingerprint.dpi_hop_count} hops away`}
              variant="outlined"
            />
          )}
          {fingerprint.is_inline && (
            <B4Badge label="Inline DPI" color="error" />
          )}
          {fingerprint.optimal_ttl > 0 && (
            <B4Badge
              label={`Optimal TTL: ${fingerprint.optimal_ttl}`}
              color="primary"
            />
          )}
        </Stack>

        {/* Vulnerabilities */}
        <Typography
          variant="caption"
          sx={{ color: colors.text.secondary, display: "block", mb: 1 }}
        >
          Vulnerabilities Detected:
        </Typography>
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          gap={0.5}
          sx={{ mb: 2 }}
        >
          <B4Badge
            label="TTL"
            color={fingerprint.vulnerable_to_ttl ? "secondary" : "primary"}
            variant={fingerprint.vulnerable_to_ttl ? "filled" : "outlined"}
          />
          <B4Badge
            label="Fragmentation"
            color={fingerprint.vulnerable_to_frag ? "secondary" : "primary"}
            variant={fingerprint.vulnerable_to_frag ? "filled" : "outlined"}
          />
          <B4Badge
            label="Desync"
            color={fingerprint.vulnerable_to_desync ? "secondary" : "primary"}
            variant={fingerprint.vulnerable_to_desync ? "filled" : "outlined"}
          />
          <B4Badge
            label="OOB"
            color={fingerprint.vulnerable_to_oob ? "secondary" : "primary"}
            variant={fingerprint.vulnerable_to_oob ? "filled" : "outlined"}
          />
        </Stack>

        {/* Recommended Strategies */}
        {fingerprint.recommended_families &&
          fingerprint.recommended_families.length > 0 && (
            <>
              <Typography
                variant="caption"
                sx={{ color: colors.text.secondary, display: "block", mb: 1 }}
              >
                Recommended Strategies (priority order):
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                {fingerprint.recommended_families.map((family, idx) => (
                  <B4Badge
                    key={family}
                    label={`${idx + 1}. ${familyNames[family] || family}`}
                    color="secondary"
                    variant={idx === 0 ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
            </>
          )}
      </Paper>
    );
  };

  return (
    <Stack spacing={3}>
      {/* Control Panel */}
      <B4Section
        title="Configuration Discovery"
        description="Hierarchical testing: Strategy Detection → Optimization → Combination"
        icon={<DiscoveryIcon />}
      >
        <B4Alert icon={<DiscoveryIcon />}>
          <strong>Configuration Discovery:</strong> Automatically test multiple
          configuration presets to find the most effective DPI bypass settings
          for the domains you specify below. B4 will temporarily apply different
          configurations and measure their performance.
        </B4Alert>
        {/* Header with actions */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <B4TextField
            label="Domain or URL to test"
            value={checkUrl}
            onChange={(e) => setCheckUrl(e.target.value)}
            onKeyDown={handleDomainKeyDown}
            inputRef={domainInputRef}
            placeholder="youtube.com or https://youtube.com/some/path"
            disabled={running || !!isReconnecting}
            helperText="Enter a domain or full URL to discover optimal bypass configuration"
          />
          {!running && !suite && (
            <Button
              startIcon={<StartIcon />}
              variant="contained"
              onClick={() => {
                void startDiscovery(checkUrl);
              }}
              disabled={!checkUrl.trim()}
              sx={{
                whiteSpace: "nowrap",
              }}
            >
              Start Discovery
            </Button>
          )}
          {(running || isReconnecting) && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<StopIcon />}
              onClick={() => {
                void cancelDiscovery();
              }}
              sx={{
                whiteSpace: "nowrap",
              }}
            >
              Cancel
            </Button>
          )}
          {suite && !running && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              sx={{
                whiteSpace: "nowrap",
              }}
            >
              New Discovery
            </Button>
          )}
        </Box>
        {error && <B4Alert severity="error">{error}</B4Alert>}

        {isReconnecting && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} sx={{ color: colors.secondary }} />
            <Typography variant="body2" sx={{ color: colors.text.secondary }}>
              Reconnecting to running discovery...
            </Typography>
          </Box>
        )}
        {/* Progress indicator */}
        {running && suite && (
          <Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {suite.current_phase && (
                    <B4Badge
                      icon={
                        suite.current_phase === "fingerprint" ? (
                          <FingerprintIcon />
                        ) : undefined
                      }
                      label={phaseNames[suite.current_phase]}
                      size="small"
                      color={
                        suite.current_phase === "fingerprint"
                          ? "primary"
                          : "secondary"
                      }
                      sx={{ mr: 2 }}
                    />
                  )}
                  {suite.current_phase === "fingerprint"
                    ? "Analyzing DPI system..."
                    : suite.current_phase === "dns_detection"
                    ? "Checking DNS..."
                    : `${suite.completed_checks} of ${suite.total_checks} checks`}
                </Typography>
              </Box>
              {suite.current_phase !== "fingerprint" &&
                suite.current_phase !== "dns_detection" && (
                  <Typography variant="body2" color="text.secondary">
                    {isNaN(progress) ? "0" : progress.toFixed(0)}%
                  </Typography>
                )}
            </Box>
            <LinearProgress
              variant={
                suite.current_phase === "fingerprint" ||
                suite.current_phase === "dns_detection"
                  ? "indeterminate"
                  : "determinate"
              }
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
      </B4Section>

      {/* Results */}
      {/* Fingerprint Results - Show as soon as available */}
      {suite?.fingerprint && suite.fingerprint.type !== "none" && (
        <FingerprintDisplay fingerprint={suite.fingerprint} />
      )}

      {/* No DPI Alert */}
      {suite?.fingerprint && suite.fingerprint.type === "none" && (
        <B4Alert
          severity="success"
          icon={<FingerprintIcon />}
          sx={{ bgcolor: colors.accent.secondary }}
        >
          <strong>No DPI Detected!</strong> The domain appears to be accessible
          without any bypass techniques.
        </B4Alert>
      )}

      {suite?.domain_discovery_results &&
        Object.keys(suite.domain_discovery_results).length > 0 && (
          <Stack spacing={2}>
            {Object.values(suite.domain_discovery_results)
              .sort((a, b) => b.best_speed - a.best_speed)
              .map((domainResult) => {
                const isExpanded = expandedDomains.has(domainResult.domain);
                const groupedResults = groupResultsByPhase(
                  domainResult.results
                );
                const successCount = Object.values(domainResult.results).filter(
                  (r) => r.status === "complete"
                ).length;
                const totalCount = Object.keys(domainResult.results).length;

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
                        cursor: "pointer",
                      }}
                      onClick={() => toggleDomainExpand(domainResult.domain)}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <IconButton size="small">
                          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                        <Typography
                          variant="h6"
                          sx={{ color: colors.text.primary }}
                        >
                          {domainResult.domain}
                        </Typography>
                        {domainResult.best_success ? (
                          <B4Badge
                            label="Success"
                            size="small"
                            variant="filled"
                            color="primary"
                          />
                        ) : running ? (
                          <B4Badge
                            label="Testing..."
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ) : (
                          <B4Badge label="Failed" size="small" color="error" />
                        )}
                        <B4Badge
                          label={`${successCount}/${totalCount} configs`}
                          size="small"
                          variant="filled"
                          color="primary"
                        />
                        {domainResult.improvement &&
                          domainResult.improvement > 0 && (
                            <B4Badge
                              icon={<ImprovementIcon />}
                              label={`+${domainResult.improvement.toFixed(0)}%`}
                              size="small"
                              color="primary"
                            />
                          )}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: domainResult.best_success
                            ? colors.secondary
                            : colors.text.secondary,
                          fontWeight: 600,
                        }}
                      >
                        {domainResult.best_success
                          ? `${(domainResult.best_speed / 1024 / 1024).toFixed(
                              2
                            )} MB/s`
                          : running
                          ? `${totalCount} tested...`
                          : "No working config"}
                      </Typography>
                    </Box>

                    {/* Best Configuration Quick View (always visible) */}
                    {(domainResult.best_success ||
                      (running &&
                        Object.values(domainResult.results).some(
                          (r) => r.status === "complete"
                        ))) && (
                      <Box>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: colors.background.default,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: running
                              ? "none"
                              : `1px solid ${colors.border.default}`,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <SpeedIcon sx={{ color: colors.secondary }} />
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ color: colors.text.secondary }}
                              >
                                {running
                                  ? "Current Best"
                                  : "Best Configuration"}
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{
                                  color: colors.text.primary,
                                  fontWeight: 600,
                                }}
                              >
                                {domainResult.best_preset}
                                {domainResult.best_preset &&
                                  domainResult.results[domainResult.best_preset]
                                    ?.family && (
                                    <B4Badge
                                      label={
                                        familyNames[
                                          domainResult.results[
                                            domainResult.best_preset
                                          ].family!
                                        ]
                                      }
                                      color="primary"
                                    />
                                  )}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            startIcon={
                              addingPreset ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <AddIcon />
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const bestResult =
                                domainResult.results[domainResult.best_preset];
                              void handleAddStrategy(
                                domainResult.domain,
                                bestResult
                              );
                            }}
                            disabled={addingPreset}
                            sx={{
                              bgcolor: colors.secondary,
                              color: colors.background.default,
                              "&:hover": { bgcolor: colors.primary },
                            }}
                          >
                            {running ? "Use Current Best" : "Use This Strategy"}
                          </Button>
                        </Box>
                        {/* Info message while still running */}
                        {running && domainResult.best_success && (
                          <B4Alert
                            severity="info"
                            sx={{
                              borderRadius: 0,
                              bgcolor: colors.accent.secondary,
                              "& .MuiAlert-icon": { color: colors.secondary },
                              borderBottom: `1px solid ${colors.border.default}`,
                            }}
                          >
                            Found a working configuration! Still testing{" "}
                            {suite ? suite.total_checks - totalCount : "..."}{" "}
                            more configs — a faster option may be found.
                          </B4Alert>
                        )}
                      </Box>
                    )}

                    {/* Expanded Details */}
                    <Collapse in={isExpanded}>
                      <Box sx={{ p: 3 }}>
                        {domainResult.fingerprint && (
                          <FingerprintDisplay
                            fingerprint={domainResult.fingerprint}
                          />
                        )}

                        <Divider
                          sx={{ my: 2, borderColor: colors.border.default }}
                        />

                        {/* Results by Phase */}
                        {(
                          [
                            "baseline",
                            "strategy_detection",
                            "optimization",
                            "combination",
                          ] as DiscoveryPhase[]
                        )
                          .filter((phase) => groupedResults[phase].length > 0)
                          .map((phase) => (
                            <Box key={phase} sx={{ mb: 3 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: colors.text.secondary,
                                  mb: 1.5,
                                  textTransform: "uppercase",
                                  fontSize: "0.7rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {phaseNames[phase]}
                                <B4Badge
                                  label={groupedResults[phase].length}
                                  size="small"
                                  color="primary"
                                />
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                gap={1}
                              >
                                {groupedResults[phase]
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
                                      <B4Badge
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
                                        color={
                                          result.status === "complete"
                                            ? "primary"
                                            : "error"
                                        }
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
                                              disabled={addingPreset}
                                              sx={{
                                                p: 0.5,
                                                bgcolor: colors.background.dark,
                                                border: `1px solid ${colors.border.light}`,
                                                "&:hover": {
                                                  bgcolor:
                                                    colors.accent.secondary,
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
                          ))}
                      </Box>
                    </Collapse>

                    {/* Failed state */}
                    {!domainResult.best_success && !running && (
                      <Box sx={{ p: 3 }}>
                        <B4Alert severity="error">
                          All {Object.keys(domainResult.results).length} tested
                          configurations failed for this domain. Check your
                          network connection and domain accessibility.
                        </B4Alert>
                      </Box>
                    )}
                    {!domainResult.best_success && running && (
                      <Box sx={{ p: 2, bgcolor: colors.background.default }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: colors.text.secondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <CircularProgress
                            size={14}
                            sx={{ color: colors.text.secondary }}
                          />
                          {suite && suite.total_checks > totalCount
                            ? `${
                                suite.total_checks - totalCount
                              } more configurations to test...`
                            : "Testing configurations..."}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                );
              })}
          </Stack>
        )}

      <DiscoveryAddDialog
        open={addDialog.open}
        domain={addDialog.domain}
        presetName={addDialog.presetName}
        setConfig={addDialog.setConfig}
        onClose={() =>
          setAddDialog({
            open: false,
            domain: "",
            presetName: "",
            setConfig: null,
          })
        }
        onAddNew={(name: string, domain: string) => {
          void handleAddNew(name, domain);
        }}
        onAddToExisting={(setId: string, domain: string) => {
          void handleAddToExisting(setId, domain);
        }}
        loading={addingPreset}
      />
    </Stack>
  );
};
