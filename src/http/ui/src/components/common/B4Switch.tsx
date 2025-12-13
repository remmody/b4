import React from "react";
import {
  FormControlLabel,
  Switch,
  SwitchProps,
  Typography,
  Box,
} from "@mui/material";
import { colors } from "@design";

interface B4SwitchProps extends Omit<SwitchProps, "checked" | "onChange"> {
  label: string;
  checked: boolean;
  description?: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const B4Switch = ({
  label,
  checked,
  description,
  onChange,
  disabled,
  ...props
}: B4SwitchProps) => {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange(e.target.checked)
            }
            disabled={disabled}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: colors.secondary,
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: colors.secondary,
              },
            }}
            {...props}
          />
        }
        label={
          <Typography sx={{ color: colors.text.primary, fontWeight: 500 }}>
            {label}
          </Typography>
        }
      />
      {description && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: colors.text.secondary,
            ml: 6,
            mt: -1,
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};

export default B4Switch;
