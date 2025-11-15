import React, { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { colors } from "@design";
import { B4SetConfig, MAIN_SET_ID, NEW_SET_ID } from "@/models/Config";
import B4TextField from "@atoms/common/B4TextField";

interface SetSelectorProps {
  sets: B4SetConfig[];
  value: string;
  onChange: (setId: string, newSetName?: string) => void;
  label?: string;
  disabled?: boolean;
}

export const SetSelector: React.FC<SetSelectorProps> = ({
  sets,
  value,
  onChange,
  label = "Target Set",
  disabled = false,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSetName, setNewSetName] = useState("");

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewSetName("");
  };

  if (isCreating) {
    return (
      <B4TextField
        label="Set Name"
        value={newSetName}
        onChange={(e) => {
          setNewSetName(e.target.value);
          onChange(NEW_SET_ID, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && newSetName.trim()) {
            setIsCreating(false);
            setNewSetName("");
          } else if (e.key === "Escape") {
            handleCancelCreate();
          }
        }}
        autoFocus
        slotProps={{
          input: {
            endAdornment: (
              <Button
                size="small"
                onClick={() => {
                  onChange(value || MAIN_SET_ID);
                  handleCancelCreate();
                }}
                sx={{ minWidth: "auto" }}
              >
                Cancel
              </Button>
            ),
          },
        }}
        sx={{
          "& .MuiInputBase-root": {
            bgcolor: colors.background.dark,
          },
          "& fieldset": {
            borderColor: `${colors.border.default} !important`,
          },
        }}
      />
    );
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => {
          if (e.target.value === NEW_SET_ID) {
            setIsCreating(true);
          } else {
            onChange(e.target.value);
          }
        }}
        sx={{
          bgcolor: colors.background.dark,
          "& fieldset": {
            borderColor: `${colors.border.default} !important`,
          },
        }}
      >
        <MenuItem
          value={NEW_SET_ID}
          sx={{
            color: colors.primary,
            fontWeight: 600,
            borderBottom: `1px solid ${colors.border.default}`,
            "&:hover": {
              bgcolor: colors.accent.primary,
            },
          }}
        >
          <AddIcon sx={{ mr: 1, fontSize: 18 }} />
          Create New Set
        </MenuItem>
        {sets.map((set) => (
          <MenuItem key={set.id} value={set.id}>
            {set.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
