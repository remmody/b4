import { Snackbar } from "@mui/material";
import { B4Alert } from "@b4.elements";

export interface B4SnackbarProps {
  open: boolean;
  message: string;
  severity: "error" | "warning" | "info" | "success";
}

export function B4Snackbar({ ...snackbar }: Readonly<B4SnackbarProps>) {
  function handleClose() {
    snackbar.open = false;
  }

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <B4Alert onClose={handleClose} severity={snackbar.severity}>
        {snackbar.message}
      </B4Alert>
    </Snackbar>
  );
}
