import React from "react";

interface PixelPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const PixelPanel: React.FC<PixelPanelProps> = ({
  children,
  className = "",
  title,
}) => {
  return (
    <div className={`blueprint-panel ${className}`}>
      {title && <div className="blueprint-title">[{title.toUpperCase()}]</div>}
      {children}
    </div>
  );
};
