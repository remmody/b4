import React, { useState } from "react";
import {
  Box,
  Grid,
  Stack,
  Button,
  Tabs,
  Tab,
  Container,
  Paper,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Dns as DnsIcon,
  CallSplit as FragIcon,
  Language as DomainIcon,
  Layers as LayersIcon,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";

import B4Section from "@molecules/common/B4Section";
import { B4Dialog } from "@molecules/common/B4Dialog";
import B4TextField from "@atoms/common/B4TextField";
import B4Select from "@atoms/common/B4Select";
import B4Slider from "@atoms/common/B4Slider";
import B4Switch from "@atoms/common/B4Switch";

import { colors, button_primary, button_secondary, spacing } from "@design";
import { B4SetConfig, SystemConfig } from "@models/Config";

import { DomainSettings } from "@organisms/settings/Domain";

export interface SetEditorProps {
  open: boolean;
  settings: SystemConfig;
  set: B4SetConfig | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (set: B4SetConfig) => void;
}

export const SetEditor: React.FC<SetEditorProps> = ({
  open,
  set: initialSet,
  isNew,
  settings,
  onClose,
  onSave,
}) => {
  enum TABS {
    DOMAINS = 0,
    TCP,
    UDP,
    FRAGMENTATION,
    FAKING,
  }

  const [activeTab, setActiveTab] = useState<TABS>(TABS.DOMAINS);
  const [editedSet, setEditedSet] = useState<B4SetConfig | null>(initialSet);

  React.useEffect(() => {
    setEditedSet(initialSet);
    setActiveTab(0);
  }, [initialSet]);

  const handleChange = (
    field: string,
    value: string | number | boolean | string[] | null | undefined
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
          <Tab label="Domains" icon={<DomainIcon />} />
          <Tab label="TCP" icon={<SettingsIcon />} />
          <Tab label="UDP" icon={<DnsIcon />} />
          <Tab label="Fragmentation" icon={<FragIcon />} />
          <Tab label="Faking" icon={<SecurityIcon />} />
        </Tabs>
      </Paper>
      <Box>
        {/* TCP Settings */}
        <Box hidden={activeTab !== TABS.TCP}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Connection Bytes Limit"
                value={editedSet.tcp.conn_bytes_limit}
                onChange={(value) =>
                  handleChange("tcp.conn_bytes_limit", value)
                }
                min={1}
                max={100}
                step={1}
                helperText="Bytes to analyze before applying bypass"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Segment 2 Delay"
                value={editedSet.tcp.seg2delay}
                onChange={(value) => handleChange("tcp.seg2delay", value)}
                min={0}
                max={1000}
                step={10}
                valueSuffix=" ms"
                helperText="Delay between segments"
              />
            </Grid>
          </Grid>
        </Box>

        {/* UDP Settings */}
        <Box hidden={activeTab !== TABS.UDP}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Select
                label="UDP Mode"
                value={editedSet.udp.mode}
                options={[
                  { value: "drop", label: "Drop" },
                  { value: "fake", label: "Fake" },
                ]}
                onChange={(e) => handleChange("udp.mode", e.target.value)}
                helperText="UDP packet handling strategy"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Select
                label="QUIC Filter"
                value={editedSet.udp.filter_quic}
                options={[
                  { value: "disabled", label: "Disabled" },
                  { value: "all", label: "All" },
                  { value: "parse", label: "Parse" },
                ]}
                onChange={(e) =>
                  handleChange("udp.filter_quic", e.target.value)
                }
                helperText="QUIC traffic filtering"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Fake Packet Size"
                value={editedSet.udp.fake_len}
                onChange={(value) => handleChange("udp.fake_len", value)}
                min={32}
                max={1500}
                step={8}
                valueSuffix=" bytes"
                helperText="Size of fake UDP packets"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Connection Bytes Limit"
                value={editedSet.udp.conn_bytes_limit}
                onChange={(value) =>
                  handleChange("udp.conn_bytes_limit", value)
                }
                min={1}
                max={50}
                step={1}
                helperText="UDP connection bytes limit"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Fragmentation Settings */}
        <Box hidden={activeTab !== TABS.FRAGMENTATION}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Select
                label="Strategy"
                value={editedSet.fragmentation.strategy}
                options={[
                  { value: "tcp", label: "TCP Fragmentation" },
                  { value: "ip", label: "IP Fragmentation" },
                  { value: "none", label: "No Fragmentation" },
                ]}
                onChange={(e) =>
                  handleChange("fragmentation.strategy", e.target.value)
                }
                helperText="Fragmentation method"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="SNI Position"
                value={editedSet.fragmentation.sni_position}
                onChange={(value) =>
                  handleChange("fragmentation.sni_position", value)
                }
                min={0}
                max={10}
                step={1}
                helperText="Fragment position in SNI"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Switch
                label="Reverse Fragment Order"
                checked={editedSet.fragmentation.sni_reverse}
                onChange={(checked) =>
                  handleChange("fragmentation.sni_reverse", checked)
                }
                description="Send fragments in reverse order"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Switch
                label="Fragment Middle SNI"
                checked={editedSet.fragmentation.middle_sni}
                onChange={(checked) =>
                  handleChange("fragmentation.middle_sni", checked)
                }
                description="Fragment in the middle of SNI field"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Faking Settings */}
        <Box hidden={activeTab !== TABS.FAKING}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <B4Switch
                label="Enable Fake SNI"
                checked={editedSet.faking.sni}
                onChange={(checked) => handleChange("faking.sni", checked)}
                description="Send fake SNI packets to confuse DPI"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Select
                label="Strategy"
                value={editedSet.faking.strategy}
                options={[
                  { value: "ttl", label: "TTL" },
                  { value: "randseq", label: "Random Sequence" },
                  { value: "pastseq", label: "Past Sequence" },
                  { value: "tcp_check", label: "TCP Check" },
                  { value: "md5sum", label: "MD5 Sum" },
                ]}
                onChange={(e) =>
                  handleChange("faking.strategy", e.target.value)
                }
                helperText="Faking strategy"
                disabled={!editedSet.faking.sni}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Slider
                label="Fake TTL"
                value={editedSet.faking.ttl}
                onChange={(value) => handleChange("faking.ttl", value)}
                min={1}
                max={64}
                step={1}
                helperText="TTL for fake packets"
                disabled={!editedSet.faking.sni}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Domain Settings */}
        <Box hidden={activeTab !== TABS.DOMAINS}>
          <Stack spacing={2}>
            <DomainSettings
              geo={settings.geo}
              config={editedSet}
              onChange={handleChange}
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
          <Button onClick={onClose} sx={{ ...button_secondary }}>
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!editedSet.name.trim()}
            sx={{ ...button_primary }}
          >
            {isNew ? "Create Set" : "Save Changes"}
          </Button>
        </>
      }
    >
      {dialogContent}
    </B4Dialog>
  );
};
