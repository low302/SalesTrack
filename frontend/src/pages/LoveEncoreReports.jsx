import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import {
    Loader2, Heart, BarChart3, TrendingUp, Calendar, Download,
    CheckCircle2, Clock, AlertTriangle, PieChart
} from 'lucide-react';

// Helper to get current date in CST
const getCSTDate = () => {
    const now = new Date();
    const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    return new Date(cstString);
};

// Calculate days since sale
const daysSinceSale = (saleDate) => {
    const today = getCSTDate();
    today.setHours(0, 0, 0, 0);
    const sale = new Date(saleDate + 'T00:00:00');
    return Math.floor((today - sale) / (1000 * 60 * 60 * 24));
};

// Get encore eligibility status
const getEncoreStatus = (sale) => {
    if (sale.encoreStatus === 'completed') return 'completed';
    if (sale.encoreStatus === 'scheduled') return 'scheduled';

    const days = daysSinceSale(sale.saleDate);

    if (days < 15) return 'coming-soon';
    if (days <= 45) return 'eligible';
    return 'overdue';
};

export default function LoveEncoreReports() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('thisMonth');
    const api = useApi();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const salesData = await api.getSales();
            // Filter to only new car sales
            const newCarSales = salesData.filter(s => (s.carType || 'new') === 'new');
            setSales(newCarSales);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats based on date range
    const stats = useMemo(() => {
        const cstDate = getCSTDate();
        const currentMonth = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = cstDate.getMonth() === 0
            ? `${cstDate.getFullYear() - 1}-12`
            : `${cstDate.getFullYear()}-${String(cstDate.getMonth()).padStart(2, '0')}`;

        // Process all sales with status
        const processed = sales.map(sale => ({
            ...sale,
            encoreStatusCalc: getEncoreStatus(sale),
            daysSince: daysSinceSale(sale.saleDate)
        }));

        // Filter by date range
        let filtered = processed;
        if (dateRange === 'thisMonth') {
            filtered = processed.filter(s => s.saleDate?.startsWith(currentMonth));
        } else if (dateRange === 'lastMonth') {
            filtered = processed.filter(s => s.saleDate?.startsWith(lastMonth));
        }

        // Calculate metrics
        const total = filtered.length;
        const completed = filtered.filter(s => s.encoreStatusCalc === 'completed').length;
        const scheduled = filtered.filter(s => s.encoreStatusCalc === 'scheduled').length;
        const eligible = filtered.filter(s => s.encoreStatusCalc === 'eligible').length;
        const overdue = filtered.filter(s => s.encoreStatusCalc === 'overdue').length;
        const comingSoon = filtered.filter(s => s.encoreStatusCalc === 'coming-soon').length;

        // Calculate completion rate (only for sales old enough to have been completed)
        const eligibleOrDone = filtered.filter(s =>
            s.encoreStatusCalc === 'completed' ||
            s.encoreStatusCalc === 'overdue' ||
            s.encoreStatusCalc === 'eligible'
        );
        const completionRate = eligibleOrDone.length > 0
            ? (completed / eligibleOrDone.length * 100).toFixed(1)
            : 0;

        // Calculate average days to completion
        const completedSales = filtered.filter(s => s.encoreStatus === 'completed' && s.encoreCompletedDate);
        let avgDaysToComplete = 0;
        if (completedSales.length > 0) {
            const totalDays = completedSales.reduce((sum, s) => {
                const saleDate = new Date(s.saleDate);
                const completeDate = new Date(s.encoreCompletedDate);
                return sum + Math.floor((completeDate - saleDate) / (1000 * 60 * 60 * 24));
            }, 0);
            avgDaysToComplete = (totalDays / completedSales.length).toFixed(1);
        }

        // Overdue rate
        const overdueRate = eligibleOrDone.length > 0
            ? (overdue / eligibleOrDone.length * 100).toFixed(1)
            : 0;

        return {
            total,
            completed,
            scheduled,
            eligible,
            overdue,
            comingSoon,
            completionRate,
            avgDaysToComplete,
            overdueRate,
            allProcessed: processed
        };
    }, [sales, dateRange]);

    // Monthly breakdown
    const monthlyBreakdown = useMemo(() => {
        const cstDate = getCSTDate();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            let targetMonth = cstDate.getMonth() - i;
            let targetYear = cstDate.getFullYear();
            while (targetMonth < 0) {
                targetMonth += 12;
                targetYear -= 1;
            }
            const monthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
            const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const monthSales = stats.allProcessed.filter(s => s.saleDate?.startsWith(monthStr));
            const completed = monthSales.filter(s => s.encoreStatusCalc === 'completed').length;
            const eligible = monthSales.filter(s =>
                s.encoreStatusCalc === 'completed' ||
                s.encoreStatusCalc === 'overdue' ||
                s.encoreStatusCalc === 'eligible'
            ).length;

            months.push({
                month: monthStr,
                name: monthName,
                total: monthSales.length,
                completed,
                rate: eligible > 0 ? (completed / eligible * 100).toFixed(0) : '-'
            });
        }

        return months;
    }, [stats.allProcessed]);

    const handleExport = () => {
        const customers = stats.allProcessed.map(s => ({
            'Customer Name': s.customerName || 'N/A',
            'Vehicle': `${s.vehicleYear || ''} ${s.vehicleModel || ''}`.trim() || 'N/A',
            'Stock #': s.stockNumber || '-',
            'Sale Date': s.saleDate,
            'Days Since Sale': s.daysSince,
            'Status': s.encoreStatusCalc,
            'Encore Completed Date': s.encoreCompletedDate || '-'
        }));

        const csv = [
            Object.keys(customers[0]).join(','),
            ...customers.map(row => Object.values(row).map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `love-encore-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl text-white">
                        <Heart size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Love Encore Reports</h1>
                        <p className="text-base-content/60">Program performance analytics</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        className="select select-bordered"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <button onClick={handleExport} className="btn btn-outline btn-primary">
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2 text-base-content/60 text-sm">
                            <TrendingUp size={16} />
                            Completion Rate
                        </div>
                        <div className="text-3xl font-bold text-success">{stats.completionRate}%</div>
                        <div className="text-xs text-base-content/50">of eligible customers</div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2 text-base-content/60 text-sm">
                            <Clock size={16} />
                            Avg Days to Complete
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.avgDaysToComplete || '-'}</div>
                        <div className="text-xs text-base-content/50">from sale to encore</div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2 text-base-content/60 text-sm">
                            <AlertTriangle size={16} />
                            Overdue Rate
                        </div>
                        <div className="text-3xl font-bold text-error">{stats.overdueRate}%</div>
                        <div className="text-xs text-base-content/50">missed 45-day window</div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2 text-base-content/60 text-sm">
                            <CheckCircle2 size={16} />
                            Total Completed
                        </div>
                        <div className="text-3xl font-bold text-info">{stats.completed}</div>
                        <div className="text-xs text-base-content/50">encores done</div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <h2 className="card-title flex items-center gap-2">
                        <PieChart size={20} />
                        Current Status Breakdown
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                        <div className="text-center p-4 bg-success/10 rounded-xl">
                            <div className="text-2xl font-bold text-success">{stats.eligible}</div>
                            <div className="text-sm text-success/80">Eligible Now</div>
                            <div className="text-xs text-base-content/50">15-45 days</div>
                        </div>
                        <div className="text-center p-4 bg-warning/10 rounded-xl">
                            <div className="text-2xl font-bold text-warning">{stats.comingSoon}</div>
                            <div className="text-sm text-warning/80">Coming Soon</div>
                            <div className="text-xs text-base-content/50">0-14 days</div>
                        </div>
                        <div className="text-center p-4 bg-info/10 rounded-xl">
                            <div className="text-2xl font-bold text-info">{stats.scheduled}</div>
                            <div className="text-sm text-info/80">Scheduled</div>
                            <div className="text-xs text-base-content/50">pending appt</div>
                        </div>
                        <div className="text-center p-4 bg-error/10 rounded-xl">
                            <div className="text-2xl font-bold text-error">{stats.overdue}</div>
                            <div className="text-sm text-error/80">Overdue</div>
                            <div className="text-xs text-base-content/50">&gt;45 days</div>
                        </div>
                        <div className="text-center p-4 bg-primary/10 rounded-xl">
                            <div className="text-2xl font-bold text-primary">{stats.completed}</div>
                            <div className="text-sm text-primary/80">Completed</div>
                            <div className="text-xs text-base-content/50">done</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <h2 className="card-title flex items-center gap-2">
                        <BarChart3 size={20} />
                        Monthly Performance
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-base-200">
                                <tr>
                                    <th>Month</th>
                                    <th>Total New Sales</th>
                                    <th>Encores Completed</th>
                                    <th>Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyBreakdown.map(month => (
                                    <tr key={month.month} className="hover">
                                        <td className="font-medium">{month.name}</td>
                                        <td>{month.total}</td>
                                        <td>
                                            <span className="badge badge-success badge-outline">{month.completed}</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-base-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${month.rate === '-' ? 'bg-base-300' :
                                                                parseFloat(month.rate) >= 80 ? 'bg-success' :
                                                                    parseFloat(month.rate) >= 50 ? 'bg-warning' : 'bg-error'
                                                            }`}
                                                        style={{ width: `${month.rate === '-' ? 0 : month.rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium">{month.rate}%</span>
                                            </div>
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
