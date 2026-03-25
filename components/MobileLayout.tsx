"use client";

import { useState } from "react";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export function MobileLayout({ sidebar, main }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="layout-root">
      {/* Toggle button — mobile only */}
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close panel" : "Open panel"}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Backdrop — mobile only, when open */}
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      <aside className={`layout-sidebar ${open ? "open" : ""}`}>
        {sidebar}
      </aside>
      <main className="layout-main">
        {main}
      </main>
    </div>
  );
}
