import { B4Config } from "@models/config";
import {
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
import { DomainIcon, DownloadIcon, SuccessIcon } from "@b4.icons";
import { B4Alert, B4Section, B4TextField } from "@b4.elements";
import { useState, useEffect, useCallback, useMemo } from "react";
import { colors } from "@design";
import { geodatApi, GeodatSource, GeoFileInfo } from "@b4.settings";

const CUSTOM_SOURCE = "__custom__";

interface GeoFileCardProps {
  title: string;
  fileInfo: GeoFileInfo;
  configPath: string;
  configUrl: string;
  sources: GeodatSource[];
  sourceUrlKey: "geosite_url" | "geoip_url";
  selectedSource: string;
  onSourceChange: (value: string) => void;
  customURL: string;
  onCustomURLChange: (value: string) => void;
  downloading: boolean;
  status: string;
  onDownload: () => void;
}

const GeoFileCard = ({
  title,
  fileInfo,
  configPath,
  configUrl,
  sources,
  sourceUrlKey,
  selectedSource,
  onSourceChange,
  customURL,
  onCustomURLChange,
  downloading,
  status,
  onDownload,
}: GeoFileCardProps) => {
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
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: `1px solid ${colors.border.default}`,
        bgcolor: colors.background.paper,
        height: "100%",
      }}
    >
      <Stack spacing={1.5}>
        {/* Status header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          {fileInfo.exists ? (
            <Chip
              size="small"
              icon={<SuccessIcon />}
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

        {/* File metadata */}
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            wordBreak: "break-all",
          }}
        >
          {configPath || "Not configured"}
        </Typography>

        {configUrl && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ wordBreak: "break-all" }}
          >
            Source: {configUrl}
          </Typography>
        )}

        {fileInfo.exists && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(fileInfo.size)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(fileInfo.last_modified)}
            </Typography>
          </Box>
        )}

        <Divider />

        {/* Source selection */}
        <B4TextField
          select
          label="Source"
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          helperText={`Select a ${sourceUrlKey === "geosite_url" ? "geosite" : "geoip"} source`}
        >
          {sources.map((source) => (
            <MenuItem key={source.name} value={source.name}>
              {source.name}
            </MenuItem>
          ))}
          <MenuItem value={CUSTOM_SOURCE}>
            <em>Custom URL...</em>
          </MenuItem>
        </B4TextField>

        {/* Custom URL (conditional) */}
        {selectedSource === CUSTOM_SOURCE && (
          <B4TextField
            label="Custom URL"
            value={customURL}
            onChange={(e) => onCustomURLChange(e.target.value)}
            placeholder={`https://example.com/${sourceUrlKey === "geosite_url" ? "geosite" : "geoip"}.dat`}
            helperText="Full URL to the .dat file"
          />
        )}

        {/* Download button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={
              downloading ? (
                <CircularProgress size={16} />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={onDownload}
            disabled={downloading || (!selectedSource && !customURL)}
          >
            {downloading ? "Downloading..." : "Download"}
          </Button>
          {status && (
            <Typography
              variant="caption"
              sx={{
                color: status.toLowerCase().includes("error")
                  ? colors.quaternary
                  : colors.text.secondary,
              }}
            >
              {status}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export interface GeoSettingsProps {
  config: B4Config;
  onChange?: (field: string, value: boolean | string | number) => void;
  loadConfig: () => void;
}

export const GeoSettings = ({ config, loadConfig }: GeoSettingsProps) => {
  const [sources, setSources] = useState<GeodatSource[]>([]);
  const [destPath, setDestPath] = useState<string>("/etc/b4");

  // Geosite state
  const [geositeInfo, setGeositeInfo] = useState<GeoFileInfo>({
    exists: false,
  });
  const [geositeSource, setGeositeSource] = useState<string>("");
  const [geositeCustomURL, setGeositeCustomURL] = useState<string>("");
  const [geositeDownloading, setGeositeDownloading] = useState(false);
  const [geositeStatus, setGeositeStatus] = useState<string>("");

  // GeoIP state
  const [geoipInfo, setGeoipInfo] = useState<GeoFileInfo>({ exists: false });
  const [geoipSource, setGeoipSource] = useState<string>("");
  const [geoipCustomURL, setGeoipCustomURL] = useState<string>("");
  const [geoipDownloading, setGeoipDownloading] = useState(false);
  const [geoipStatus, setGeoipStatus] = useState<string>("");

  // Filter sources per file type
  const geositeSources = useMemo(
    () => sources.filter((s) => s.geosite_url !== ""),
    [sources],
  );
  const geoipSources = useMemo(
    () => sources.filter((s) => s.geoip_url !== ""),
    [sources],
  );

  useEffect(() => {
    void loadSources();
    setDestPath(extractDir(config.system.geo.sitedat_path) || "/etc/b4");
  }, [config.system.geo.sitedat_path]);

  const checkFileStatus = useCallback(async () => {
    if (config.system.geo.sitedat_path) {
      try {
        const info = await geodatApi.info(config.system.geo.sitedat_path);
        setGeositeInfo(info);
      } catch {
        setGeositeInfo({ exists: false });
      }
    }

    if (config.system.geo.ipdat_path) {
      try {
        const info = await geodatApi.info(config.system.geo.ipdat_path);
        setGeoipInfo(info);
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
      const data = await geodatApi.sources();
      setSources(data);
    } catch (error) {
      console.error("Failed to load geodat sources:", error);
    }
  };

  // Match dropdown selection to the URL stored in config
  useEffect(() => {
    if (geositeSources.length === 0 || geositeSource) return;
    const configUrl = config.system.geo.sitedat_url;
    if (configUrl) {
      const match = geositeSources.find((s) => s.geosite_url === configUrl);
      if (match) {
        setGeositeSource(match.name);
      } else {
        setGeositeSource(CUSTOM_SOURCE);
        setGeositeCustomURL(configUrl);
      }
    } else {
      setGeositeSource(geositeSources[0].name);
    }
  }, [geositeSources, geositeSource, config.system.geo.sitedat_url]);

  useEffect(() => {
    if (geoipSources.length === 0 || geoipSource) return;
    const configUrl = config.system.geo.ipdat_url;
    if (configUrl) {
      const match = geoipSources.find((s) => s.geoip_url === configUrl);
      if (match) {
        setGeoipSource(match.name);
      } else {
        setGeoipSource(CUSTOM_SOURCE);
        setGeoipCustomURL(configUrl);
      }
    } else {
      setGeoipSource(geoipSources[0].name);
    }
  }, [geoipSources, geoipSource, config.system.geo.ipdat_url]);

  const extractDir = (path: string): string => {
    if (!path) return "";
    const lastSlash = path.lastIndexOf("/");
    return lastSlash > 0 ? path.substring(0, lastSlash) : path;
  };

  const handleGeositeSourceChange = (value: string) => {
    setGeositeSource(value);
    if (value !== CUSTOM_SOURCE) setGeositeCustomURL("");
  };

  const handleGeoipSourceChange = (value: string) => {
    setGeoipSource(value);
    if (value !== CUSTOM_SOURCE) setGeoipCustomURL("");
  };

  const handleGeositeDownload = async () => {
    const url =
      geositeSource === CUSTOM_SOURCE
        ? geositeCustomURL
        : geositeSources.find((s) => s.name === geositeSource)?.geosite_url;

    if (!url) {
      setGeositeStatus("Please select a source or enter a URL");
      return;
    }

    setGeositeDownloading(true);
    setGeositeStatus("Downloading geosite.dat...");

    try {
      await geodatApi.download(destPath, url);
      setGeositeStatus("Downloaded successfully");
      loadConfig();
      void checkFileStatus();
      setTimeout(() => setGeositeStatus(""), 5000);
    } catch (error) {
      setGeositeStatus(`Error: ${String(error)}`);
    } finally {
      setGeositeDownloading(false);
    }
  };

  const handleGeoipDownload = async () => {
    const url =
      geoipSource === CUSTOM_SOURCE
        ? geoipCustomURL
        : geoipSources.find((s) => s.name === geoipSource)?.geoip_url;

    if (!url) {
      setGeoipStatus("Please select a source or enter a URL");
      return;
    }

    setGeoipDownloading(true);
    setGeoipStatus("Downloading geoip.dat...");

    try {
      await geodatApi.download(destPath, "", url);
      setGeoipStatus("Downloaded successfully");
      loadConfig();
      void checkFileStatus();
      setTimeout(() => setGeoipStatus(""), 5000);
    } catch (error) {
      setGeoipStatus(`Error: ${String(error)}`);
    } finally {
      setGeoipDownloading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <B4Alert>
        <Typography variant="subtitle2" gutterBottom>
          GeoSite and GeoIP database files for domain and IP categorization.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Each database can be downloaded independently from different sources.
        </Typography>
      </B4Alert>

      <B4Section
        title="Geo Databases"
        description="Download and manage geodat files"
        icon={<DomainIcon />}
      >
        <B4TextField
          label="Destination Directory"
          value={destPath}
          onChange={(e) => setDestPath(e.target.value)}
          placeholder="/etc/b4"
          helperText="Directory where .dat files will be saved"
        />

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <GeoFileCard
              title="Geosite Database"
              fileInfo={geositeInfo}
              configPath={config.system.geo.sitedat_path}
              configUrl={config.system.geo.sitedat_url}
              sources={geositeSources}
              sourceUrlKey="geosite_url"
              selectedSource={geositeSource}
              onSourceChange={handleGeositeSourceChange}
              customURL={geositeCustomURL}
              onCustomURLChange={setGeositeCustomURL}
              downloading={geositeDownloading}
              status={geositeStatus}
              onDownload={() => void handleGeositeDownload()}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <GeoFileCard
              title="GeoIP Database"
              fileInfo={geoipInfo}
              configPath={config.system.geo.ipdat_path}
              configUrl={config.system.geo.ipdat_url}
              sources={geoipSources}
              sourceUrlKey="geoip_url"
              selectedSource={geoipSource}
              onSourceChange={handleGeoipSourceChange}
              customURL={geoipCustomURL}
              onCustomURLChange={setGeoipCustomURL}
              downloading={geoipDownloading}
              status={geoipStatus}
              onDownload={() => void handleGeoipDownload()}
            />
          </Grid>
        </Grid>
      </B4Section>
    </Stack>
  );
};
