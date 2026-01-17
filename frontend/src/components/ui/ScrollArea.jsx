import { forwardRef } from "react";

const scrollAreaStyles = {
  root: {
    position: "relative",
    overflow: "hidden",
  },
  viewport: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    scrollbarColor: "var(--border) transparent",
  },
};

const ScrollArea = forwardRef(function ScrollArea(
  { className = "", style, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={className}
      style={{ ...scrollAreaStyles.root, ...style }}
      {...props}
    >
      <div style={scrollAreaStyles.viewport}>
        {children}
      </div>
    </div>
  );
});

export { ScrollArea };
