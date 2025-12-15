import { createTheme } from "@mui/material";
import { colors } from "./tokens";
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: colors.primary },
    secondary: { main: colors.secondary },
    info: { main: colors.tertiary },
    error: { main: colors.quaternary },
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Custom scrollbar styles
          "*::-webkit-scrollbar": {
            width: "12px",
            height: "12px",
          },
          "*::-webkit-scrollbar-track": {
            background: colors.background.default,
            borderRadius: "6px",
          },
          "*::-webkit-scrollbar-thumb": {
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.tertiary} 50%, ${colors.quaternary} 100%)`,
            borderRadius: "6px",
            border: `2px solid ${colors.background.default}`,
            "&:hover": {
              background: `linear-gradient(180deg, ${colors.secondary} 0%, ${colors.primary} 50%, ${colors.tertiary} 100%)`,
            },
          },
          "*::-webkit-scrollbar-thumb:active": {
            background: colors.secondary,
          },
          // Firefox scrollbar
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: `${colors.primary} ${colors.background.default}`,
          },
        },
        a: {
          color: colors.secondary,
          textDecoration: "none",
          "&:hover": {
            textDecoration: "none",
            color: colors.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          backgroundColor: colors.accent.secondaryHover,
          color: colors.text.primary,
        },
        outlinedPrimary: {
          borderColor: colors.primary,
          backgroundColor: colors.background.paper,
        },
        outlinedSecondary: {
          borderColor: colors.secondary,
          backgroundColor: colors.accent.secondaryHover,
          color: colors.text.secondary,
        },
        filledPrimary: {
          backgroundColor: colors.primary,
          color: colors.text.primary,
        },
        filledSecondary: {
          backgroundColor: colors.secondary,
          color: colors.background.default,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          "&:disabled": {
            color: colors.text.disabled,
          },
        },
        textPrimary: {
          color: colors.text.primary,
          backgroundColor: "unset",
          "&:hover": {
            backgroundColor: colors.accent.primaryHover,
          },
          "&:disabled": {
            color: colors.text.disabled,
          },
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: colors.text.primary,
          "&:hover": {
            backgroundColor: colors.secondary,
            color: colors.text.tertiary,
          },
          "&:disabled": {
            borderColor: colors.primary,
            backgroundColor: colors.accent.primary,
          },
        },
        outlinedPrimary: {
          borderColor: colors.primary,
          backgroundColor: colors.accent.primaryHover,
          color: colors.text.primary,
          "&:hover": {
            borderColor: colors.secondary,
            backgroundColor: colors.accent.secondaryHover,
            color: colors.text.secondary,
          },
          "&:disabled": {
            borderColor: colors.accent.primary,
          },
        },
        outlinedSecondary: {
          borderColor: colors.secondary,
          backgroundColor: colors.accent.secondaryHover,
          color: colors.text.secondary,
          "&:hover": {
            borderColor: colors.primary,
            backgroundColor: colors.accent.primaryHover,
            color: colors.text.primary,
          },
          "&:disabled": {
            borderColor: colors.accent.secondary,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(90deg, ${colors.quaternary} 0%, ${colors.tertiary} 35%, ${colors.primary} 70%, ${colors.secondary} 100%)`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderColor: colors.border.default,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.paper,
          borderRight: `1px solid ${colors.border.default}`,
        },
      },
    },
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", Arial',
  },
});
