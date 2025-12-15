import { Grid, Box, Typography } from "@mui/material";
import { colors } from "@design";
import { B4Alert, B4FormHeader } from "@b4.elements";

export const ExtSplitSettings = () => {
  return (
    <>
      <B4FormHeader label="Extension Split" sx={{ mb: 0 }} />
      <B4Alert severity="info" sx={{ m: 0 }}>
        Automatically splits TLS ClientHello just before the SNI extension. DPI
        sees incomplete extension list and fails to parse SNI.
      </B4Alert>

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
            TLS CLIENTHELLO STRUCTURE
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              fontFamily: "monospace",
              fontSize: "0.7rem",
              flexWrap: "wrap",
            }}
          >
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.primary,
                borderRadius: 0.5,
              }}
            >
              TLS Header
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.primary,
                borderRadius: 0.5,
              }}
            >
              Handshake
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.primary,
                borderRadius: 0.5,
              }}
            >
              Ciphers
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.secondary,
                borderRadius: 0.5,
              }}
            >
              Ext₁
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.secondary,
                borderRadius: 0.5,
              }}
            >
              Ext₂
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.tertiary,
                borderRadius: 0.5,
                position: "relative",
              }}
            >
              <Box
                component="span"
                sx={{
                  position: "absolute",
                  left: -2,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  bgcolor: colors.quaternary,
                }}
              />
              SNI: youtube.com
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.secondary,
                borderRadius: 0.5,
              }}
            >
              Ext...
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Split happens at the yellow line — before SNI extension starts
          </Typography>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <B4Alert severity="success" sx={{ m: 0 }}>
          No configuration needed. Uses <strong>Reverse Order</strong> toggle
          above and <strong>Seg2 Delay</strong> from TCP tab.
        </B4Alert>
      </Grid>
    </>
  );
};
