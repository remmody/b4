import { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  ThemeProvider,
  Divider,
  Badge,
} from "@mui/material";

import {
  MenuIcon,
  DiscoveryIcon,
  SetsIcon,
  DashboardIcon,
  LogsIcon,
  CoreIcon,
  ConnectionIcon,
} from "@b4.icons";
import { theme, colors } from "@design";

import { Logo } from "@common/Logo";
import Version from "@components/version/Version";

import { useWebSocket } from "./context/B4WsProvider";

import { SetsPage } from "@b4.sets";
import { DiscoveryPage } from "@b4.discovery";
import { ConnectionsPage } from "@b4.connections";
import { SettingsPage } from "@b4.settings";
import { LogsPage } from "@b4.logs";
import { DashboardPage } from "@b4.dashboard";
import { SnackbarProvider } from "@context/SnackbarProvider";

const DRAWER_WIDTH = 240;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { path: "/sets", label: "Sets", icon: <SetsIcon /> },
  { path: "/discovery", label: "Discovery", icon: <DiscoveryIcon /> },
  { path: "/connections", label: "Connections", icon: <ConnectionIcon /> },
  { path: "/logs", label: "Logs", icon: <LogsIcon /> },
  { path: "/settings", label: "Settings", icon: <CoreIcon /> },
];

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { unseenDomainsCount, resetDomainsBadge } = useWebSocket();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "System Dashboard";
    if (path.startsWith("/sets")) return "Sets";
    if (path.startsWith("/connections")) return "Connections";
    if (path.startsWith("/test")) return "DPI Bypass Test";
    if (path.startsWith("/logs")) return "Log Viewer";
    if (path.startsWith("/settings")) return "Settings";
    return "B4";
  };

  const isNavItemSelected = (navPath: string) => {
    if (navPath === "/settings" || navPath === "/sets") {
      return location.pathname.startsWith(navPath);
    }
    return location.pathname === navPath;
  };

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <CssBaseline />
        <Box sx={{ display: "flex", height: "100vh" }}>
          <Drawer
            variant="persistent"
            open={drawerOpen}
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
              },
            }}
          >
            <Toolbar>
              <Logo />
            </Toolbar>
            <Divider sx={{ borderColor: colors.border.default }} />
            <List>
              {navItems.map((item) => {
                let targetCount = 0;
                if (item.path === "/connections" && unseenDomainsCount > 0) {
                  targetCount = unseenDomainsCount;
                }

                return (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={isNavItemSelected(item.path)}
                      onClick={() => {
                        if (item.path === "/connections") {
                          resetDomainsBadge();
                        }
                        navigate(item.path);
                      }}
                      sx={{
                        "&.Mui-selected": {
                          backgroundColor: colors.accent.primary,
                          "&:hover": {
                            backgroundColor: colors.accent.primaryHover,
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: "inherit" }}>
                        {targetCount > 0 ? (
                          <Badge
                            badgeContent={targetCount}
                            color="secondary"
                            max={999}
                          >
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            <Box sx={{ flexGrow: 1 }} />
            <Version />
          </Drawer>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              height: "100vh",
              ml: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            }}
          >
            <AppBar position="static" elevation={0}>
              <Toolbar>
                <IconButton
                  color="inherit"
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  edge="start"
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                  {getPageTitle()}
                </Typography>
              </Toolbar>
            </AppBar>

            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sets/*" element={<SetsPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/discovery" element={<DiscoveryPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/settings/*" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
