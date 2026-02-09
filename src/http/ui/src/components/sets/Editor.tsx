import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Button,
  Paper,
  CircularProgress,
  Typography,
  Fade,
} from "@mui/material";

import {
  DomainIcon,
  TcpIcon,
  UdpIcon,
  DnsIcon,
  FragIcon,
  FakingIcon,
  ImportExportIcon,
  SaveIcon,
} from "@b4.icons";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { B4Tab, B4Tabs, B4TextField } from "@b4.elements";

import { colors } from "@design";
import {
  B4Config,
  B4SetConfig,
  MAIN_SET_ID,
  SystemConfig,
} from "@models/config";

import { TargetSettings } from "./Target";
import { TcpSettings } from "./Tcp";
import { UdpSettings } from "./Udp";
import { FragmentationSettings } from "./Fragmentation";
import { ImportExportSettings } from "./ImportExport";
import { DnsSettings } from "./Dns";
import { FakingSettings } from "./Faking";
import { SetStats } from "./Manager";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({
  children,
  value,
  index,
  ...other
}: Readonly<TabPanelProps>) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`set-tabpanel-${index}`}
      aria-labelledby={`set-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in>
          <Box sx={{ pt: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

export interface SetEditorPageProps {
  settings: SystemConfig;
  set: B4SetConfig;
  config: B4Config;
  stats?: SetStats;
  isNew: boolean;
  saving: boolean;
  onSave: (set: B4SetConfig) => void;
}

export const SetEditorPage = ({
  set: initialSet,
  config,
  isNew,
  settings,
  stats,
  saving,
  onSave,
}: SetEditorPageProps) => {
  enum TABS {
    TARGETS = 0,
    TCP,
    UDP,
    DNS,
    FRAGMENTATION,
    FAKING,
    IMPORT_EXPORT,
  }

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TABS>(TABS.TARGETS);
  const [editedSet, setEditedSet] = useState<B4SetConfig | null>(initialSet);

  const mainSet = config.sets.find((s) => s.id === MAIN_SET_ID)!;

  useEffect(() => {
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

      current[keys.at(-1)!] = value;
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

  const handleBack = () => {
    navigate("/sets");
  };

  if (!editedSet) return null;

  return (
    <>
      {/* Header with tabs */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: colors.background.paper,
          borderRadius: 2,
          border: `1px solid ${colors.border.default}`,
        }}
      >
        <Box sx={{ p: 2, pb: 0 }}>
          {/* Action bar */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                size="small"
              >
                Back
              </Button>
              <B4TextField
                value={editedSet.name}
                onChange={(e) => {
                  handleChange("name", e.target.value);
                }}
                placeholder="Set name..."
                required
                size="small"
                sx={{
                  minWidth: 250,
                  "& .MuiInputBase-input": {
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  },
                }}
              />
              {isNew && (
                <Typography
                  variant="caption"
                  sx={{
                    color: colors.secondary,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  New Set
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleBack}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={
                  saving ? <CircularProgress size={16} /> : <SaveIcon />
                }
                onClick={handleSave}
                disabled={!editedSet.name.trim() || saving}
                sx={{ minWidth: 140 }}
              >
                {saving && "Saving..."}
                {!saving && isNew && "Create Set"}
                {!saving && !isNew && "Save Changes"}
              </Button>
            </Stack>
          </Stack>

          {/* Tabs */}
          <B4Tabs
            value={activeTab}
            onChange={(_, v: number) => {
              setActiveTab(v);
            }}
          >
            <B4Tab icon={<DomainIcon />} label="Targets" inline />
            <B4Tab icon={<TcpIcon />} label="TCP" inline />
            <B4Tab icon={<UdpIcon />} label="UDP" inline />
            <B4Tab icon={<DnsIcon />} label="DNS" inline />
            <B4Tab icon={<FragIcon />} label="Fragmentation" inline />
            <B4Tab icon={<FakingIcon />} label="Faking" inline />
            <B4Tab icon={<ImportExportIcon />} label="Import/Export" inline />
          </B4Tabs>
        </Box>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: "auto", pb: 2 }}>
        <TabPanel value={activeTab} index={TABS.TARGETS}>
          <TargetSettings
            geo={settings.geo}
            config={editedSet}
            stats={stats}
            onChange={handleChange}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.TCP}>
          <TcpSettings
            config={editedSet}
            main={mainSet}
            onChange={handleChange}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.UDP}>
          <UdpSettings
            config={editedSet}
            main={mainSet}
            onChange={handleChange}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.DNS}>
          <DnsSettings
            config={editedSet}
            onChange={handleChange}
            ipv6={config.queue.ipv6}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.FRAGMENTATION}>
          <FragmentationSettings config={editedSet} onChange={handleChange} />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.FAKING}>
          <FakingSettings config={editedSet} onChange={handleChange} />
        </TabPanel>

        <TabPanel value={activeTab} index={TABS.IMPORT_EXPORT}>
          <ImportExportSettings
            config={editedSet}
            onImport={handleApplyImport}
          />
        </TabPanel>
      </Box>
    </>
  );
};
