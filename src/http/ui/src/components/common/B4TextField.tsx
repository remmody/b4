import { TextField, TextFieldProps } from "@mui/material";
import { colors } from "@design";

interface B4TextFieldProps extends Omit<TextFieldProps, "variant"> {
  helperText?: React.ReactNode;
}

export const B4TextField = ({ helperText, ...props }: B4TextFieldProps) => {
  return (
    <TextField
      {...props}
      variant="outlined"
      size="small"
      fullWidth
      helperText={helperText}
      sx={{
        "& .MuiOutlinedInput-root": {
          bgcolor: colors.background.dark,
          borderColor: colors.border.medium,
          "&:hover fieldset": {
            borderColor: colors.border.medium,
          },
          "&.Mui-focused fieldset": {
            borderColor: colors.secondary,
          },
        },

        "& .MuiFormHelperText-root": {
          m: 0,
        },
        ...props.sx,
      }}
    />
  );
};

export default B4TextField;
