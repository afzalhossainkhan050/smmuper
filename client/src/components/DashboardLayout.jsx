import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import CustomerSidebar from './layout/CustomerSidebar';
import CustomerTopbar from './layout/CustomerTopbar';

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('smmuper_user_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('smmuper_user_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="dashboard-layout">
      <CustomerSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div
        className={`dashboard-main ${
          isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
        }`}
      >
        <CustomerTopbar
          onToggleCollapse={toggleCollapse}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
