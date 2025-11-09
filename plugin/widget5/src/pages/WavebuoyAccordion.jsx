import React from "react";

export default function WavebuoyAccordion() {
  return (
    <div style={{ 
      fontSize: "0.95em", 
      color: "var(--color-text)" 
    }}>
      <div>
        Source: <a 
          href="https://opmgeoserver.gem.spc.int" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: "var(--color-primary)" }}
        >
          https://opmgeoserver.gem.spc.int
        </a>
      </div>
    </div>
  );
}