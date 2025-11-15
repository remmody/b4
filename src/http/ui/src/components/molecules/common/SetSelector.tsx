import React, { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Box,
  Button,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { colors, button_secondary } from "@design";
import { B4SetConfig, NEW_SET_ID } from "@/models/Config";

interface SetSelectorProps {
  sets: B4SetConfig[];
  value: string;
  onChange: (setId: string) => void;
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSet = async () => {
    if (!newSetName.trim()) {
      setError("Set name cannot be empty");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/config", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }

      const config = (await response.json()) as { sets?: B4SetConfig[] };

      const newSet: B4SetConfig = {
        id: NEW_SET_ID,
        name: newSetName.trim(),
      };

      config.sets = [newSet, ...(config.sets || [])];

      const updateResponse = await fetch("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to create set");
      }

      onChange(newSet.id);
      setIsCreating(false);
      setNewSetName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create set");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewSetName("");
    setError(null);
  };

  if (isCreating) {
    return (
      <Box>
        <TextField
          fullWidth
          size="small"
          label="New Set Name"
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          error={!!error}
          helperText={error}
          disabled={creating}
          sx={{
            mb: 1,
            "& .MuiInputBase-root": {
              bgcolor: colors.background.dark,
            },
            "& fieldset": {
              borderColor: `${colors.border.default} !important`,
            },
          }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCancelCreate}
            disabled={creating}
            sx={{ ...button_secondary }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => void handleCreateSet()}
            disabled={creating || !newSetName.trim()}
            startIcon={<AddIcon />}
            sx={{
              bgcolor: colors.primary,
              "&:hover": {
                bgcolor: colors.accent.primaryHover,
              },
            }}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value)}
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
