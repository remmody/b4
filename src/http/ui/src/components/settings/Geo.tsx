import { B4Config } from "@models/Config";
import {
  Alert,
  Grid,
  Stack,
  Typography,
  Button,
  MenuItem,
  CircularProgress,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import {
  Language as SettingsIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { B4Section, B4TextField } from "@b4.elements";
import { useState, useEffect, useCallback } from "react";
import { button_primary, colors } from "@design";

export interface GeoSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean | string | number) => void;
  loadConfig: () => void;
}

interface GeodatSource {
  name: string;
  geosite_url: string;
  geoip_url: string;
}

interface FileInfo {
  exists: boolean;
  size?: number;
  last_modified?: string;
}

export const GeoSettings: React.FC<GeoSettingsProps> = ({
  config,
  loadConfig,
}) => {
  const [sources, setSources] = useState<GeodatSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [customGeositeURL, setCustomGeositeURL] = useState<string>("");
  const [customGeoipURL, setCustomGeoipURL] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [destPath, setDestPath] = useState<string>("/etc/b4");
  const [geositeInfo, setGeositeInfo] = useState<FileInfo>({ exists: false });
  const [geoipInfo, setGeoipInfo] = useState<FileInfo>({ exists: false });

  useEffect(() => {
    void loadSources();
    setDestPath(extractDir(config.system.geo.sitedat_path) || "/etc/b4");
  }, [config.system.geo.sitedat_path]);

  const checkFileStatus = useCallback(async () => {
    if (config.system.geo.sitedat_path) {
      try {
        const response = await fetch(
          `/api/geodat/info?path=${encodeURIComponent(
            config.system.geo.sitedat_path
          )}`
        );
        if (response.ok) {
          const info = (await response.json()) as FileInfo;
          setGeositeInfo(info);
        }
      } catch {
        setGeositeInfo({ exists: false });
      }
    }

    if (config.system.geo.ipdat_path) {
      try {
        const response = await fetch(
          `/api/geodat/info?path=${encodeURIComponent(
            config.system.geo.ipdat_path
          )}`
        );
        if (response.ok) {
          const info = (await response.json()) as FileInfo;
          setGeoipInfo(info);
        }
      } catch {
        setGeoipInfo({ exists: false });
      }
    }
  }, [config.system.geo.sitedat_path, config.system.geo.ipdat_path]);

  useEffect(() => {
    void checkFileStatus();
  }, [checkFileStatus]);

  const loadSources = async () => {
    try {
      const response = await fetch("/api/geodat/sources");
      if (response.ok) {
        const data = (await response.json()) as GeodatSource[];
        setSources(data);
        if (data.length > 0) {
          setSelectedSource(data[0].name);
        }
      }
    } catch (error) {
      console.error("Failed to load geodat sources:", error);
    }
  };

  const handleSourceChange = (sourceName: string) => {
    setSelectedSource(sourceName);
    setCustomGeositeURL("");
    setCustomGeoipURL("");
  };

  const handleDownload = async () => {
    let geositeURL = customGeositeURL;
    let geoipURL = customGeoipURL;

    if (!customGeositeURL || !customGeoipURL) {
      const source = sources.find((s) => s.name === selectedSource);
      if (source) {
        geositeURL = source.geosite_url;
        geoipURL = source.geoip_url;
      }
    }

    if (!geositeURL || !geoipURL) {
      setDownloadStatus("Please select a source or enter custom URLs");
      return;
    }

    setDownloading(true);
    setDownloadStatus("Downloading...");

    try {
      const response = await fetch("/api/geodat/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geosite_url: geositeURL,
          geoip_url: geoipURL,
          destination_path: destPath,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          success: boolean;
          message: string;
          geosite_path: string;
          geoip_path: string;
        };

        setDownloadStatus(
          `Downloaded successfully to ${extractDir(result.geosite_path)}`
        );
        loadConfig();
        setTimeout(() => setDownloadStatus(""), 5000);
        void checkFileStatus();
      } else {
        const error = await response.text();
        setDownloadStatus(`Failed: ${error}`);
      }
    } catch (error) {
      setDownloadStatus(`Error: ${String(error)}`);
    } finally {
      setDownloading(false);
    }
  };

  const extractDir = (path: string): string => {
    if (!path) return "";
    const lastSlash = path.lastIndexOf("/");
    return lastSlash > 0 ? path.substring(0, lastSlash) : path;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={<InfoIcon />}>
        <Typography variant="subtitle2" gutterBottom>
          Download GeoSite/GeoIP database files for domain and IP
          categorization.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Files will be saved to <strong>{destPath}</strong>
        </Typography>
      </Alert>

      {/* Current Files Status */}
      <B4Section
        title="Current Files"
        description="Status of currently configured geodat files"
        icon={<SettingsIcon />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                border: `1px solid ${colors.border.default}`,
                bgcolor: colors.background.paper,
              }}
            >
              <Stack spacing={1}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Geosite Database
                  </Typography>
                  {geositeInfo.exists ? (
                    <Chip
                      size="small"
                      icon={<CheckIcon />}
                      label="Active"
                      sx={{
                        bgcolor: colors.accent.secondary,
                        color: colors.secondary,
                      }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="Not Found"
                      sx={{ bgcolor: colors.accent.tertiary }}
                    />
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Path
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    wordBreak: "break-all",
                  }}
                >
                  {config.system.geo.sitedat_path || "Not configured"}
                </Typography>

                {config.system.geo.sitedat_url && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Source
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {config.system.geo.sitedat_url}
                    </Typography>
                  </>
                )}

                {geositeInfo.exists && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Size: {formatFileSize(geositeInfo.size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(geositeInfo.last_modified)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                border: `1px solid ${colors.border.default}`,
                bgcolor: colors.background.paper,
              }}
            >
              <Stack spacing={1}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    GeoIP Database
                  </Typography>
                  {geoipInfo.exists ? (
                    <Chip
                      size="small"
                      icon={<CheckIcon />}
                      label="Active"
                      sx={{
                        bgcolor: colors.accent.secondary,
                        color: colors.secondary,
                      }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="Not Found"
                      sx={{ bgcolor: colors.accent.tertiary }}
                    />
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Path
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    wordBreak: "break-all",
                  }}
                >
                  {config.system.geo.ipdat_path || "Not configured"}
                </Typography>

                {config.system.geo.ipdat_url && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Source
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {config.system.geo.ipdat_url}
                    </Typography>
                  </>
                )}

                {geoipInfo.exists && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Size: {formatFileSize(geoipInfo.size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(geoipInfo.last_modified)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </B4Section>

      {/* Download Section */}
      <B4Section
        title="Download Files"
        description="Select a preset source or enter custom URLs"
        icon={<DownloadIcon />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <B4TextField
              select
              label="Preset Source"
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              helperText="Select a predefined geodat source"
            >
              {sources.map((source) => (
                <MenuItem key={source.name} value={source.name}>
                  {source.name}
                </MenuItem>
              ))}
            </B4TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <B4TextField
              label="Destination Path"
              value={destPath}
              onChange={(e) => {
                setDestPath(e.target.value);
              }}
              placeholder="https://example.com/geosite.dat"
              helperText="Full URL to geosite.dat file"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                OR
              </Typography>
            </Divider>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <B4TextField
              label="Custom Geosite URL"
              value={customGeositeURL}
              onChange={(e) => {
                setCustomGeositeURL(e.target.value);
                if (e.target.value) setSelectedSource("");
              }}
              placeholder="https://example.com/geosite.dat"
              helperText="Full URL to geosite.dat file"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <B4TextField
              label="Custom GeoIP URL"
              value={customGeoipURL}
              onChange={(e) => {
                setCustomGeoipURL(e.target.value);
                if (e.target.value) setSelectedSource("");
              }}
              placeholder="https://example.com/geoip.dat"
              helperText="Full URL to geoip.dat file"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained"
                startIcon={
                  downloading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <DownloadIcon />
                  )
                }
                onClick={() => void handleDownload()}
                disabled={downloading}
                sx={{ ...button_primary }}
              >
                {downloading ? "Downloading..." : "Download Files"}
              </Button>

              {downloadStatus && (
                <Typography
                  variant="body2"
                  sx={{
                    color: downloadStatus.includes("✓")
                      ? colors.secondary
                      : colors.quaternary,
                  }}
                >
                  {downloadStatus}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </B4Section>
    </Stack>
  );
};
