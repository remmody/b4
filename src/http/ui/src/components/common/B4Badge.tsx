import { Chip, ChipProps } from "@mui/material";

interface B4BadgeProps extends Omit<ChipProps, "color" | "variant"> {
  color?: "default" | "primary" | "secondary" | "info" | "error";
  variant?: "filled" | "outlined";
}

export const B4Badge = ({ sx, ...props }: B4BadgeProps) => (
  <Chip
    size="small"
    sx={{
      px: 0.5,
      ...sx,
    }}
    {...props}
  />
);
