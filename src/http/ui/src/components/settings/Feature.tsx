import { Alert } from "@mui/material";
import { ToggleOn as ToggleOnIcon } from "@mui/icons-material";
import { B4Config } from "@models/Config";
import { B4Slider, B4FormGroup, B4Section, B4Switch } from "@b4.elements";

interface FeatureSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean | string | number) => void;
}

export const FeatureSettings = ({ config, onChange }: FeatureSettingsProps) => {
  return (
    <B4Section
      title="Feature Flags"
      description="Enable or disable advanced features"
      icon={<ToggleOnIcon />}
    >
      <B4FormGroup label="Proto Features" columns={2}>
        <B4Switch
          label="Enable IPv4 Support"
          checked={config.queue.ipv4}
          onChange={(checked: boolean) => onChange("queue.ipv4", checked)}
          description="Enable IPv4 support"
        />
        <B4Switch
          label="Enable IPv6 Support"
          checked={config.queue.ipv6}
          onChange={(checked: boolean) => onChange("queue.ipv6", checked)}
          description="Enable IPv6 support"
        />
      </B4FormGroup>
      <B4FormGroup label="Firewall Features" columns={2}>
        <B4Switch
          label="Skip IPTables/NFTables Setup"
          checked={config.system.tables.skip_setup}
          onChange={(checked: boolean) =>
            onChange("system.tables.skip_setup", checked)
          }
          description="Skip automatic IPTables/NFTables rules configuration"
        />
        <B4Slider
          label="Firewall Monitor Interval in seconds (default 10s)"
          value={config.system.tables.monitor_interval}
          onChange={(value: number) =>
            onChange("system.tables.monitor_interval", value)
          }
          min={0}
          max={120}
          step={5}
          helperText="Interval for monitoring B4 iptables/nftables rules"
          alert={
            config.system.tables.monitor_interval <= 0 && (
              <Alert severity="warning">
                Warning: This <strong>disables</strong> automatic monitoring of
                B4 iptables/nftables
              </Alert>
            )
          }
        />
      </B4FormGroup>
    </B4Section>
  );
};
