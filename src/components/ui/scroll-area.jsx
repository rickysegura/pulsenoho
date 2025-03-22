// src/components/ui/scroll-area.jsx
import React from "react";
import { cn } from "../../lib/utils";

// Simple ScrollArea implementation that doesn't require Radix UI
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-y-auto overflow-x-hidden",
        className
      )}
      {...props}
    >
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  );
});

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };