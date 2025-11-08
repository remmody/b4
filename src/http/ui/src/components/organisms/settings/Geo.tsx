import { B4Config } from "@models/Config";
import { Alert, Grid, Stack, Typography } from "@mui/material";
import { Language as SettingsIcon } from "@mui/icons-material";
import B4Section from "@molecules/common/B4Section";
import SettingTextField from "@atoms/common/B4TextField";

export interface GeoSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean | string | number) => void;
}

export const GeoSettings: React.FC<GeoSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={<SettingsIcon />}>
        <Typography variant="subtitle2" gutterBottom>
          Geodat Settings configure the GeoSite domain database path.
        </Typography>
      </Alert>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Section
            title="Geosite Settings"
            description="General settings for GeoSite domain database"
            icon={<SettingsIcon />}
          >
            <SettingTextField
              label="Geosite.dat URL"
              value={config.system.geo.sitedat_url}
              onChange={(e) =>
                onChange("system.geo.sitedat_url", e.target.value)
              }
              helperText="Url to geosite.dat file"
              placeholder="/path/to/geosite.dat"
            />
            <SettingTextField
              label="Geosite.dat database path"
              value={config.system.geo.sitedat_path}
              onChange={(e) =>
                onChange("system.geo.sitedat_path", e.target.value)
              }
              helperText="Path to geosite.dat file"
              placeholder="/path/to/geosite.dat"
            />
          </B4Section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Section
            title="GeoIP Settings"
            description="General settings for GeoIP database"
            icon={<SettingsIcon />}
          >
            <SettingTextField
              label="GeoIP.dat URL"
              value={config.system.geo.ipdat_url}
              onChange={(e) => onChange("system.geo.ipdat_url", e.target.value)}
              helperText="Url to geoip.dat file"
              placeholder="/path/to/geoip.dat"
            />
            <SettingTextField
              label="GeoIP.dat Database Path"
              value={config.system.geo.ipdat_path}
              onChange={(e) =>
                onChange("system.geo.ipdat_path", e.target.value)
              }
              helperText="Path to geoip.dat file"
              placeholder="/path/to/geoip.dat"
            />
          </B4Section>
        </Grid>
      </Grid>
    </Stack>
  );
};
