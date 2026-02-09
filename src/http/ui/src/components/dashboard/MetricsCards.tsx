import { Grid } from "@mui/material";
import {
  Shield as ShieldIcon,
  Lan as LanIcon,
  Storage as StorageIcon,
} from "@mui/icons-material";
import { StatCard } from "./StatCard";
import { formatNumber } from "@utils";
import { colors } from "@design";
import type { Metrics } from "./Page";

interface MetricsCardsProps {
  metrics: Metrics;
}

export const MetricsCards = ({ metrics }: MetricsCardsProps) => {
  const targetRate =
    metrics.total_connections > 0
      ? ((metrics.targeted_connections / metrics.total_connections) * 100).toFixed(1)
      : "0.0";

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
        <StatCard
          title="Connections"
          value={formatNumber(metrics.total_connections)}
          subtitle={`${metrics.current_cps.toFixed(1)} conn/s`}
          icon={<LanIcon />}
          color={colors.primary}
          variant="outlined"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
        <StatCard
          title="Bypassed"
          value={formatNumber(metrics.targeted_connections)}
          subtitle={`${targetRate}% of total`}
          icon={<ShieldIcon />}
          color={colors.secondary}
          variant="outlined"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
        <StatCard
          title="Packets"
          value={formatNumber(metrics.packets_processed)}
          subtitle={`${metrics.current_pps.toFixed(1)} pkt/s`}
          icon={<StorageIcon />}
          color={colors.tertiary}
          variant="outlined"
        />
      </Grid>
    </Grid>
  );
};
