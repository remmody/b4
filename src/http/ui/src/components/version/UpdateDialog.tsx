import { useState, forwardRef } from "react";
import {
  Button,
  Typography,
  Box,
  Divider,
  Stack,
  LinearProgress,
  Chip,
} from "@mui/material";

import {
  NewReleaseIcon,
  DescriptionIcon,
  OpenInNewIcon,
  CheckCircleIcon,
  CloseIcon,
  CloudDownloadIcon,
} from "@b4.icons";
import { B4Alert } from "@b4.elements";
import ReactMarkdown from "react-markdown";
import { useSystemUpdate } from "@hooks/useSystemUpdate";
import { colors } from "@design";
import { B4Dialog } from "@common/B4Dialog";

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
}

const H2Typography = forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof Typography>
>(function H2Typography(props, ref) {
  return (
    <Typography
      component="h2"
      variant="subtitle2"
      sx={{
        fontWeight: 800,
        textTransform: "uppercase",
      }}
      ref={ref}
      {...props}
    />
  );
});

export const UpdateModal = ({
  open,
  onClose,
  onDismiss,
  currentVersion,
  latestVersion,
  releaseNotes,
  releaseUrl,
  publishedAt,
}: UpdateModalProps) => {
  const { performUpdate, waitForReconnection, error } = useSystemUpdate();
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "updating" | "reconnecting" | "success" | "error"
  >("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleUpdate = async () => {
    setUpdateStatus("updating");
    setUpdateMessage("Initiating update...");

    const result = await performUpdate(latestVersion);
    if (!result?.success) {
      setUpdateStatus("error");
      setUpdateMessage(
        result?.message || error || "Failed to initiate update."
      );
      return;
    }

    setUpdateMessage("Update in progress. Waiting for service to restart...");
    setUpdateStatus("reconnecting");

    // Wait for service to come back online
    const reconnected = await waitForReconnection();

    if (reconnected) {
      setUpdateStatus("success");
      setUpdateMessage("Update completed successfully! Refreshing...");

      // Reload the page after successful update to get new version
      setTimeout(() => {
        globalThis.window.location.reload();
      }, 5000);
    } else {
      setUpdateStatus("error");
      setUpdateMessage(
        "Update may have completed but service did not restart. Please check manually."
      );
    }
  };

  const isUpdating =
    updateStatus === "updating" || updateStatus === "reconnecting";

  const defaultDialogProps = {
    title: "New Version Available",
    subtitle: `Published on ${formatDate(publishedAt)}`,
    icon: <NewReleaseIcon />,
  };
  const getDialogProps = () => {
    switch (updateStatus) {
      case "updating":
      case "reconnecting":
        return {
          ...defaultDialogProps,
          title: "Updating B4 Service",
          subtitle: "Please wait while the service is updating...",
        };
      case "success":
        return {
          ...defaultDialogProps,
          title: "Update Successful",
          subtitle: "The B4 service has been updated successfully.",
        };
      case "error":
        return {
          ...defaultDialogProps,
          title: "Update Failed",
          subtitle: "An error occurred during the update process.",
        };
      default:
        return {
          ...defaultDialogProps,
        };
    }
  };

  const dialogContent = () => {
    return (
      <>
        {getDialogPartContent()}
        {updateStatus === "idle" && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={`Current: ${currentVersion}`}
              size="small"
              sx={{
                bgcolor: colors.accent.primary,
                color: colors.text.primary,
              }}
            />
            <Chip
              label={`Latest: ${latestVersion}`}
              size="small"
              sx={{
                bgcolor: colors.accent.secondary,
                color: colors.secondary,
                fontWeight: 600,
              }}
            />
          </Stack>
        )}
        <Box
          sx={{
            maxHeight: 400,
            overflow: "auto",
            p: 2,
            bgcolor: colors.background.default,
            borderRadius: 1,
            border: `1px solid ${colors.border.default}`,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: colors.secondary,
              mb: 2,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Release Notes
          </Typography>
          <Box
            sx={{
              color: colors.text.primary,
              "& h1, & h2, & h3": {
                color: colors.secondary,
                mt: 2,
                mb: 1,
              },
              "& h1": { fontSize: "1.5rem" },
              "& h2": { fontSize: "1.25rem" },
              "& h3": { fontSize: "1.1rem" },
              "& p": {
                mb: 1,
                lineHeight: 1.6,
              },
              "& ul, & ol": {
                pl: 3,
                mb: 1,
              },
              "& li": {
                mb: 0.5,
              },
              "& code": {
                bgcolor: colors.background.paper,
                color: colors.secondary,
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontSize: "0.9em",
                fontFamily: "monospace",
              },
              "& pre": {
                bgcolor: colors.background.paper,
                p: 1.5,
                borderRadius: 1,
                overflow: "auto",
                border: `1px solid ${colors.border.default}`,
              },
              "& a": {
                color: colors.secondary,
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              },
              "& blockquote": {
                borderLeft: `4px solid ${colors.secondary}`,
                pl: 2,
                ml: 0,
                fontStyle: "italic",
                color: colors.text.secondary,
              },
            }}
          >
            <ReactMarkdown components={{ h2: H2Typography }}>
              {releaseNotes}
            </ReactMarkdown>
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: colors.border.default }} />

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<DescriptionIcon />}
            href="https://github.com/DanielLavrushin/b4/blob/main/changelog.md"
            target="_blank"
            rel="noopener noreferrer"
            disabled={isUpdating}
            sx={{
              borderColor: colors.border.default,
              color: colors.text.primary,
              "&:hover": {
                borderColor: colors.secondary,
                bgcolor: colors.accent.secondaryHover,
              },
            }}
          >
            Read Full Changelog
          </Button>
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            disabled={isUpdating}
            sx={{
              borderColor: colors.border.default,
              color: colors.text.primary,
              "&:hover": {
                borderColor: colors.secondary,
                bgcolor: colors.accent.secondaryHover,
              },
            }}
          >
            View on GitHub
          </Button>
        </Stack>
      </>
    );
  };
  const getDialogPartContent = () => {
    switch (updateStatus) {
      case "updating":
      case "reconnecting":
        return (
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ mt: 2 }} />
          </Box>
        );
      case "success":
        return (
          <B4Alert
            severity={updateStatus}
            sx={{ bgcolor: colors.accent.secondary }}
            icon={<CheckCircleIcon />}
          >
            {updateMessage}
          </B4Alert>
        );
      case "error":
        return (
          <B4Alert
            severity={updateStatus}
            sx={{
              bgcolor: colors.accent.primary,
              color: colors.text.primary,
            }}
            icon={<CheckCircleIcon />}
          >
            {updateMessage}
          </B4Alert>
        );
      case "idle":
      default:
        return null;
    }
  };

  const dialogActions = () => {
    return (
      <>
        <Button
          onClick={onDismiss}
          startIcon={<CloseIcon />}
          disabled={isUpdating}
        >
          Don't Show Again for This Version
        </Button>
        <Box sx={{ flex: 1 }} />
        {updateStatus === "idle" && (
          <>
            <Button onClick={onClose} variant="outlined" disabled={isUpdating}>
              Remind Me Later
            </Button>
            <Button
              onClick={() => {
                void handleUpdate();
              }}
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              disabled={isUpdating}
            >
              Update Now
            </Button>
          </>
        )}
        {updateStatus === "success" && (
          <Button
            variant="contained"
            onClick={() => globalThis.window.location.reload()}
          >
            Reload Page
          </Button>
        )}
      </>
    );
  };

  return (
    <B4Dialog
      {...getDialogProps()}
      open={open}
      onClose={isUpdating ? () => {} : onClose}
      actions={dialogActions()}
      maxWidth="lg"
    >
      {dialogContent()}
    </B4Dialog>
  );
};
