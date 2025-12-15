import { Card, CardContent, Typography, Box, Stack } from "@mui/material";
import { DomainIcon, TimerIcon } from "@b4.icons";
import { colors } from "@design";
import { TestStatusBadge, TestStatus } from "@common/Badge";
import { SpeedIndicator } from "./SpeedIndicator";
import { B4Alert, B4Badge } from "@b4.elements";

interface TestResultCardProps {
  domain: string;
  status: TestStatus;
  duration: number; // milliseconds
  speed: number; // bytes per second
  improvement?: number;
  error?: string;
  status_code: number;
}

export const TestResultCard = ({
  domain,
  status,
  duration,
  speed,
  improvement,
  error,
  status_code,
}: TestResultCardProps) => {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${colors.border.default}`,
        borderRadius: 2,
        bgcolor: colors.background.paper,
        transition: "all 0.2s",
        "&:hover": {
          borderColor: colors.secondary,
          boxShadow: `0 0 0 1px ${colors.secondary}22`,
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  color: colors.text.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <DomainIcon fontSize="small" />
                {domain}
              </Typography>
            </Box>
            <TestStatusBadge status={status} />
          </Box>

          {/* Results */}
          {status === "complete" && (
            <Stack spacing={1.5}>
              <SpeedIndicator speed={speed} improvement={improvement} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: colors.text.secondary,
                }}
              >
                <TimerIcon fontSize="small" />
                <Typography variant="body2">
                  {(duration / 1000).toFixed(2)}s
                </Typography>
                <Box sx={{ flex: 1 }} />
                <B4Badge
                  color="secondary"
                  label={"http status: " + status_code}
                />
              </Box>
            </Stack>
          )}

          {/* Error */}
          {status === "failed" && error && (
            <B4Alert
              severity="error"
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: `${colors.quaternary}22`,
              }}
            >
              {error}
            </B4Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
