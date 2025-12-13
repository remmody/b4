import React, { useState } from "react";
import { Button, Grid } from "@mui/material";
import SettingSection from "@common/B4Section";
import {
  RestartAlt as RestartIcon,
  Hub as ControlIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import { RestartDialog } from "./RestartDialog";
import { colors, spacing } from "@design";
import { ResetDialog } from "./ResetDialog";

interface ControlSettingsProps {
  loadConfig: () => void;
}

export const ControlSettings = ({ loadConfig }: ControlSettingsProps) => {
  const [saving] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetSuccess = () => {
    loadConfig();
  };

  return (
    <SettingSection
      title="Core Controls"
      description="Control core service and config operations"
      icon={<ControlIcon />}
    >
      <Grid container spacing={spacing.lg}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartIcon />}
          onClick={() => setShowRestartDialog(true)}
          disabled={saving}
          sx={{
            borderColor: colors.secondary,
            color: colors.secondary,
            "&:hover": {
              borderColor: colors.primary,
              bgcolor: colors.accent.primaryHover,
            },
          }}
        >
          Restart B4 System Service
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={() => setShowResetDialog(true)}
          disabled={saving}
          sx={{
            borderColor: colors.primary,
            color: colors.primary,
            "&:hover": {
              borderColor: "#d32f2f",
              bgcolor: `${colors.primary}22`,
            },
          }}
        >
          Reset the configuration to default settings
        </Button>
      </Grid>

      <RestartDialog
        open={showRestartDialog}
        onClose={() => setShowRestartDialog(false)}
      />

      <ResetDialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onSuccess={handleResetSuccess}
      />
    </SettingSection>
  );
};
