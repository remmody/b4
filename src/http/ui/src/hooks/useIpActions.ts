import { useState, useCallback } from "react";

interface IpModalState {
  open: boolean;
  ip: string;
  variants: string[];
  selected: string | string[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export function useIpActions() {
  const [modalState, setModalState] = useState<IpModalState>({
    open: false,
    ip: "",
    variants: [],
    selected: "",
  });

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const openModal = useCallback((ip: string, variants: string[]) => {
    ip = ip.split(":")[0]; // Remove port if present

    setModalState({
      open: true,
      ip,
      variants,
      selected: variants[0] || ip,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      open: false,
      ip: "",
      variants: [],
      selected: "",
    });
  }, []);

  const selectVariant = useCallback((variant: string) => {
    setModalState((prev) => ({ ...prev, selected: variant }));
  }, []);

  const addIp = useCallback(
    async (setId: string) => {
      if (!modalState.selected) return;

      try {
        const response = await fetch("/api/geoip", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cidr: Array.isArray(modalState.selected)
              ? modalState.selected
              : [modalState.selected],
            set_id: setId,
          }),
        });

        if (response.ok) {
          setSnackbar({
            open: true,
            message: `Successfully added "${
              Array.isArray(modalState.selected)
                ? modalState.selected.length + " IPs"
                : modalState.selected
            }" to manual ips`,
            severity: "success",
          });
          closeModal();
        } else {
          const error = (await response.json()) as { message: string };
          setSnackbar({
            open: true,
            message: `Failed to add ip: ${error.message}`,
            severity: "error",
          });
        }
      } catch (error) {
        setSnackbar({
          open: true,
          message: `Error adding ip: ${String(error)}`,
          severity: "error",
        });
      }
    },
    [modalState.selected, closeModal]
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    modalState,
    snackbar,
    openModal,
    closeModal,
    selectVariant,
    addIp,
    closeSnackbar,
  };
}
