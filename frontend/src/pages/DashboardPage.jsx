import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Target,
  Calendar,
  Loader2,
  Sparkles,
  Award
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-base-content/60">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-base-content/50 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`w-6 h-6 text-${color}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-error" />
            )}
            <span className={`text-sm ${trend >= 0 ? 'text-success' : 'text-error'}`}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="text-xs text-base-content/50">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Today's Sales Card with New/Used breakdown
function TodaySalesCard({ newCount, usedCount }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-base-content/60">Today's Sales</p>
          <div className="p-2 rounded-lg bg-primary/10">
            <Car className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className="text-2xl font-bold">{newCount}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className="text-2xl font-bold">{usedCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Today's Gross Card with New/Used breakdown
function TodayGrossCard({ newProfit, usedProfit, formatCurrency }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-base-content/60">Today's Gross</p>
          <div className="p-2 rounded-lg bg-success/10">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className={`text-2xl font-bold ${newProfit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(newProfit)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className={`text-2xl font-bold ${usedProfit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(usedProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// New/Used Breakdown Card for MTD Sales (no total)
function MTDSalesCard({ newCount, usedCount }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-base-content/60">MTD Sales</p>
          <div className="p-2 rounded-lg bg-secondary/10">
            <Calendar className="w-5 h-5 text-secondary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className="text-2xl font-bold">{newCount}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className="text-2xl font-bold">{usedCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// New/Used Breakdown Card for MTD Gross (no total)
function MTDGrossCard({ newProfit, usedProfit, formatCurrency }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-base-content/60">MTD Gross</p>
          <div className="p-2 rounded-lg bg-success/10">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className={`text-2xl font-bold ${newProfit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(newProfit)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className={`text-2xl font-bold ${usedProfit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(usedProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// New/Used Breakdown Pace Card (no total)
function PaceCardBreakdown({ newSold, usedSold }) {
  const now = new Date();
  const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const cstDate = new Date(cstString);
  const dayOfMonth = cstDate.getDate();
  const year = cstDate.getFullYear();
  const month = cstDate.getMonth();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  let workingDaysLeft = 0;
  for (let d = dayOfMonth + 1; d <= totalDaysInMonth; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() !== 0) workingDaysLeft++;
  }

  const daysSinceFirst = dayOfMonth;
  const calcPace = (sold) => {
    const rate = daysSinceFirst > 0 ? sold / daysSinceFirst : 0;
    return Math.round(sold + (rate * workingDaysLeft));
  };

  const newPace = calcPace(newSold);
  const usedPace = calcPace(usedSold);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Current Pace</span>
          <span className="text-sm text-base-content/60">{workingDaysLeft} days left</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className="text-2xl font-bold text-primary">{newPace}</p>
            <p className="text-xs text-base-content/50">{newSold} sold</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{usedPace}</p>
            <p className="text-xs text-base-content/50">{usedSold} sold</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Monthly Target Card with New/Used/CPO breakdown and individual progress bars
function TargetCardBreakdown({ newCount, usedCount, cpoCount, newTarget, usedTarget, cpoTarget }) {
  const newProgress = Math.min((newCount / newTarget) * 100, 100);
  const usedProgress = Math.min((usedCount / usedTarget) * 100, 100);
  const cpoProgress = Math.min((cpoCount / cpoTarget) * 100, 100);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Monthly Targets</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">New</span>
            </div>
            <p className="text-xl font-bold">{newCount}<span className="text-xs font-normal text-base-content/50">/{newTarget}</span></p>
            <progress className="progress progress-primary w-full h-2 mt-1" value={newProgress} max="100" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Car className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-secondary">Used</span>
            </div>
            <p className="text-xl font-bold">{usedCount}<span className="text-xs font-normal text-base-content/50">/{usedTarget}</span></p>
            <progress className="progress progress-secondary w-full h-2 mt-1" value={usedProgress} max="100" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Award className="w-3 h-3 text-info" />
              <span className="text-xs font-medium text-info">CPO</span>
            </div>
            <p className="text-xl font-bold">{cpoCount}<span className="text-xs font-normal text-base-content/50">/{cpoTarget}</span></p>
            <progress className="progress progress-info w-full h-2 mt-1" value={cpoProgress} max="100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [newData, setNewData] = useState(null);
  const [usedData, setUsedData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getDashboard, getNewDashboard, getUsedDashboard, getSettings } = useApi();

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardData, newDashboardData, usedDashboardData, settingsData] = await Promise.all([
        getDashboard(),
        getNewDashboard(),
        getUsedDashboard(),
        getSettings()
      ]);
      setData(dashboardData);
      setNewData(newDashboardData);
      setUsedData(usedDashboardData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !newData || !usedData) {
    return (
      <div className="alert alert-error">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  // Calculate CPO count from used data soldList
  const cpoCount = usedData.soldList?.filter(s => s.cpo).length || 0;

  // Get current month targets from settings
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTargets = settings?.monthlyTargets?.[currentMonth] || {};
  const newTarget = monthTargets.newCars || 50;
  const usedTarget = monthTargets.usedCars || 30;
  const cpoTarget = monthTargets.cpo || 10;

  // Prepare chart data
  const dailyChartData = data.dailySales.map(d => ({
    ...d,
    date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const monthlyChartData = data.monthlySales.map(d => {
    const [year, month] = d.month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = `${monthNames[parseInt(month) - 1]} '${year.slice(-2)}`;
    return { ...d, month: monthLabel };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/60">Sales overview and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TodaySalesCard
          newCount={newData.today.count}
          usedCount={usedData.today.count}
        />
        <TodayGrossCard
          newProfit={newData.today.profit}
          usedProfit={usedData.today.profit}
          formatCurrency={formatCurrency}
        />
        <MTDSalesCard
          newCount={newData.month.count}
          usedCount={usedData.month.count}
        />
        <MTDGrossCard
          newProfit={newData.month.profit}
          usedProfit={usedData.month.profit}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaceCardBreakdown
          newSold={newData.month.count}
          usedSold={usedData.month.count}
        />
        <TargetCardBreakdown
          newCount={newData.month.count}
          usedCount={usedData.month.count}
          cpoCount={cpoCount}
          newTarget={newTarget}
          usedTarget={usedTarget}
          cpoTarget={cpoTarget}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Daily Sales (Last 30 Days)</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'revenue' || name === 'profit' ? formatCurrency(value) : value,
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Sales" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Monthly Revenue (Last 12 Months)</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Trend Chart */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg">Profit Trend (Last 12 Months)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(value)]} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Profit" />
                <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Salesperson Leaderboard */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg">Sales Leaderboard (This Month)</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Salesperson</th>
                  <th className="text-right">Sales</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.salesBySalesperson.map((sp, index) => (
                  <tr key={sp.id} className={index === 0 ? 'bg-primary/5' : ''}>
                    <td>
                      <span className={`badge ${index === 0 ? 'badge-primary' :
                        index === 1 ? 'badge-secondary' :
                          index === 2 ? 'badge-accent' : 'badge-ghost'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="font-medium">{sp.name}</td>
                    <td className="text-right">{sp.salesCount}</td>
                    <td className="text-right">{formatCurrency(sp.revenue)}</td>
                    <td className="text-right">
                      <span className={sp.profit >= 0 ? 'text-success' : 'text-error'}>
                        {formatCurrency(sp.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
