import { Grid, Box, Typography } from "@mui/material";
import { B4SetConfig, DisorderShuffleMode } from "@models/Config";
import {
  B4Alert,
  B4Slider,
  B4Switch,
  B4Select,
  B4FormHeader,
} from "@b4.elements";
import { colors } from "@design";

interface DisorderSettingsProps {
  config: B4SetConfig;
  onChange: (field: string, value: string | boolean | number) => void;
}

const shuffleModeOptions: { label: string; value: DisorderShuffleMode }[] = [
  { label: "Full Shuffle", value: "full" },
  { label: "Reverse Order", value: "reverse" },
];

export const DisorderSettings = ({
  config,
  onChange,
}: DisorderSettingsProps) => {
  const disorder = config.fragmentation.disorder;
  const middleSni = config.fragmentation.middle_sni;

  return (
    <>
      <B4FormHeader label="Disorder Strategy" sx={{ mb: 0 }} />
      <B4Alert sx={{ m: 0 }}>
        Disorder sends real TCP segments out of order with timing jitter. No
        fake packets — exploits DPI that expects sequential data.
      </B4Alert>

      {/* SNI Split Toggle */}
      <Grid size={{ xs: 12, md: 6 }}>
        <B4Switch
          label="SNI-Based Splitting"
          checked={middleSni}
          onChange={(checked: boolean) =>
            onChange("fragmentation.middle_sni", checked)
          }
          description="Split around SNI hostname for targeted disruption"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <B4Select
          label="Shuffle Mode"
          value={disorder.shuffle_mode}
          options={shuffleModeOptions}
          onChange={(e) =>
            onChange(
              "fragmentation.disorder.shuffle_mode",
              e.target.value as string
            )
          }
          helperText="How to reorder segments"
        />
      </Grid>

      {/* Visual */}
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
            SEGMENT ORDER EXAMPLE
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box sx={{ display: "flex", gap: 0.5, fontFamily: "monospace" }}>
              {["①", "②", "③", "④"].map((n, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1,
                    bgcolor: colors.accent.primary,
                    borderRadius: 0.5,
                    minWidth: 32,
                    textAlign: "center",
                  }}
                >
                  {n}
                </Box>
              ))}
            </Box>
            <Typography sx={{ mx: 2 }}>→</Typography>
            <Box sx={{ display: "flex", gap: 0.5, fontFamily: "monospace" }}>
              {(disorder.shuffle_mode === "reverse"
                ? ["④", "③", "②", "①"]
                : ["③", "①", "④", "②"]
              ).map((n, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1,
                    bgcolor: colors.tertiary,
                    borderRadius: 0.5,
                    minWidth: 32,
                    textAlign: "center",
                  }}
                >
                  {n}
                </Box>
              ))}
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            {disorder.shuffle_mode === "full"
              ? "Segments sent in random order (example shown)"
              : "Segments sent in reverse order"}
          </Typography>
        </Box>
      </Grid>

      <B4FormHeader label="Timing Jitter" sx={{ mb: 0 }} />
      <B4Alert sx={{ m: 0 }}>
        Random delay between segments. Used when TCP Seg2Delay is 0.
      </B4Alert>

      <Grid size={{ xs: 12, md: 6 }}>
        <B4Slider
          label="Min Jitter"
          value={disorder.min_jitter_us}
          onChange={(value: number) =>
            onChange("fragmentation.disorder.min_jitter_us", value)
          }
          min={100}
          max={5000}
          step={100}
          helperText="Minimum delay between segments (μs)"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <B4Slider
          label="Max Jitter"
          value={disorder.max_jitter_us}
          onChange={(value: number) =>
            onChange("fragmentation.disorder.max_jitter_us", value)
          }
          min={500}
          max={10000}
          step={100}
          helperText="Maximum delay between segments (μs)"
        />
      </Grid>

      {disorder.min_jitter_us >= disorder.max_jitter_us && (
        <B4Alert severity="warning">
          Max jitter should be greater than min jitter for random variation.
        </B4Alert>
      )}
    </>
  );
};
