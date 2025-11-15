import React, { useEffect, useState } from "react";
import { Button, Alert, Box, CircularProgress } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { B4Dialog } from "@molecules/common/B4Dialog";
import { button_secondary } from "@/design";

interface BdcModalProps {
  open: boolean;
  ip: string;
  token: string;
  onClose: () => void;
}

export const BdcModal: React.FC<BdcModalProps> = ({
  open,
  ip,
  token,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ip || !token) return;
  }, [open, ip, token]);

  return (
    <B4Dialog
      title="Big Data Cloud Information"
      icon={<InfoIcon />}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ ...button_secondary }}
          >
            Close
          </Button>
        </>
      }
    >
      <>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </>
    </B4Dialog>
  );
};
