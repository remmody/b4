import { useState } from "react";
import {
  Button,
  Stack,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";

import { SecurityIcon, ErrorIcon, CheckIcon, RestoreIcon } from "@b4.icons";
import { B4Alert } from "@b4.elements";
import { useConfigReset } from "@hooks/useConfig";
import { colors } from "@design";
import { B4Dialog } from "@common/B4Dialog";

interface ResetDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ResetState = "confirm" | "resetting" | "success" | "error";

export const ResetDialog = ({ open, onClose, onSuccess }: ResetDialogProps) => {
  const [state, setState] = useState<ResetState>("confirm");
  const [message, setMessage] = useState("");
  const { resetConfig } = useConfigReset();

  const handleReset = async () => {
    setState("resetting");
    setMessage("Resetting configuration...");

    const response = await resetConfig();

    if (response?.success) {
      setState("success");
      setMessage("Configuration reset successfully!");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } else {
      setState("error");
      setMessage("Failed to reset configuration");
    }
  };

  const handleClose = () => {
    if (state !== "resetting") {
      setState("confirm");
      setMessage("");
      onClose();
    }
  };

  const defaultProps = {
    title: "Reset Configuration",
    subtitle: "Restore default settings",
    icon: <RestoreIcon />,
  };

  // Dynamic dialog props based on state
  const getDialogProps = () => {
    switch (state) {
      case "confirm":
        return {
          ...defaultProps,
          title: "Restart B4 Service",
          subtitle: "System Service Management",
        };
      case "resetting":
        return {
          ...defaultProps,
          title: "Resetting Configuration",
          subtitle: "Please wait...",
          icon: <CircularProgress size={24} />,
        };
      case "success":
        return {
          ...defaultProps,
          title: "Restart Successful",
          subtitle: "Service is back online",
        };
      case "error":
        return {
          ...defaultProps,
          title: "Restart Failed",
          subtitle: "An error occurred",
          icon: <ErrorIcon />,
        };
      default:
        return {
          ...defaultProps,
        };
    }
  };

  const getDialogActions = () => {
    switch (state) {
      case "confirm":
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={() => {
                void handleReset();
              }}
              variant="contained"
              startIcon={<RestoreIcon />}
            >
              Reset to Defaults
            </Button>
          </>
        );
      case "error":
        return (
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        );

      case "success":
      default:
        return null;
    }
  };

  const getDialogContent = () => {
    switch (state) {
      case "confirm":
        return (
          <>
            <B4Alert>
              Network, DPI bypass, protocol, and logging settings will be reset
              to defaults. You may need to restart B4 for some changes to take
              effect.
            </B4Alert>
            <B4Alert severity="warning">
              This will reset all configuration to default values except:
            </B4Alert>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon sx={{ color: colors.secondary }} />
                </ListItemIcon>
                <ListItemText
                  primary="Domain Configuration"
                  secondary="All domain filters and geodata settings will be preserved"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon sx={{ color: colors.secondary }} />
                </ListItemIcon>
                <ListItemText
                  primary="Testing Configuration"
                  secondary="Checker settings and test domains will be preserved"
                />
              </ListItem>
            </List>
          </>
        );

      case "resetting":
        return (
          <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={48} sx={{ color: colors.secondary }} />
            <Typography variant="h6" sx={{ color: colors.text.primary }}>
              {message}
            </Typography>
          </Stack>
        );

      case "success":
        return (
          <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
            <CheckIcon
              sx={{
                fontSize: 64,
                color: colors.secondary,
              }}
            />
            <Typography variant="h6" sx={{ color: colors.text.primary }}>
              {message}
            </Typography>
          </Stack>
        );

      case "error":
        return (
          <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
            <ErrorIcon sx={{ fontSize: 64, color: colors.quaternary }} />
            <B4Alert severity="error">{message}</B4Alert>
          </Stack>
        );
    }
  };

  return (
    <B4Dialog
      {...getDialogProps()}
      open={open}
      onClose={handleClose}
      actions={getDialogActions()}
    >
      {getDialogContent()}
    </B4Dialog>
  );
};
