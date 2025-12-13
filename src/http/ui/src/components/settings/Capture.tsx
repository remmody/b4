import React, { useState, useEffect } from "react";
import {
  Grid,
  Stack,
  Alert,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  MenuItem,
  Tooltip,
  IconButton,
  Chip,
  Snackbar,
} from "@mui/material";
import {
  CameraAlt as CaptureIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Clear as ClearAllIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
} from "@mui/icons-material";
import B4Section from "@common/B4Section";
import B4TextField from "@common/B4TextField";
import { B4Dialog } from "@common/B4Dialog";
import { colors, button_primary, radius } from "@design";

interface Capture {
  protocol: string;
  domain: string;
  timestamp: string;
  size: number;
  filepath: string;
  hex_data: string;
}

export const CaptureSettings = () => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(false);
  const [probeForm, setProbeForm] = useState({
    domain: "",
    protocol: "both",
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [hexDialog, setHexDialog] = useState<{
    open: boolean;
    capture: Capture | null;
  }>({ open: false, capture: null });

  useEffect(() => {
    void loadCaptures();
  }, []);

  const loadCaptures = async () => {
    try {
      const response = await fetch("/api/capture/list");
      if (response.ok) {
        const data = (await response.json()) as Capture[];
        setCaptures(data);
      }
    } catch (error) {
      console.error("Failed to load captures:", error);
    }
  };

  const probeCapture = async () => {
    if (!probeForm.domain) return;

    const capturedDomain = probeForm.domain; // Store for notification
    setLoading(true);

    setNotification({
      open: true,
      message: `Capturing enabled for ${capturedDomain}. Open https://${capturedDomain} in your browser to capture the payload.`,
      severity: "success",
    });

    try {
      if (probeForm.protocol === "both") {
        await fetch("/api/capture/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: probeForm.domain, protocol: "tls" }),
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetch("/api/capture/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: probeForm.domain, protocol: "quic" }),
        });
      } else {
        await fetch("/api/capture/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(probeForm),
        });
      }

      // Poll for capture completion
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = setInterval(() => {
        void (async () => {
          attempts++;
          const response = await fetch("/api/capture/list");
          if (response.ok) {
            const data = (await response.json()) as Capture[];
            const found = data.some((c) => c.domain === capturedDomain);

            if (found || attempts >= maxAttempts) {
              clearInterval(checkInterval);
              setCaptures(data);
              setLoading(false);

              if (found) {
                setNotification({
                  open: true,
                  message: `Successfully captured payload for ${capturedDomain}`,
                  severity: "success",
                });
                setProbeForm({ ...probeForm, domain: "" });
              } else {
                setNotification({
                  open: true,
                  message: `Capture timeout for ${capturedDomain}. Please try again.`,
                  severity: "error",
                });
              }
            }
          }
        })();
      }, 1000);
    } catch (error) {
      console.error("Failed to probe:", error);
      setLoading(false);
      setNotification({
        open: true,
        message: "Failed to initiate capture",
        severity: "error",
      });
    }
  };

  const deleteCapture = async (capture: Capture) => {
    try {
      await fetch(
        `/api/capture/delete?protocol=${capture.protocol}&domain=${capture.domain}`,
        { method: "DELETE" }
      );
      await loadCaptures();
      setNotification({
        open: true,
        message: `Deleted ${capture.protocol.toUpperCase()} payload for ${
          capture.domain
        }`,
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const clearAll = async () => {
    if (!confirm("Delete all captured payloads?")) return;

    try {
      await fetch("/api/capture/clear", { method: "POST" });
      await loadCaptures();
      setNotification({
        open: true,
        message: "All captures cleared",
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to clear:", error);
    }
  };

  const downloadCapture = (capture: Capture) => {
    const url = `/api/capture/download?file=${encodeURIComponent(
      capture.filepath
    )}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${capture.protocol}_${capture.domain.replace(
      /\./g,
      "_"
    )}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyHex = (hexData: string) => {
    void navigator.clipboard.writeText(hexData);
    setNotification({
      open: true,
      message: "Hex data copied to clipboard",
      severity: "success",
    });
  };

  // Group captures by domain
  const capturesByDomain = captures.reduce((acc, capture) => {
    if (!acc[capture.domain]) {
      acc[capture.domain] = [];
    }
    acc[capture.domain].push(capture);
    return acc;
  }, {} as Record<string, Capture[]>);

  // Sort domains alphabetically
  const sortedDomains = Object.keys(capturesByDomain).sort();

  return (
    <Stack spacing={3}>
      {/* Info */}
      <Alert severity="info" icon={<CaptureIcon />}>
        <Typography variant="subtitle2" gutterBottom>
          Capture real TLS/QUIC handshakes for custom payload generation
        </Typography>
        <Typography variant="caption" color="text.secondary">
          One capture per domain+protocol. Use captured hex in Faking → Custom
          Payload
        </Typography>
      </Alert>

      {/* Capture Form */}
      <B4Section
        title="Capture Payload"
        description="Probe domain to capture its TLS ClientHello or QUIC Initial packet"
        icon={<CaptureIcon />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <B4TextField
              label="Domain"
              value={probeForm.domain}
              onChange={(e) =>
                setProbeForm({
                  ...probeForm,
                  domain: e.target.value.toLowerCase(),
                })
              }
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading && probeForm.domain) {
                  void probeCapture();
                }
              }}
              placeholder="youtube.com"
              helperText="Enter domain to capture from"
              disabled={loading}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <B4TextField
              select
              label="Protocol"
              value={probeForm.protocol}
              onChange={(e) =>
                setProbeForm({ ...probeForm, protocol: e.target.value })
              }
              disabled={loading}
            >
              <MenuItem value="both">Both TLS & QUIC</MenuItem>
              <MenuItem value="tls">TLS Only</MenuItem>
              <MenuItem value="quic">QUIC Only</MenuItem>
            </B4TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={
                loading ? <CircularProgress size={16} /> : <CaptureIcon />
              }
              onClick={() => void probeCapture()}
              disabled={loading || !probeForm.domain}
              sx={{ ...button_primary }}
            >
              {loading ? "Capturing..." : "Capture"}
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh list">
                <IconButton
                  onClick={() => void loadCaptures()}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {captures.length > 0 && (
                <Tooltip title="Clear all captures">
                  <IconButton
                    onClick={() => void clearAll()}
                    color="error"
                    disabled={loading}
                  >
                    <ClearAllIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Grid>
        </Grid>

        {loading && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Capture window is open for {probeForm.domain}
            </Typography>
            <Typography variant="caption">
              Please open https://{probeForm.domain} in your browser within 30
              seconds
            </Typography>
          </Alert>
        )}
      </B4Section>

      {/* Captured Payloads */}
      {sortedDomains.length > 0 && (
        <B4Section
          title="Captured Payloads"
          description={`${captures.length} payload${
            captures.length !== 1 ? "s" : ""
          } ready for use`}
          icon={<DownloadIcon />}
        >
          <Stack spacing={2}>
            {sortedDomains.map((domain) => (
              <Paper
                key={domain}
                elevation={0}
                sx={{
                  p: 2,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.md,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {domain}
                </Typography>

                <Grid container spacing={1}>
                  {capturesByDomain[domain]
                    .sort((a, b) => a.protocol.localeCompare(b.protocol))
                    .map((capture) => (
                      <Grid
                        size={{ xs: 12, sm: 6, md: 4 }}
                        key={`${capture.protocol}:${capture.domain}`}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            border: `1px solid ${colors.border.light}`,
                            borderRadius: radius.sm,
                            transition: "all 0.2s",
                            "&:hover": {
                              borderColor: colors.secondary,
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                          <Stack spacing={1}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Chip
                                label={capture.protocol.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor:
                                    capture.protocol === "tls"
                                      ? colors.accent.primary
                                      : colors.accent.secondary,
                                  color: colors.text.primary,
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {capture.size} bytes
                              </Typography>
                            </Box>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(capture.timestamp).toLocaleString()}
                            </Typography>

                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="View/Copy hex data">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setHexDialog({ open: true, capture })
                                  }
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download binary">
                                <IconButton
                                  size="small"
                                  onClick={() => downloadCapture(capture)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => void deleteCapture(capture)}
                                  sx={{ color: colors.quaternary }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            ))}
          </Stack>
        </B4Section>
      )}

      {/* Empty State */}
      {captures.length === 0 && !loading && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: `1px dashed ${colors.border.default}`,
            borderRadius: radius.md,
          }}
        >
          <CaptureIcon
            sx={{ fontSize: 48, color: colors.text.secondary, mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary">
            No captured payloads yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a domain above and click Capture to get started
          </Typography>
        </Paper>
      )}

      {/* Hex Dialog */}
      <B4Dialog
        title="Payload Hex Data"
        subtitle="Copy for use in Faking → Custom Payload"
        icon={<CaptureIcon />}
        open={hexDialog.open}
        onClose={() => setHexDialog({ open: false, capture: null })}
        maxWidth="md"
        fullWidth
        actions={
          <Button
            variant="contained"
            onClick={() => {
              if (hexDialog.capture?.hex_data) {
                copyHex(hexDialog.capture.hex_data);
              }
              setHexDialog({ open: false, capture: null });
            }}
            sx={{ ...button_primary }}
          >
            Copy & Close
          </Button>
        }
      >
        {hexDialog.capture && (
          <Stack spacing={2}>
            <Alert severity="info" icon={<SuccessIcon />}>
              {hexDialog.capture.protocol.toUpperCase()} payload for{" "}
              {hexDialog.capture.domain} • {hexDialog.capture.size} bytes
            </Alert>
            <Box
              sx={{
                p: 2,
                bgcolor: colors.background.dark,
                borderRadius: radius.sm,
                fontFamily: "monospace",
                fontSize: "0.8rem",
                wordBreak: "break-all",
                maxHeight: 400,
                overflow: "auto",
                userSelect: "all",
              }}
            >
              {hexDialog.capture.hex_data}
            </Box>
          </Stack>
        )}
      </B4Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
};
