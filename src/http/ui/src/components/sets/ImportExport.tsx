import { useState, useEffect } from "react";
import { Box, Button, Stack } from "@mui/material";
import { ImportExportIcon, RefreshIcon } from "@b4.icons";
import { B4Alert, B4Section, B4TextField } from "@b4.elements";

import { B4SetConfig } from "@models/Config";

interface ImportExportSettingsProps {
  config: B4SetConfig;
  onImport: (importedConfig: B4SetConfig) => void;
}

export const ImportExportSettings = ({
  config,
  onImport,
}: ImportExportSettingsProps) => {
  const [jsonValue, setJsonValue] = useState("");
  const [originalJson, setOriginalJson] = useState("");
  const [validationError, setValidationError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const formatted = JSON.stringify(config, null, 0);
    setJsonValue(formatted);
    setOriginalJson(formatted);
    setValidationError("");
    setHasChanges(false);
  }, [config]);

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setHasChanges(value !== originalJson);
    setValidationError("");
  };

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(jsonValue) as B4SetConfig;

      // Validate required fields
      if (
        !parsed.name ||
        !parsed.tcp ||
        !parsed.udp ||
        !parsed.fragmentation ||
        !parsed.faking ||
        !parsed.targets
      ) {
        setValidationError(
          "Invalid set configuration: missing required fields"
        );
        return null;
      }

      setValidationError("");
      return parsed;
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Invalid JSON format"
      );
      return null;
    }
  };

  const handleApply = () => {
    const validated = handleValidate();
    if (validated) {
      // Preserve the original ID
      validated.id = config.id;
      onImport(validated);
    }
  };

  const handleReset = () => {
    setJsonValue(originalJson);
    setHasChanges(false);
    setValidationError("");
  };

  return (
    <B4Section
      title="Import/Export Set configuration"
      icon={<ImportExportIcon />}
    >
      <B4Alert severity="info" sx={{ mb: 2 }}>
        You can export the current set configuration as JSON, or import a new
        configuration by pasting valid JSON below.
      </B4Alert>
      <Stack spacing={2}>
        <B4TextField
          label="Set Configuration JSON"
          value={jsonValue}
          onChange={(e) => handleJsonChange(e.target.value)}
          multiline
          rows={10}
          helperText="Edit directly or paste a configuration. Changes must be applied to take effect."
        />

        {validationError && (
          <B4Alert severity="error">{validationError}</B4Alert>
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!hasChanges}
          >
            Apply Changes
          </Button>
        </Box>
      </Stack>
    </B4Section>
  );
};
