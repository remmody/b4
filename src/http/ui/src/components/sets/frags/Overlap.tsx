import { useState } from "react";
import { Grid, Chip, Box, Typography, IconButton } from "@mui/material";
import { AddIcon } from "@b4.icons";
import { B4TextField } from "@b4.fields";
import { B4SetConfig } from "@models/Config";
import { colors } from "@design";
import { B4Alert, B4FormHeader } from "@b4.elements";

interface OverlapSettingsProps {
  config: B4SetConfig;
  onChange: (
    field: string,
    value: string | boolean | number | string[]
  ) => void;
}

export const OverlapSettings = ({ config, onChange }: OverlapSettingsProps) => {
  const [newDomain, setNewDomain] = useState("");
  const fakeSNIs = config.fragmentation.overlap.fake_snis || [];

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (domain && !fakeSNIs.includes(domain)) {
      onChange("fragmentation.overlap.fake_snis", [...fakeSNIs, domain]);
      setNewDomain("");
    }
  };

  const handleRemoveDomain = (domain: string) => {
    onChange(
      "fragmentation.overlap.fake_snis",
      fakeSNIs.filter((d) => d !== domain)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <>
      <B4FormHeader label="Overlap Strategy" sx={{ mb: 0 }} />

      <B4Alert severity="info" sx={{ m: 0 }}>
        Exploits RFC 793: server keeps FIRST received data for overlapping
        segments. Real SNI sent first (server sees), fake SNI sent second (DPI
        sees).
      </B4Alert>

      {/* Visual explanation */}
      <Grid size={{ xs: 12 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: colors.background.paper,
            borderRadius: 1,
            border: `1px solid ${colors.border.default}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ mb: 1 }}
          >
            HOW OVERLAP WORKS
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ minWidth: 80, color: colors.text.secondary }}
              >
                Sent 1st:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    bgcolor: colors.accent.secondary,
                    borderRadius: 0.5,
                    border: `2px solid ${colors.secondary}`,
                  }}
                >
                  youtube.com (REAL)
                </Box>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: colors.accent.primary,
                    borderRadius: 0.5,
                  }}
                >
                  ...rest
                </Box>
              </Box>
              <Typography
                variant="caption"
                sx={{ color: colors.secondary, ml: 1 }}
              >
                → Server keeps
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ minWidth: 80, color: colors.text.secondary }}
              >
                Sent 2nd:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    bgcolor: colors.accent.primary,
                    borderRadius: 0.5,
                  }}
                >
                  Header...
                </Box>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: colors.tertiary,
                    borderRadius: 0.5,
                    border: `2px dashed ${colors.secondary}`,
                  }}
                >
                  {fakeSNIs[0] || "ya.ru"}...... (FAKE)
                </Box>
              </Box>
              <Typography
                variant="caption"
                sx={{ color: colors.secondary, ml: 1 }}
              >
                → DPI sees, server discards
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grid>

      {/* Fake SNIs editor */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Fake SNI Domains
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: "block" }}
        >
          Domains injected into overlapping segment. DPI sees these instead of
          real target. Use allowed/unblocked domains.
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <B4TextField
            label="Add Domain"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., allowed-site.ru"
            size="small"
          />
          <IconButton
            onClick={handleAddDomain}
            disabled={!newDomain.trim()}
            sx={{
              bgcolor: colors.accent.primary,
              "&:hover": { bgcolor: colors.accent.secondary },
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
            p: 1,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 1,
            bgcolor: colors.background.paper,
            minHeight: 40,
          }}
        >
          {fakeSNIs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No domains configured - defaults will be used
            </Typography>
          ) : (
            fakeSNIs.map((domain) => (
              <Chip
                key={domain}
                label={domain}
                onDelete={() => handleRemoveDomain(domain)}
                size="small"
                sx={{
                  bgcolor: colors.accent.primary,
                  color: colors.secondary,
                  "& .MuiChip-deleteIcon": { color: colors.secondary },
                }}
              />
            ))
          )}
        </Box>
      </Grid>

      {fakeSNIs.length === 0 && (
        <B4Alert severity="warning" sx={{ m: 0 }}>
          Using default domains (ya.ru, vk.com, etc). Add custom domains that
          are known to be unblocked in your region.
        </B4Alert>
      )}

      {fakeSNIs.length > 0 && fakeSNIs.length < 3 && (
        <B4Alert severity="info" sx={{ m: 0 }}>
          Tip: Add more domains for variety. A random one is selected per
          connection.
        </B4Alert>
      )}
    </>
  );
};
