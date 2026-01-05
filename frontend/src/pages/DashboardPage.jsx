import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Target,
  Calendar,
  Loader2
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

function ProgressCard({ title, current, target, color = 'primary' }) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-sm text-base-content/60">
            {current} / {target}
          </span>
        </div>
        <progress
          className={`progress progress-${color} w-full`}
          value={progress}
          max="100"
        />
        <p className="text-xs text-base-content/50 mt-1">
          {progress.toFixed(0)}% complete
        </p>
      </div>
    </div>
  );
}

function PaceCard({ soldUnits, color = 'primary' }) {
  // Get current date in CST (America/Chicago)
  const now = new Date();
  const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const cstDate = new Date(cstString);

  const dayOfMonth = cstDate.getDate();
  const year = cstDate.getFullYear();
  const month = cstDate.getMonth();

  // Get total days in current month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate working days (excluding Sundays) remaining in month
  let workingDaysLeft = 0;
  for (let d = dayOfMonth + 1; d <= totalDaysInMonth; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() !== 0) { // 0 = Sunday
      workingDaysLeft++;
    }
  }

  // Days since 1st (including today)
  const daysSinceFirst = dayOfMonth;

  // Calculate pace: (soldUnits / daysSinceFirst) * workingDaysLeft + soldUnits
  const dailyRate = daysSinceFirst > 0 ? soldUnits / daysSinceFirst : 0;
  const projectedTotal = Math.round(soldUnits + (dailyRate * workingDaysLeft));

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Current Pace</span>
          <span className="text-sm text-base-content/60">
            {workingDaysLeft} working days left
          </span>
        </div>
        <p className={`text-3xl font-bold text-${color}`}>{projectedTotal}</p>
        <p className="text-xs text-base-content/50 mt-1">
          Projected units this month at {dailyRate.toFixed(1)}/day
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getDashboard } = useApi();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = await getDashboard();
      setData(dashboardData);
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

  if (!data) {
    return (
      <div className="alert alert-error">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  // Prepare chart data
  const dailyChartData = data.dailySales.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const monthlyChartData = data.monthlySales.map(d => ({
    ...d,
    month: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/60">Sales overview and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={data.today.count}
          subtitle={`Front: ${formatCurrency(data.today.revenue)}`}
          icon={Car}
          color="primary"
        />
        <StatCard
          title="Today's Gross"
          value={formatCurrency(data.today.profit)}
          icon={DollarSign}
          color="success"
        />
        <StatCard
          title="MTD Sales"
          value={data.month.count}
          subtitle={`Front: ${formatCurrency(data.month.revenue)}`}
          icon={Calendar}
          color="secondary"
        />
        <StatCard
          title="MTD Gross"
          value={formatCurrency(data.month.profit)}
          icon={TrendingUp}
          color="accent"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaceCard
          soldUnits={data.month.count}
          color="primary"
        />
        <ProgressCard
          title="Monthly Target"
          current={data.targets.monthly.actual}
          target={data.targets.monthly.target}
          color="secondary"
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
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'revenue' || name === 'profit'
                        ? formatCurrency(value)
                        : value,
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Sales"
                  />
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
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                  />
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
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value)]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Profit"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Revenue"
                />
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
                          index === 2 ? 'badge-accent' :
                            'badge-ghost'
                        }`}>
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
