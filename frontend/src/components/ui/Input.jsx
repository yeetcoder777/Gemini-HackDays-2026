import { forwardRef } from "react";

const inputStyles = {
  base: {
    height: "36px",
    width: "100%",
    minWidth: 0,
    borderRadius: "6px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--input)",
    padding: "8px 12px",
    fontSize: "14px",
    color: "var(--foreground)",
    outline: "none",
    transition: "box-shadow 0.2s, border-color 0.2s",
  },
  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};

const Input = forwardRef(function Input(
  { className = "", style, disabled, ...props },
  ref
) {
  const combinedStyle = {
    ...inputStyles.base,
    ...(disabled ? inputStyles.disabled : {}),
    ...style,
  };

  return (
    <input
      ref={ref}
      className={className}
      style={combinedStyle}
      disabled={disabled}
      {...props}
    />
  );
});

export { Input };
