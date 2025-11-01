import React from "react";
import { Grid } from "@mui/material";
import { ToggleOn as ToggleOnIcon } from "@mui/icons-material";
import SettingSection from "../../molecules/common/B4Section";
import SettingSwitch from "../../atoms/common/B4Switch";
import B4Config from "../../../models/Config";

interface FeatureSettingsProps {
  config: B4Config;
  onChange: (field: string, value: boolean) => void;
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
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SettingSwitch
            label="Enable IPv4 Support"
            checked={config.ipv4}
            onChange={(checked) => onChange("ipv4", checked)}
            description="Enable IPv4 support"
          />
          <SettingSwitch
            label="Enable IPv6 Support"
            checked={config.ipv6}
            onChange={(checked) => onChange("ipv6", checked)}
            description="Enable IPv6 support"
          />
          <SettingSwitch
            label="Skip IPTables/NFTables Setup"
            checked={config.skip_tables}
            onChange={(checked) => onChange("skip_tables", checked)}
            description="Skip automatic IPTables/NFTables rules configuration"
          />
        </Grid>
      </Grid>
    </SettingSection>
  );
};
