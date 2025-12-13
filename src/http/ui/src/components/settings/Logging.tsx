import { Grid } from "@mui/material";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { B4Section, B4Select, B4Switch } from "@b4.elements";
import { B4Config, LogLevel } from "@models/Config";

interface LoggingSettingsProps {
  config: B4Config;
  onChange: (field: string, value: number | boolean) => void;
}

const LOG_LEVELS: Array<{ value: LogLevel; label: string }> = [
  { value: LogLevel.ERROR, label: "Error" },
  { value: LogLevel.INFO, label: "Info" },
  { value: LogLevel.TRACE, label: "Trace" },
  { value: LogLevel.DEBUG, label: "Debug" },
] as const;

export const LoggingSettings = ({ config, onChange }: LoggingSettingsProps) => {
  return (
    <B4Section
      title="Logging Configuration"
      description="Configure logging behavior and output"
      icon={<DescriptionIcon />}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Select
            label="Log Level"
            value={config.system.logging.level}
            options={LOG_LEVELS}
            onChange={(e) =>
              onChange("system.logging.level", Number(e.target.value))
            }
            helperText="Set the verbosity of logging output"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <B4Switch
            label="Instant Flush"
            checked={config?.system?.logging?.instaflush}
            onChange={(checked: boolean) =>
              onChange("system.logging.instaflush", Boolean(checked))
            }
            description="Flush logs immediately (may impact performance)"
          />
          <B4Switch
            label="Syslog"
            checked={config?.system?.logging?.syslog}
            onChange={(checked: boolean) =>
              onChange("system.logging.syslog", Boolean(checked))
            }
            description="Enable syslog output"
          />
        </Grid>
      </Grid>
    </B4Section>
  );
};
