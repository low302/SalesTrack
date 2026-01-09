import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Car,
    Calendar,
    Loader2,
    ChevronDown,
    ChevronUp
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
        if (date.getDay() !== 0) {
            workingDaysLeft++;
        }
    }

    const daysSinceFirst = dayOfMonth;
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

export default function NewCarDashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [soldListOpen, setSoldListOpen] = useState(false);
    const { getNewDashboard, getSalespeople } = useApi();
    const [salespeople, setSalespeople] = useState([]);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async () => {
        try {
            const [dashboardData, salespeopleData] = await Promise.all([
                getNewDashboard(),
                getSalespeople()
            ]);
            setData(dashboardData);
            setSalespeople(salespeopleData);
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

    const getSalespersonName = (sale) => {
        const sp1 = salespeople.find(sp => sp.id === sale.salespersonId);
        if (sale.isSplit && sale.secondSalespersonId) {
            const sp2 = salespeople.find(sp => sp.id === sale.secondSalespersonId);
            return `${sp1?.name || 'Unknown'} / ${sp2?.name || 'Unknown'}`;
        }
        return sp1?.name || 'Unknown';
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

    const dailyChartData = data.dailySales.map(d => ({
        ...d,
        date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    const monthlyChartData = data.monthlySales.map(d => {
        const [year, month] = d.month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthLabel = `${monthNames[parseInt(month) - 1]} '${year.slice(-2)}`;
        return {
            ...d,
            month: monthLabel
        };
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Car className="w-7 h-7 text-primary" />
                    New Car Dashboard
                </h1>
                <p className="text-base-content/60">New vehicle sales overview and analytics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Today's New Sales"
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
                    title="MTD New Sales"
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
                <PaceCard soldUnits={data.month.count} color="primary" />
                <ProgressCard
                    title="Monthly Target"
                    current={data.targets.monthly.actual}
                    target={data.targets.monthly.target}
                    color="secondary"
                />
            </div>

            {/* Sold List Dropdown */}
            <div className="card bg-base-100 shadow-md">
                <div
                    className="card-body p-4 cursor-pointer hover:bg-base-200 transition-colors"
                    onClick={() => setSoldListOpen(!soldListOpen)}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="card-title text-lg">
                            New Car Sold List (This Month)
                            <span className="badge badge-primary">{data.soldList?.length || 0}</span>
                        </h2>
                        {soldListOpen ? (
                            <ChevronUp className="w-5 h-5 text-base-content/60" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-base-content/60" />
                        )}
                    </div>
                </div>
                {soldListOpen && (
                    <div className="px-4 pb-4">
                        <div className="overflow-x-auto">
                            <table className="table table-xs">
                                <thead className="bg-base-200">
                                    <tr>
                                        <th>Date</th>
                                        <th>Deal #</th>
                                        <th>Stock #</th>
                                        <th>Customer</th>
                                        <th>Salesperson</th>
                                        <th className="text-right">Front</th>
                                        <th className="text-right">Back</th>
                                        <th className="text-right">Gross</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.soldList?.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-4 text-base-content/60">
                                                No new car sales this month
                                            </td>
                                        </tr>
                                    ) : (
                                        data.soldList?.map((sale) => (
                                            <tr key={sale.id} className="hover">
                                                <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                                                <td className="font-medium">{sale.dealNumber || '-'}</td>
                                                <td>{sale.stockNumber || '-'}</td>
                                                <td>{sale.customerName || '-'}</td>
                                                <td>{getSalespersonName(sale)}</td>
                                                <td className={`text-right ${(sale.frontEnd || 0) < 0 ? 'text-error' : 'text-success'}`}>
                                                    {formatCurrency(sale.frontEnd || 0)}
                                                </td>
                                                <td className={`text-right ${(sale.backEnd || 0) < 0 ? 'text-error' : 'text-success'}`}>
                                                    {formatCurrency(sale.backEnd || 0)}
                                                </td>
                                                <td className={`text-right font-semibold ${(sale.grossProfit || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                                                    {formatCurrency(sale.grossProfit || 0)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Chart */}
                <div className="card bg-base-100 shadow-md">
                    <div className="card-body">
                        <h2 className="card-title text-lg">Daily New Car Sales (Last 30 Days)</h2>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
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
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Salesperson Leaderboard */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <h2 className="card-title text-lg">New Car Sales Leaderboard (This Month)</h2>
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
                                {data.salesBySalesperson.filter(sp => sp.salesCount > 0).map((sp, index) => (
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
