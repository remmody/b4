import { Box, Stack, TextField } from "@mui/material";
import { ClearIcon } from "@b4.icons";
import { B4Badge, B4Switch, B4TooltipButton } from "@b4.elements";
import { colors } from "@design";

interface DomainsControlBarProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  totalCount: number;
  filteredCount: number;
  sortColumn: string | null;
  paused: boolean;
  onPauseChange: (paused: boolean) => void;
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
  onClearSort: () => void;
  onReset: () => void;
}

export const DomainsControlBar = ({
  filter,
  onFilterChange,
  totalCount,
  filteredCount,
  sortColumn,
  paused,
  showAll,
  onShowAllChange,
  onPauseChange,
  onClearSort,
  onReset,
}: DomainsControlBarProps) => {
  return (
    <Box
      sx={{
        p: 2,
        borderBottom: "1px solid",
        borderColor: colors.border.light,
        bgcolor: colors.background.control,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Filter entries (use `+` to combine, e.g. `tcp+domain2`, or `tcp+domain:exmpl1+domain:exmpl2`)"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              sx: {
                bgcolor: colors.background.dark,
                "& fieldset": {
                  borderColor: `${colors.border.default} !important`,
                },
              },
            },
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <B4Badge label={`${totalCount} connections`} />
          {filter && (
            <B4Badge label={`${filteredCount} filtered`} variant="outlined" />
          )}
          {sortColumn && (
            <B4Badge
              label={`Sorted by ${sortColumn}`}
              size="small"
              onDelete={onClearSort}
              variant="outlined"
              color="primary"
            />
          )}
        </Stack>
        <B4Switch
          label={showAll ? "All packets" : "Domains only"}
          checked={showAll}
          onChange={(checked: boolean) => onShowAllChange(checked)}
        />
        <B4Switch
          label={paused ? "Paused" : "Streaming"}
          checked={paused}
          onChange={(checked: boolean) => onPauseChange(checked)}
        />
        <B4TooltipButton
          title={"Clear Connections"}
          onClick={onReset}
          icon={<ClearIcon />}
        />
      </Stack>
    </Box>
  );
};
