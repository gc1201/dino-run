"use client";

import { useState, useCallback, memo } from "react";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

const Main = memo(function Main({ children }: { children: React.ReactNode }) {
  return <main className="layout-main">{children}</main>;
});

export function AppLayout({ sidebar, main }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="layout-root">
      <button
        className="sidebar-toggle"
        onClick={toggle}
        aria-label={open ? "Close panel" : "Open panel"}
      >
        {open ? "✕" : "☰"}
      </button>

      <div
        className={`sidebar-backdrop ${open ? "visible" : ""}`}
        onClick={close}
        role="button"
        aria-label="Close sidebar"
        tabIndex={-1}
      />

      <aside className={`layout-sidebar ${open ? "open" : ""}`}>
        {sidebar}
      </aside>
      <Main>{main}</Main>
    </div>
  );
}
