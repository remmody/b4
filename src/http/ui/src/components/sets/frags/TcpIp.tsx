import { Grid, Divider, Chip, Box, Typography } from "@mui/material";

import { B4Slider, B4Switch } from "@b4.fields";
import { B4SetConfig } from "@models/Config";
import { colors } from "@design";
import { B4Alert } from "@components/common/B4Alert";

interface TcpIpSettingsProps {
  config: B4SetConfig;
  onChange: (field: string, value: string | boolean | number) => void;
}

export const TcpIpSettings = ({ config, onChange }: TcpIpSettingsProps) => {
  const getSplitModeDescription = () => {
    if (config.fragmentation.middle_sni) {
      if (config.fragmentation.sni_position > 0) {
        return "3 segments: split at fixed position AND middle of SNI";
      }
      return "2 segments: split at middle of SNI hostname";
    }
    return `2 segments: split at byte ${config.fragmentation.sni_position} of TLS payload`;
  };

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 1 }}>
          <Chip label="Where to Split" size="small" />
        </Divider>
      </Grid>
      

      <Grid size={{ xs: 12 }}>
        <B4Switch
          label="Smart SNI Split"
          checked={config.fragmentation.middle_sni}
          onChange={(checked: boolean) =>
            onChange("fragmentation.middle_sni", checked)
          }
          description="Automatically split in the middle of the SNI hostname (recommended)"
        />
      </Grid>

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
            TCP PACKET STRUCTURE EXAMPLE
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              fontFamily: "monospace",
              fontSize: "0.75rem",
            }}
          >
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.primary,
                borderRadius: 0.5,
                textAlign: "center",
                minWidth: 60,
              }}
            >
              TLS Header
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.secondary,
                borderRadius: 0.5,
                textAlign: "center",
                flex: 1,
                position: "relative",
              }}
            >
              {/* Fixed position split line */}
              {config.fragmentation.sni_position > 0 && (
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    left: "20%",
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: colors.tertiary,
                    transform: "translateX(-50%)",
                  }}
                />
              )}
              {/* Middle SNI split line */}
              {config.fragmentation.middle_sni && (
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: colors.quaternary,
                    transform: "translateX(-50%)",
                  }}
                />
              )}
              SNI: youtube.com
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.primary,
                borderRadius: 0.5,
                textAlign: "center",
                minWidth: 80,
              }}
            >
              Extensions...
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            {getSplitModeDescription()}
          </Typography>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography
          variant="caption"
          color="warning.main"
          gutterBottom
          component="div"
        >
          Manual override — use if Smart SNI Split doesn't work for your ISP
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 12 }}>
            <B4Slider
              label="Fixed Split Position"
              value={config.fragmentation.sni_position}
              onChange={(value: number) =>
                onChange("fragmentation.sni_position", value)
              }
              min={0}
              max={10}
              step={1}
              helperText="Bytes from TLS payload start (0 = disabled)"
            />
          </Grid>
        </Grid>
        {config.fragmentation.sni_position > 0 &&
          config.fragmentation.middle_sni && (
            <B4Alert severity="info" sx={{ mt: 2 }}>
              Both enabled → packet splits into 3 segments
            </B4Alert>
          )}
      </Grid>
    </>
  );
};
