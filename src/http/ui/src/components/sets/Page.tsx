import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Box,
  Backdrop,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useSnackbar } from "@context/SnackbarProvider";
import { SetsManager, SetStats, SetWithStats } from "./Manager";
import { SetEditorPage } from "./Editor";
import { B4Config, B4SetConfig } from "@models/config";
import { useSets } from "@hooks/useSets";
import { colors } from "@design";

function createDefaultSet(setCount: number): B4SetConfig {
  return {
    id: uuidv4(),
    name: `Set ${setCount + 1}`,
    enabled: true,
    tcp: {
      conn_bytes_limit: 19,
      seg2delay: 0,
      syn_fake: false,
      syn_fake_len: 0,
      syn_ttl: 3,
      drop_sack: false,
      win: { mode: "off", values: [0, 1460, 8192, 65535] },
      desync: { mode: "off", ttl: 3, count: 3, post_desync: false },
      incoming: {
        mode: "off",
        min: 14,
        max: 14,
        fake_ttl: 3,
        fake_count: 3,
        strategy: "badsum",
      },
    } as B4SetConfig["tcp"],
    udp: {
      mode: "fake",
      fake_seq_length: 6,
      fake_len: 64,
      faking_strategy: "none",
      dport_filter: "",
      filter_quic: "disabled",
      filter_stun: true,
      conn_bytes_limit: 8,
      seg2delay: 0,
    } as B4SetConfig["udp"],
    dns: {
      enabled: false,
      target_dns: "",
      fragment_query: false,
    } as B4SetConfig["dns"],
    fragmentation: {
      strategy: "tcp",
      reverse_order: true,
      middle_sni: true,
      sni_position: 1,
      oob_position: 0,
      oob_char: 120,
      tlsrec_pos: 0,
      seq_overlap: 0,
      seq_overlap_pattern: [],
      combo: {
        extension_split: true,
        first_byte_split: true,
        shuffle_mode: "middle",
        first_delay_ms: 100,
        jitter_max_us: 2000,
        decoy_enabled: false,
        decoy_snis: ["ya.ru", "vk.com", "mail.ru"],
      },
      disorder: {
        shuffle_mode: "full",
        min_jitter_us: 1000,
        max_jitter_us: 3000,
      },
    } as B4SetConfig["fragmentation"],
    faking: {
      sni: true,
      ttl: 8,
      strategy: "pastseq",
      seq_offset: 10000,
      sni_seq_length: 1,
      sni_type: 2,
      custom_payload: "",
      payload_file: "",
      tls_mod: [] as string[],
      sni_mutation: {
        mode: "off",
        grease_count: 3,
        padding_size: 2048,
        fake_ext_count: 5,
        fake_snis: ["ya.ru", "vk.com", "max.ru"],
      },
    } as B4SetConfig["faking"],
    targets: {
      sni_domains: [],
      ip: [],
      geosite_categories: [],
      geoip_categories: [],
    } as B4SetConfig["targets"],
  };
}

interface SetEditorRouteProps {
  config: B4Config & { sets?: SetWithStats[] };
  onRefresh: () => void;
}

function SetEditorRoute({ config, onRefresh }: Readonly<SetEditorRouteProps>) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const { createSet, updateSet, loading: saving } = useSets();

  const isNew = id === "new";
  const setsData = config.sets || [];
  const sets = setsData.map((s) =>
    "set" in s ? s.set : s
  ) as B4SetConfig[];
  const setsStats = setsData.map((s) =>
    "stats" in s ? s.stats : null
  ) as (SetStats | null)[];

  const existingSet = isNew ? null : sets.find((s) => s.id === id);
  const set = isNew ? createDefaultSet(sets.length) : existingSet;

  const stats = existingSet
    ? setsStats[sets.findIndex((s) => s.id === existingSet.id)] || undefined
    : undefined;

  const handleSave = (editedSet: B4SetConfig) => {
    void (async () => {
      const result = isNew
        ? await createSet(editedSet)
        : await updateSet(editedSet);

      if (result.success) {
        showSuccess(isNew ? "Set created" : "Set updated");
        onRefresh();
        navigate("/sets");
      } else {
        showError(result.error || "Failed to save");
      }
    })();
  };

  if (!set) {
    navigate("/sets", { replace: true });
    return null;
  }

  return (
    <SetEditorPage
      settings={config.system}
      set={set}
      config={config}
      stats={stats}
      isNew={isNew}
      saving={saving}
      onSave={handleSave}
    />
  );
}

export function SetsPage() {
  const { showError } = useSnackbar();
  const [config, setConfig] = useState<
    (B4Config & { sets?: SetWithStats[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/config");
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as B4Config & {
        sets?: SetWithStats[];
      };
      setConfig(data);
    } catch {
      showError("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, [showError, setLoading]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  if (loading || !config) {
    return (
      <Backdrop open sx={{ zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress sx={{ color: colors.secondary }} />
          <Typography sx={{ color: colors.text.primary }}>
            Loading...
          </Typography>
        </Stack>
      </Backdrop>
    );
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        py: 3,
      }}
    >
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Routes>
          <Route
            index
            element={
              <SetsManager config={config} onRefresh={() => void loadConfig()} />
            }
          />
          <Route
            path=":id"
            element={
              <SetEditorRoute
                config={config}
                onRefresh={() => void loadConfig()}
              />
            }
          />
        </Routes>
      </Box>
    </Container>
  );
}
