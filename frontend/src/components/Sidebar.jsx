import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  UserCog, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sales', icon: Car, label: 'Sales' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/salespeople', icon: Users, label: 'Salespeople', adminOnly: true },
    { to: '/users', icon: UserCog, label: 'Users', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];

  return (
    <aside 
      className={`bg-neutral text-neutral-content min-h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
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
      <nav className="flex-1 p-2">
        <ul className="menu p-0 gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-content' 
                        : 'hover:bg-neutral-content/10'
                    } ${collapsed ? 'justify-center px-2' : 'px-4'}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!collapsed && <span className="animate-slide-in">{item.label}</span>}
                </NavLink>
              </li>
            );
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
