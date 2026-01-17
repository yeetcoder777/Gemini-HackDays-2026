import { forwardRef } from "react";

const cardStyles = {
  card: {
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  header: {
    display: "grid",
    gap: "8px",
  },
  title: {
    fontWeight: 600,
    lineHeight: 1.2,
    fontSize: "18px",
  },
  description: {
    color: "var(--muted-foreground)",
    fontSize: "14px",
  },
  content: {},
  footer: {
    display: "flex",
    alignItems: "center",
  },
};

const Card = forwardRef(function Card({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.card, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

const CardHeader = forwardRef(function CardHeader({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.header, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

const CardTitle = forwardRef(function CardTitle({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.title, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

const CardDescription = forwardRef(function CardDescription({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.description, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

const CardContent = forwardRef(function CardContent({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.content, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

const CardFooter = forwardRef(function CardFooter({ className = "", style, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...cardStyles.footer, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
