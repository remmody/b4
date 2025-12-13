import React, { useEffect, useState } from "react";
import {
  Button,
  Alert,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Stack,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { colors, button_primary, button_secondary } from "@design";
import { B4Dialog } from "@common/B4Dialog";
import { B4SetConfig, MAIN_SET_ID } from "@models/Config";
import { SetSelector } from "@common/SetSelector";

interface RipeDialogProps {
  open: boolean;
  ip: string;
  sets: B4SetConfig[];
  onClose: () => void;
  onAdd: (setId: string, prefixes: string[]) => Promise<void>;
}

interface NetworkInfo {
  asns: string[];
  prefix: string;
  prefixes?: Prefix[];
}

interface RipeResponse {
  data: NetworkInfo | Prefix;
}

interface Prefix {
  prefix: string;
}

export const RipeDialog: React.FC<RipeDialogProps> = ({
  open,
  ip,
  sets,
  onClose,
  onAdd,
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [ipv4Count, setIpv4Count] = useState(0);
  const [ipv6Count, setIpv6Count] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open && sets.length > 0) {
      setSelectedSetId(MAIN_SET_ID);
    }
  }, [open, sets]);

  useEffect(() => {
    if (!open) {
      setNetworkInfo(null);
      setPrefixes([]);
      setIpv4Count(0);
      setIpv6Count(0);
      setError(null);
      return;
    }

    const fetchNetworkInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/integration/ripestat?ip=${encodeURIComponent(ip)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch network info");
        }
        const data = (await response.json()) as RipeResponse;
        const networkData = data.data as NetworkInfo;
        const asns = networkData?.asns || [];
        const prefix = networkData?.prefix || "";
        setNetworkInfo({ asns, prefix });

        if (asns.length > 0) {
          const asnResponse = await fetch(
            `/api/integration/ripestat/asn?asn=${encodeURIComponent(asns[0])}`
          );
          if (!asnResponse.ok) {
            throw new Error("Failed to fetch ASN prefixes");
          }
          const asnData = (await asnResponse.json()) as RipeResponse;
          const prefixList = asnData.data as { prefixes: Prefix[] };

          setPrefixes(prefixList.prefixes || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchNetworkInfo();
  }, [open, ip]);

  const handleAdd = async () => {
    if (prefixes.length === 0 || !selectedSetId) return;
    setAdding(true);
    try {
      await onAdd(
        selectedSetId,
        prefixes.map((p) => p.prefix)
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add prefixes");
    } finally {
      setAdding(false);
    }
  };

  return (
    <B4Dialog
      title="RIPE Network Info & ASN Prefixes"
      icon={<InfoIcon />}
      open={open}
      onClose={onClose}
      maxWidth="md"
      actions={
        <>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ ...button_secondary }}
          >
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => void handleAdd()}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={prefixes.length === 0 || !selectedSetId || adding}
            sx={{ ...button_primary }}
          >
            {adding ? "Adding..." : `Add All ${prefixes.length} Prefixes`}
          </Button>
        </>
      }
    >
      <>
        <Alert severity="info" sx={{ mb: 2 }}>
          RIPE database information for IP: <strong>{ip}</strong>
        </Alert>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && networkInfo && (
          <>
            <Grid container spacing={4} sx={{ mb: 2 }}>
              <Box>
                <Stack direction="row">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                    }}
                  >
                    Network Prefix:
                  </Typography>
                  <Chip
                    label={networkInfo.prefix}
                    sx={{
                      ml: 1,
                      bgcolor: colors.accent.secondary,
                      color: colors.secondary,
                      fontFamily: "monospace",
                    }}
                  />
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Box>
                <Stack direction="row">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                    }}
                  >
                    ASN(s):
                  </Typography>
                  {networkInfo.asns.map((asn) => (
                    <Chip
                      key={asn}
                      label={`AS${asn}`}
                      sx={{
                        ml: 1,
                        bgcolor: colors.accent.primary,
                        color: colors.primary,
                        fontFamily: "monospace",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Grid>

            {prefixes.length > 0 && (
              <>
                <SetSelector
                  sets={sets}
                  value={selectedSetId}
                  onChange={setSelectedSetId}
                  disabled={adding}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Announced Prefixes Summary:
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {ipv4Count > 0 && (
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: colors.background.dark,
                        borderRadius: 1,
                        border: `1px solid ${colors.border.default}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        IPv4 Prefixes
                      </Typography>
                      <Typography variant="h4" color={colors.primary}>
                        {ipv4Count}
                      </Typography>
                    </Box>
                  )}
                  {ipv6Count > 0 && (
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: colors.background.dark,
                        borderRadius: 1,
                        border: `1px solid ${colors.border.default}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        IPv6 Prefixes
                      </Typography>
                      <Typography variant="h4" color={colors.secondary}>
                        {ipv6Count}
                      </Typography>
                    </Box>
                  )}
                </Stack>

                <Alert severity="info" sx={{ mt: 1 }}>
                  Clicking "Add All" will add all {prefixes.length} prefixes to
                  the selected set.
                </Alert>
              </>
            )}

            {prefixes.length === 0 && !loading && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No prefixes found for this ASN
              </Alert>
            )}
          </>
        )}
      </>
    </B4Dialog>
  );
};
