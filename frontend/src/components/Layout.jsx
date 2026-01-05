import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 btn btn-square btn-neutral"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      </div>

      {/* Sidebar - Mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 h-full">
            <Sidebar collapsed={false} setCollapsed={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 min-h-screen overflow-auto">
        <div className="lg:hidden h-12" /> {/* Spacer for mobile menu button */}
        <Outlet />
      </main>
    </div>
  );
}
