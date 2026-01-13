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
  Trophy,
  Sparkles,
  ClipboardList,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const [newCarsOpen, setNewCarsOpen] = useState(() => {
    return location.pathname.startsWith('/new-cars');
  });
  const [usedCarsOpen, setUsedCarsOpen] = useState(() => {
    return location.pathname.startsWith('/used-cars');
  });
  const [salesTeamOpen, setSalesTeamOpen] = useState(() => {
    return location.pathname.startsWith('/salespeople') || location.pathname.startsWith('/teams');
  });
  const [loveEncoreOpen, setLoveEncoreOpen] = useState(() => {
    return location.pathname.startsWith('/love-encore');
  });

  const newCarsItems = [
    { to: '/new-cars/sales', icon: Car, label: 'Sales' },
    { to: '/new-cars/reports', icon: BarChart3, label: 'Reports' },
  ];

  const usedCarsItems = [
    { to: '/used-cars/sales', icon: Car, label: 'Sales' },
    { to: '/used-cars/reports', icon: BarChart3, label: 'Reports' },
  ];

  const salesTeamItems = [
    { to: '/salespeople', icon: Users, label: 'Salespeople' },
    { to: '/teams', icon: Trophy, label: 'Team Management' },
  ];

  const loveEncoreItems = [
    { to: '/love-encore/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/love-encore/customers', icon: Users, label: 'Customers' },
    { to: '/love-encore/reports', icon: BarChart3, label: 'Reports' },
  ];

  const adminItems = [
    { to: '/users', icon: UserCog, label: 'Users', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];

  // Check if routes are active
  const isNewCarsActive = newCarsItems.some(item => location.pathname === item.to);
  const isUsedCarsActive = usedCarsItems.some(item => location.pathname === item.to);
  const isLoveEncoreActive = loveEncoreItems.some(item => location.pathname === item.to);
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

  const renderDropdown = (title, Icon, items, isOpen, setIsOpen, isActive, colorClass = 'primary') => (
    <li>
      {collapsed ? (
        <NavLink
          to={items[0].to}
          className={`flex items-center justify-center rounded-lg transition-colors py-3 px-2 ${isActive
            ? 'bg-primary text-white font-medium'
            : 'hover:bg-neutral-content/10'
            }`}
          style={isActive ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
          title={title}
        >
          <Icon size={20} />
        </NavLink>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-3 rounded-lg transition-colors py-3 px-4 w-full ${isActive
              ? `bg-${colorClass}/20 text-${colorClass} font-medium`
              : 'hover:bg-neutral-content/10'
              }`}
          >
            <Icon size={20} />
            <span className="flex-1 text-left animate-slide-in">{title}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <ul
            className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
          >
            {items.map((item) => (
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
          {/* Dashboard - Single Link */}
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg transition-colors py-3 ${isActive
                  ? 'bg-primary text-white font-medium'
                  : 'hover:bg-neutral-content/10'
                } ${collapsed ? 'justify-center px-2' : 'px-4'}`
              }
              style={({ isActive }) => isActive ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
              title={collapsed ? 'Dashboard' : undefined}
            >
              <LayoutDashboard size={20} />
              {!collapsed && <span className="animate-slide-in">Dashboard</span>}
            </NavLink>
          </li>

          {/* Total Sales - Single Link */}
          <li>
            <NavLink
              to="/sales"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg transition-colors py-3 ${isActive
                  ? 'bg-primary text-white font-medium'
                  : 'hover:bg-neutral-content/10'
                } ${collapsed ? 'justify-center px-2' : 'px-4'}`
              }
              style={({ isActive }) => isActive ? { backgroundColor: 'hsl(var(--p))', color: 'white' } : {}}
              title={collapsed ? 'Total Sales' : undefined}
            >
              <ClipboardList size={20} />
              {!collapsed && <span className="animate-slide-in">Total Sales</span>}
            </NavLink>
          </li>

          {/* New Cars Dropdown */}
          {renderDropdown('New Cars', Sparkles, newCarsItems, newCarsOpen, setNewCarsOpen, isNewCarsActive, 'primary')}

          {/* Used Cars Dropdown */}
          {renderDropdown('Used Cars', Car, usedCarsItems, usedCarsOpen, setUsedCarsOpen, isUsedCarsActive, 'secondary')}

          {/* Love Encore Dropdown */}
          {renderDropdown('Love Encore', Heart, loveEncoreItems, loveEncoreOpen, setLoveEncoreOpen, isLoveEncoreActive, 'secondary')}

          {/* Sales Team Dropdown - Admin Only */}
          {isAdmin && renderDropdown('Sales Team', UsersRound, salesTeamItems, salesTeamOpen, setSalesTeamOpen, isSalesTeamActive, 'accent')}

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
