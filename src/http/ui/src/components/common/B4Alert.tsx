import { Grid, Alert, AlertProps } from "@mui/material";

interface B4AlertProps extends Omit<AlertProps, "severity"> {
  children: React.ReactNode;
  severity?: AlertProps["severity"];
}

export const B4Alert = ({
  children,
  severity = "info",
  ...props
}: B4AlertProps) => {
  return (
    <Grid size={{ xs: 12 }} sx={{ ...props.sx }}>
      <Alert severity={severity} {...props}>
        {children}
      </Alert>
    </Grid>
  );
};
