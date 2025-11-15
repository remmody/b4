import React from "react";
import {
  Button,
  Alert,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Radio,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DomainIcon from "@mui/icons-material/Language";
import { colors, button_primary, button_secondary } from "@design";
import { B4Dialog } from "@molecules/common/B4Dialog";
import { B4Badge } from "@/components/atoms/common/B4Badge";
import { B4SetConfig, MAIN_SET_ID } from "@/models/Config";
import { SetSelector } from "@molecules/common/SetSelector";

interface AddIpModalProps {
  open: boolean;
  ip: string;
  variants: string[];
  sets: B4SetConfig[];
  selected: string;
  onClose: () => void;
  onSelectVariant: (variant: string) => void;
  onAdd: (setId: string) => void;
}

export const AddIpModal: React.FC<AddIpModalProps> = ({
  open,
  ip,
  sets,
  variants,
  selected,
  onClose,
  onSelectVariant,
  onAdd,
}) => {
  const [selectedSetId, setSelectedSetId] = React.useState<string>("");
  const handleAdd = () => {
    onAdd(selectedSetId);
  };

  React.useEffect(() => {
    if (open && sets.length > 0) {
      setSelectedSetId(MAIN_SET_ID);
    }
  }, [open, sets]);

  return (
    <B4Dialog
      title="Add IP/CIDR to Manual List"
      icon={<DomainIcon />}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ ...button_secondary }}
          >
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={handleAdd}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!selected}
            sx={{
              ...button_primary,
            }}
          >
            Add IP/CIDR
          </Button>
        </>
      }
    >
      <>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select the desired IP or CIDR range to add to the Manual List.{" "}
          {variants.length} variants are available based on specificity.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Original IP: <B4Badge label={ip} badgeVariant="secondary" />
        </Typography>
        {sets.length > 0 && (
          <SetSelector
            sets={sets}
            value={selectedSetId}
            onChange={setSelectedSetId}
          />
        )}
        <List>
          {variants.map((variant) => (
            <ListItem key={variant} disablePadding>
              <ListItemButton
                onClick={() => onSelectVariant(variant)}
                selected={selected === variant}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: colors.accent.primary,
                    "&:hover": {
                      bgcolor: colors.accent.primaryHover,
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <Radio
                    checked={selected === variant}
                    sx={{
                      color: colors.border.default,
                      "&.Mui-checked": {
                        color: colors.primary,
                      },
                    }}
                  />
                </ListItemIcon>
                {(() => {
                  let secondaryText: string;
                  const [baseIp, cidr] = variant.split("/");

                  if (cidr === "32" || cidr === "128") {
                    secondaryText = "Single IP - exact match only";
                  } else if (cidr === "24") {
                    const base = baseIp.substring(0, baseIp.lastIndexOf("."));
                    secondaryText = `~256 IPs - local subnet (${base}.0-255)`;
                  } else if (cidr === "16") {
                    const base = baseIp.substring(0, baseIp.lastIndexOf("."));
                    const prefix = base.substring(0, base.lastIndexOf("."));
                    secondaryText = `~65K IPs - network block (${prefix}.0.0-255.255)`;
                  } else if (cidr === "8") {
                    const first = baseIp.split(".")[0];
                    secondaryText = `~16M IPs - entire class A (${first}.0.0.0-255.255.255)`;
                  } else if (cidr === "64") {
                    secondaryText = "IPv6 subnet - standard network";
                  } else if (cidr === "48") {
                    secondaryText = "IPv6 site - organization range";
                  } else {
                    secondaryText = "IPv6 ISP/large organization range";
                  }
                  return (
                    <ListItemText primary={variant} secondary={secondaryText} />
                  );
                })()}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </>
    </B4Dialog>
  );
};
