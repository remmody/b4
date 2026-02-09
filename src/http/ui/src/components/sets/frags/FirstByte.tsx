import { Grid, Box, Typography } from "@mui/material";
import { colors } from "@design";
import { B4SetConfig } from "@models/config";
import { B4Alert, B4FormHeader } from "@b4.elements";

interface FirstByteSettingsProps {
  config: B4SetConfig;
}

export const FirstByteSettings = ({ config }: FirstByteSettingsProps) => {
  return (
    <>
      <B4FormHeader label="First-Byte Desync" />

      <B4Alert severity="info" sx={{ m: 0 }}>
        Sends just 1 byte, waits, then sends the rest. Exploits DPI timeout —
        incomplete TLS record can't be parsed.
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
            TIMING ATTACK
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontFamily: "monospace",
              fontSize: "0.75rem",
            }}
          >
            <Box
              sx={{
                p: 1,
                bgcolor: colors.tertiary,
                borderRadius: 0.5,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              0x16
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: colors.text.secondary,
              }}
            >
              <Typography variant="caption">
                ⏱️ {config.tcp.seg2delay_max > config.tcp.seg2delay
                  ? `${config.tcp.seg2delay || 30}–${config.tcp.seg2delay_max}ms`
                  : `${config.tcp.seg2delay || 30}ms+`}
              </Typography>
              <Box
                sx={{
                  width: 60,
                  height: 2,
                  bgcolor: colors.quaternary,
                  my: 0.5,
                }}
              />
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: colors.accent.secondary,
                borderRadius: 0.5,
                flex: 1,
                textAlign: "center",
              }}
            >
              Rest of TLS ClientHello...
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            DPI sees 1 byte (TLS record type), waits for more, times out before
            SNI arrives
          </Typography>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <B4Alert severity="success" sx={{ m: 0 }}>
          No configuration needed. Delay controlled by{" "}
          <strong>Seg2 Delay</strong> in TCP tab (minimum 100ms applied
          automatically).
        </B4Alert>
      </Grid>
    </>
  );
};
