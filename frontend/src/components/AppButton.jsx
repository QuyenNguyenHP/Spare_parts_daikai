import Button from "@mui/material/Button";

const loginStyle = {
  minHeight: "46px",
  padding: "12px 16px",
  borderRadius: "11px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #2f75dd, #2563eb)",
  boxShadow: "0 13px 30px rgba(37, 99, 235, 0.28)",
  "&:hover": {
    background: "linear-gradient(135deg, #2f75dd, #2563eb)",
    boxShadow: "0 17px 34px rgba(37, 99, 235, 0.38)",
    transform: "translateY(-2px)",
  },
  "&.Mui-disabled": {
    color: "#94a3b8",
    background: "#334155",
    boxShadow: "none",
  },
};

const basicStyle = {
  minHeight: "38px",
  padding: "8px 12px",
  border: "1px solid #475569",
  borderRadius: "8px",
  color: "#cbd5e1",
  background: "rgba(30, 41, 59, 0.72)",
  boxShadow: "none",
  "&:hover": {
    borderColor: "#4dd0e1",
    color: "#cffafe",
    background: "rgba(14, 116, 144, 0.2)",
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    borderColor: "#334155",
    color: "#64748b",
    background: "rgba(30, 41, 59, 0.42)",
  },
};

export default function AppButton({ children, basic = false, tone: _tone, sx, ...props }) {
  return (
    <Button
      variant={basic ? "outlined" : "contained"}
      disableElevation
      sx={[
        {
          minWidth: 0,
          fontFamily: "inherit",
          fontWeight: 500,
          lineHeight: 1.2,
          textTransform: "none",
          transition: "transform 160ms ease, box-shadow 160ms ease",
        },
        basic ? basicStyle : loginStyle,
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
      {...props}
    >
      {children}
    </Button>
  );
}
