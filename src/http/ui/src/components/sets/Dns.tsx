import {
  Grid,
  Alert,
  Box,
  Typography,
  Chip,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Dns as DnsIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import { B4Section, B4Switch, B4TextField } from "@b4.elements";
import { B4SetConfig } from "@models/Config";
import { colors } from "@design";
import dns from "@assets/dns.json";

interface DnsEntry {
  name: string;
  ip: string;
  ipv6: boolean;
  desc: string;
  dnssec?: boolean;
  tags: string[];
  warn?: boolean;
}

interface DnsSettingsProps {
  config: B4SetConfig;
  ipv6: boolean;
  onChange: (field: string, value: string | boolean) => void;
}

const POPULAR_DNS = (dns as DnsEntry[]).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function DnsSettings({ config, onChange, ipv6 }: DnsSettingsProps) {
  const dns = config.dns || { enabled: false, target_dns: "" };
  const selectedServer = POPULAR_DNS.find((d) => d.ip === dns.target_dns);

  const handleServerSelect = (ip: string) => {
    onChange("dns.target_dns", ip);
  };

  return (
    <B4Section
      title="DNS Redirect"
      description="Redirect DNS queries to bypass ISP DNS poisoning"
      icon={<DnsIcon />}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            Some ISPs intercept DNS queries (especially to 8.8.8.8) and return
            fake IPs for blocked domains. DNS redirect transparently rewrites
            your DNS queries to use an unpoisoned resolver.
          </Alert>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <B4Switch
            label="Enable DNS Redirect"
            checked={dns.enabled}
            onChange={(checked: boolean) => onChange("dns.enabled", checked)}
            description="Redirect DNS queries for domains in this set to specified DNS server"
          />
        </Grid>

        {dns.enabled && (
          <>
            {/* Custom IP input */}
            <Grid size={{ xs: 12, md: 6 }}>
              <B4Switch
                label="Fragment DNS Queries"
                checked={dns.fragment_query || false}
                onChange={(checked: boolean) =>
                  onChange("dns.fragment_query", checked)
                }
                description="Split DNS packets using IP fragmentation to bypass DPI that pattern-matches domain names in queries"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <B4TextField
                label="DNS Server IP"
                value={dns.target_dns}
                onChange={(e) => onChange("dns.target_dns", e.target.value)}
                placeholder="e.g., 9.9.9.9"
                helperText="Select below or enter custom IP"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              {selectedServer && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: colors.background.paper,
                    borderRadius: 1,
                    border: `1px solid ${colors.border.default}`,
                    height: "100%",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DnsIcon sx={{ color: colors.secondary }} />
                    <Typography variant="subtitle2">
                      {selectedServer.name}
                    </Typography>
                    {selectedServer.dnssec && (
                      <Chip
                        icon={<SecurityIcon />}
                        label="DNSSEC"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          bgcolor: `${colors.tertiary}22`,
                          color: colors.tertiary,
                          "& .MuiChip-icon": {
                            fontSize: 12,
                            color: colors.tertiary,
                          },
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {selectedServer.desc}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* DNS server list */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recommended DNS Servers
              </Typography>
              <Box
                sx={{
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: 1,
                  bgcolor: colors.background.paper,
                  maxHeight: 320,
                  overflow: "auto",
                }}
              >
                <List dense disablePadding>
                  {POPULAR_DNS.filter((server) =>
                    ipv6 ? server.ipv6 : !server.ipv6
                  ).map((server) => (
                    <ListItemButton
                      key={server.ip}
                      selected={dns.target_dns === server.ip}
                      onClick={() => handleServerSelect(server.ip)}
                      sx={{
                        borderLeft: server.warn
                          ? `3px solid ${colors.quaternary}`
                          : "3px solid transparent",
                        "&.Mui-selected": {
                          bgcolor: `${colors.secondary}22`,
                          borderLeftColor: colors.secondary,
                          "&:hover": { bgcolor: `${colors.secondary}33` },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {dns.target_dns === server.ip ? (
                          <CheckIcon
                            sx={{ color: colors.secondary, fontSize: 20 }}
                          />
                        ) : server.warn ? (
                          <BlockIcon
                            sx={{ color: colors.secondary, fontSize: 20 }}
                          />
                        ) : (
                          <DnsIcon
                            sx={{ color: colors.text.secondary, fontSize: 20 }}
                          />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                color: server.warn
                                  ? colors.secondary
                                  : "inherit",
                              }}
                            >
                              {server.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {server.ip}
                            </Typography>
                            {server.tags.includes("fast") && (
                              <SpeedIcon
                                sx={{ fontSize: 14, color: colors.secondary }}
                              />
                            )}
                            {server.tags.includes("adblock") && (
                              <BlockIcon
                                sx={{ fontSize: 14, color: colors.secondary }}
                              />
                            )}
                          </Stack>
                        }
                        secondary={server.desc}
                        secondaryTypographyProps={{
                          variant: "caption",
                          sx: {
                            color: server.warn ? colors.secondary : undefined,
                          },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            </Grid>

            {/* Visual explanation */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: colors.background.paper,
                  borderRadius: 1,
                  border: `1px solid ${colors.border.default}`,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ mb: 1 }}
                >
                  HOW IT WORKS
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    label="App"
                    size="small"
                    sx={{ bgcolor: colors.accent.primary }}
                  />
                  <Typography variant="caption">→ DNS query for</Typography>
                  <Chip
                    label="instagram.com"
                    size="small"
                    sx={{
                      bgcolor: colors.accent.secondary,
                      color: colors.secondary,
                    }}
                  />
                  <Typography variant="caption">→</Typography>
                  <Chip
                    label="poisoned DNS"
                    size="small"
                    sx={{
                      bgcolor: colors.quaternary,
                      textDecoration: "line-through",
                    }}
                  />
                  <Typography variant="caption">→</Typography>
                  <Chip
                    label={dns.target_dns || "select DNS"}
                    size="small"
                    sx={{
                      bgcolor: dns.target_dns
                        ? colors.tertiary
                        : colors.accent.primary,
                    }}
                  />
                  <Typography variant="caption">→ Real IP</Typography>
                </Stack>
              </Box>
            </Grid>

            {/* Warnings */}
            {!dns.target_dns && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                  Select or enter a DNS server IP to enable redirect.
                </Alert>
              </Grid>
            )}

            {dns.target_dns === "8.8.8.8" && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                  Google DNS (8.8.8.8) is commonly poisoned by Russian ISPs.
                  Consider Quad9 (9.9.9.9) or Cloudflare (1.1.1.1) instead.
                </Alert>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </B4Section>
  );
}
