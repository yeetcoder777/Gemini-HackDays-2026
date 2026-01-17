import { forwardRef } from "react";

const buttonStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s",
    cursor: "pointer",
    border: "none",
    outline: "none",
  },
  variants: {
    default: {
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
    },
    outline: {
      backgroundColor: "transparent",
      border: "1px solid var(--border)",
      color: "var(--foreground)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--foreground)",
    },
    secondary: {
      backgroundColor: "var(--secondary)",
      color: "var(--secondary-foreground)",
    },
  },
  sizes: {
    default: {
      height: "36px",
      padding: "8px 16px",
    },
    sm: {
      height: "32px",
      padding: "6px 12px",
      fontSize: "13px",
    },
    lg: {
      height: "40px",
      padding: "10px 24px",
    },
    icon: {
      height: "36px",
      width: "36px",
      padding: "0",
    },
  },
  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    pointerEvents: "none",
  },
};

const Button = forwardRef(function Button(
  { className = "", variant = "default", size = "default", disabled, style, children, ...props },
  ref
) {
  const combinedStyle = {
    ...buttonStyles.base,
    ...buttonStyles.variants[variant],
    ...buttonStyles.sizes[size],
    ...(disabled ? buttonStyles.disabled : {}),
    ...style,
  };

  return (
    <button
      ref={ref}
      className={className}
      style={combinedStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

export { Button };
