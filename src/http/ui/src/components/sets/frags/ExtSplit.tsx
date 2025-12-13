import { Grid, Divider, Chip, Alert, Box, Typography } from "@mui/material";
import { colors } from "@design";

export const ExtSplitSettings: React.FC = () => {
  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 1 }}>
          <Chip label="Extension Split" size="small" />
        </Divider>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          Automatically splits TLS ClientHello just before the SNI extension.
          DPI sees incomplete extension list and fails to parse SNI.
        </Alert>
      </Grid>

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
        <Alert severity="success">
          No configuration needed. Uses <strong>Reverse Order</strong> toggle
          above and <strong>Seg2 Delay</strong> from TCP tab.
        </Alert>
      </Grid>
    </>
  );
};
