"use client";

import React, { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-[#0a0a1a]">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={closeSidebar} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <Topbar onMobileMenuToggle={openSidebar} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
