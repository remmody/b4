import React from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
} from "@mui/material";

export default function Settings() {
  const [maxLines, setMaxLines] = React.useState("1000");
  const [autoReconnect, setAutoReconnect] = React.useState(true);
  const [timestampFormat, setTimestampFormat] = React.useState("ISO");

  return (
    <Container
      maxWidth="md"
      sx={{
        flex: 1,
        py: 3,
        px: 3,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      <Paper elevation={0} variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#F5AD18", mb: 3 }}>
          Settings
        </Typography>

        <Stack spacing={3}></Stack>
        <Typography>Under Development...</Typography>
      </Paper>
    </Container>
  );
}
