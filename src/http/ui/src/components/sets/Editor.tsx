import React, { useState } from "react";
import {
  Box,
  Stack,
  Button,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  AirlineStops as TcpIcon,
  Deblur as FakingIcon,
  MultipleStop as UdpIcon,
  CallSplit as FragIcon,
  Language as DomainIcon,
  Layers as LayersIcon,
  Dns as DnsIcon,
} from "@mui/icons-material";

import { B4Dialog, B4TextField } from "@b4.elements";

import { colors, button_primary, button_secondary } from "@design";
import { B4Config, B4SetConfig, SystemConfig } from "@models/Config";

import { TargetSettings } from "./Target";
import { TcpSettings } from "./Tcp";
import { UdpSettings } from "./Udp";
import { FragmentationSettings } from "./Fragmentation";
import { ImportExportSettings } from "./ImportExport";
import { DnsSettings } from "./Dns";
import { FakingSettings } from "./Faking";
import { SetStats } from "./Manager";

export interface SetEditorProps {
  open: boolean;
  settings: SystemConfig;
  set: B4SetConfig;
  config: B4Config;
  stats?: SetStats;
  isNew: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (set: B4SetConfig) => void;
}

export const SetEditor: React.FC<SetEditorProps> = ({
  open,
  set: initialSet,
  config,
  isNew,
  settings,
  stats,
  saving,
  onClose,
  onSave,
}) => {
  enum TABS {
    TARGETS = 0,
    TCP,
    UDP,
    DNS,
    FRAGMENTATION,
    FAKING,
    IMPORT_EXPORT,
  }

  const [activeTab, setActiveTab] = useState<TABS>(TABS.TARGETS);
  const [editedSet, setEditedSet] = useState<B4SetConfig | null>(initialSet);

  React.useEffect(() => {
    setEditedSet(initialSet);
    setActiveTab(0);
  }, [initialSet]);

  const handleChange = (
    field: string,
    value: string | number | boolean | string[] | number[] | null | undefined
  ) => {
    if (!editedSet) return;

    const keys = field.split(".");

    if (keys.length === 1) {
      setEditedSet({ ...editedSet, [field]: value });
    } else {
      const newConfig = { ...editedSet };
      let current: Record<string, unknown> = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as object) };
        current = current[keys[i]] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      setEditedSet(newConfig);
    }
  };

  const handleSave = () => {
    if (editedSet) {
      onSave(editedSet);
    }
  };

  const handleApplyImport = (importedSet: B4SetConfig) => {
    setEditedSet(importedSet);
    setActiveTab(TABS.TARGETS);
  };

  if (!editedSet) return null;

  const dialogContent = (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: colors.background.paper,
          borderRadius: 2,
          border: `1px solid ${colors.border.default}`,
        }}
      >
        <Box sx={{ mt: 2, p: 3 }}>
          <B4TextField
            label="Set Name"
            value={editedSet.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g., YouTube Bypass, Gaming, Streaming"
            helperText="Give this set a descriptive name"
            required
          />
        </Box>
        {/* Configuration Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${colors.border.light}`,
            "& .MuiTab-root": {
              color: colors.text.secondary,
              textTransform: "none",
              minHeight: 48,
              "&.Mui-selected": {
                color: colors.secondary,
              },
            },
            "& .MuiTabs-indicator": {
              bgcolor: colors.secondary,
            },
          }}
        >
          <Tab label="Targets" icon={<DomainIcon />} />
          <Tab label="TCP" icon={<TcpIcon />} />
          <Tab label="UDP" icon={<UdpIcon />} />
          <Tab label="DNS" icon={<DnsIcon />} />
          <Tab label="Fragmentation" icon={<FragIcon />} />
          <Tab label="Faking" icon={<FakingIcon />} />
          <Tab label="Import/Export" icon={<LayersIcon />} />
        </Tabs>
      </Paper>
      <Box>
        {/* TCP Settings */}
        <Box hidden={activeTab !== TABS.TCP}>
          <Stack spacing={2}>
            <TcpSettings config={editedSet} onChange={handleChange} />
          </Stack>
        </Box>

        {/* UDP Settings */}
        <Box hidden={activeTab !== TABS.UDP}>
          <Stack spacing={2}>
            <UdpSettings config={editedSet} onChange={handleChange} />
          </Stack>
        </Box>

        {/* DNS Settings */}
        <Box hidden={activeTab !== TABS.DNS}>
          <Stack spacing={2}>
            <DnsSettings
              config={editedSet}
              onChange={handleChange}
              ipv6={config.queue.ipv6}
            />
          </Stack>
        </Box>

        {/* Fragmentation Settings */}
        <Box hidden={activeTab !== TABS.FRAGMENTATION}>
          <Stack spacing={2}>
            <FragmentationSettings config={editedSet} onChange={handleChange} />
          </Stack>
        </Box>

        {/* Faking Settings */}
        <Box hidden={activeTab !== TABS.FAKING}>
          <Stack spacing={2}>
            <FakingSettings config={editedSet} onChange={handleChange} />
          </Stack>
        </Box>

        {/* Target Settings */}
        <Box hidden={activeTab !== TABS.TARGETS}>
          <Stack spacing={2}>
            <TargetSettings
              geo={settings.geo}
              config={editedSet}
              stats={stats}
              onChange={handleChange}
            />
          </Stack>
        </Box>

        {/* Import/Export Settings */}
        <Box hidden={activeTab !== TABS.IMPORT_EXPORT}>
          <Stack spacing={2}>
            <ImportExportSettings
              config={editedSet}
              onImport={handleApplyImport}
            />
          </Stack>
        </Box>
      </Box>
    </Stack>
  );

  return (
    <B4Dialog
      title={isNew ? "Create New Set" : `Edit Set: ${editedSet.name}`}
      open={open}
      onClose={onClose}
      icon={<LayersIcon />}
      fullWidth={true}
      maxWidth="lg"
      actions={
        <>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ ...button_secondary }}
          >
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!editedSet.name.trim() || saving}
            sx={{ ...button_primary, minWidth: 140 }}
          >
            {saving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
                Saving...
              </>
            ) : isNew ? (
              "Create Set"
            ) : (
              "Save Changes"
            )}
          </Button>
        </>
      }
    >
      {dialogContent}
    </B4Dialog>
  );
};
