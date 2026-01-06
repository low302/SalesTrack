import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  BarChart3,
  UsersRound,
  Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [salesTeamOpen, setSalesTeamOpen] = useState(() => {
    // Auto-open if we're on a sales team page
    return location.pathname.startsWith('/salespeople');
  });

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sales', icon: Car, label: 'Sales' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  const salesTeamItems = [
    { to: '/salespeople', icon: Users, label: 'Salespeople' },
    { to: '/teams', icon: Trophy, label: 'Team Management' },
  ];

  const adminItems = [
    { to: '/users', icon: UserCog, label: 'Users', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];

  // Check if any sales team route is active
  const isSalesTeamActive = salesTeamItems.some(item => location.pathname === item.to);

  const renderNavItem = (item) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg transition-colors py-3 ${isActive
            ? 'bg-primary text-white font-medium'
            : 'hover:bg-neutral-content/10'
          } ${collapsed ? 'justify-center px-2' : 'px-4'}`
        }
        style={({ isActive }) => isActive ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
        title={collapsed ? item.label : undefined}
      >
        <item.icon size={20} />
        {!collapsed && <span className="animate-slide-in">{item.label}</span>}
      </NavLink>
    </li>
  );

  return (
    <aside
      className={`bg-neutral text-neutral-content h-full flex flex-col transition-all duration-300 ${collapsed ? 'w-18' : 'w-64'
        }`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-content/10">
        {!collapsed && (
          <div className="animate-slide-in">
            <h1 className="text-lg font-bold text-primary">Brandon Tomes Subaru</h1>
            <p className="text-xs opacity-70">Sales Tracker</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn btn-ghost btn-sm btn-square"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* User Info */}
      <div className={`p-4 border-b border-neutral-content/10 ${collapsed ? 'text-center' : ''}`}>
        <div className="avatar placeholder">
          <div className="bg-primary text-primary-content rounded-full w-10">
            <span className="text-lg">{user?.fullName?.charAt(0) || 'U'}</span>
          </div>
        </div>
        {!collapsed && (
          <div className="mt-2 animate-slide-in">
            <p className="font-medium truncate">{user?.fullName}</p>
            <p className="text-xs opacity-70 capitalize">{user?.role}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="menu p-0 gap-1">
          {/* Main nav items */}
          {navItems.map(renderNavItem)}

          {/* Sales Team Dropdown - Admin Only */}
          {isAdmin && (
            <li>
              {collapsed ? (
                // When collapsed, just show as a regular link to first item
                <NavLink
                  to="/salespeople"
                  className={({ isActive }) =>
                    `flex items-center justify-center rounded-lg transition-colors py-3 px-2 ${isActive || isSalesTeamActive
                      ? 'bg-primary text-white font-medium'
                      : 'hover:bg-neutral-content/10'
                    }`
                  }
                  style={({ isActive }) => (isActive || isSalesTeamActive) ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
                  title="Sales Team"
                >
                  <UsersRound size={20} />
                </NavLink>
              ) : (
                // When expanded, show as dropdown
                <>
                  <button
                    onClick={() => setSalesTeamOpen(!salesTeamOpen)}
                    className={`flex items-center gap-3 rounded-lg transition-colors py-3 px-4 w-full ${isSalesTeamActive
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'hover:bg-neutral-content/10'
                      }`}
                  >
                    <UsersRound size={20} />
                    <span className="flex-1 text-left animate-slide-in">Sales Team</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${salesTeamOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {/* Dropdown items */}
                  <ul
                    className={`overflow-hidden transition-all duration-200 ${salesTeamOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                  >
                    {salesTeamItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg transition-colors py-2 pl-10 pr-4 text-sm ${isActive
                              ? 'bg-primary text-white font-medium'
                              : 'hover:bg-neutral-content/10'
                            }`
                          }
                          style={({ isActive }) => isActive ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
                        >
                          <item.icon size={16} />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          )}

          {/* Admin items */}
          {adminItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            return renderNavItem(item);
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-neutral-content/10">
        <button
          onClick={logout}
          className={`btn btn-ghost w-full ${collapsed ? 'btn-square' : 'justify-start gap-3'}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
