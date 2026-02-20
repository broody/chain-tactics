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
    <div className={`blueprint-panel scanline-anim ${className}`}>
      {/* Decorative Corner SVG */}
      <svg
        className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 1H39V40" stroke="white" strokeWidth="1" />
        <circle cx="39" cy="1" r="2" fill="white" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 p-1 opacity-20 pointer-events-none"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M40 39H1V0" stroke="white" strokeWidth="1" />
        <circle cx="1" cy="39" r="2" fill="white" />
      </svg>

      {title && <div className="blueprint-title">[{title.toUpperCase()}]</div>}
      {children}
    </div>
  );
};
