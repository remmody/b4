import { B4Config } from "@models/Config";
import { Alert, Grid, Stack, Typography } from "@mui/material";
import { Language as SettingsIcon } from "@mui/icons-material";
import { B4TextField, B4Section } from "@b4.elements";

export interface ApiSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean | string | number) => void;
}

export const ApiSettings = ({ config, onChange }: ApiSettingsProps) => {
  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={<SettingsIcon />}>
        <Typography variant="subtitle2" gutterBottom>
          Here you can setup API settings for different services that can be
          used by B4.
        </Typography>
      </Alert>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Section
            title="IPINFO.IO Settings"
            description="Configure your IPINFO.IO API token here."
            icon={<SettingsIcon />}
          >
            <B4TextField
              label="Token"
              value={config.system.api.ipinfo_token}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange("system.api.ipinfo_token", e.target.value)
              }
              helperText={
                <>
                  Get the token from{" "}
                  <a
                    href="https://ipinfo.io/dashboard/token"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    IPINFO.IO Dashboard
                  </a>
                </>
              }
              placeholder="abcd1234efgh"
            />
          </B4Section>
        </Grid>
      </Grid>
    </Stack>
  );
};
