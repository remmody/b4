import React from "react";
import { Alert } from "@mui/material";
import { ToggleOn as ToggleOnIcon } from "@mui/icons-material";
import SettingSection from "@molecules/common/B4Section";
import SettingSwitch from "@atoms/common/B4Switch";
import { B4Config } from "@models/Config";
import { B4FormGroup } from "@/components/molecules/common/B4FormGroup";
import { B4Slider } from "@/components/atoms/common/B4Slider";

interface FeatureSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean | string | number) => void;
}

export const FeatureSettings: React.FC<FeatureSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <SettingSection
      title="Feature Flags"
      description="Enable or disable advanced features"
      icon={<ToggleOnIcon />}
    >
      <B4FormGroup label="Proto Features" columns={2}>
        <SettingSwitch
          label="Enable IPv4 Support"
          checked={config.queue.ipv4}
          onChange={(checked: boolean) => onChange("queue.ipv4", checked)}
          description="Enable IPv4 support"
        />
        <SettingSwitch
          label="Enable IPv6 Support"
          checked={config.queue.ipv6}
          onChange={(checked: boolean) => onChange("queue.ipv6", checked)}
          description="Enable IPv6 support"
        />
      </B4FormGroup>
      <B4FormGroup label="Firewall Features" columns={2}>
        <SettingSwitch
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
    </SettingSection>
  );
};
