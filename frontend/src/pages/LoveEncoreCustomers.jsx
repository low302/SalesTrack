import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import {
    Loader2, Heart, Search, Filter, Car, User, Calendar,
    CheckCircle2, Clock, AlertTriangle, CalendarCheck, X,
    ChevronDown
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

// Get status display info
const getStatusInfo = (status) => {
    switch (status) {
        case 'eligible':
            return { label: 'Eligible Now', color: 'success', icon: CheckCircle2, bgColor: 'bg-success/10', textColor: 'text-success' };
        case 'coming-soon':
            return { label: 'Coming Soon', color: 'warning', icon: Clock, bgColor: 'bg-warning/10', textColor: 'text-warning' };
        case 'overdue':
            return { label: 'Overdue', color: 'error', icon: AlertTriangle, bgColor: 'bg-error/10', textColor: 'text-error' };
        case 'scheduled':
            return { label: 'Scheduled', color: 'info', icon: CalendarCheck, bgColor: 'bg-info/10', textColor: 'text-info' };
        case 'completed':
            return { label: 'Completed', color: 'success', icon: Heart, bgColor: 'bg-primary/10', textColor: 'text-primary' };
        default:
            return { label: 'Unknown', color: 'ghost', icon: Clock, bgColor: 'bg-base-200', textColor: 'text-base-content' };
    }
};

export default function LoveEncoreCustomers() {
    const [sales, setSales] = useState([]);
    const [salespeople, setSalespeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [salespersonFilter, setSalespersonFilter] = useState('');
    const [sortBy, setSortBy] = useState('days-desc');
    const api = useApi();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [salesData, salespeopleData] = await Promise.all([
                api.getSales(),
                api.getSalespeople()
            ]);
            // Filter to only new car sales
            const newCarSales = salesData.filter(s => (s.carType || 'new') === 'new');
            setSales(newCarSales);
            setSalespeople(salespeopleData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSalespersonName = (sale) => {
        const sp = salespeople.find(s => s.id === sale.salespersonId);
        return sp?.name || 'Unknown';
    };

    // Process and filter sales
    const filteredCustomers = useMemo(() => {
        let processed = sales.map(sale => ({
            ...sale,
            encoreStatusCalc: getEncoreStatus(sale),
            daysSince: daysSinceSale(sale.saleDate),
            salespersonName: getSalespersonName(sale)
        }));

        // Apply status filter
        if (statusFilter !== 'all') {
            processed = processed.filter(s => s.encoreStatusCalc === statusFilter);
        }

        // Apply salesperson filter
        if (salespersonFilter) {
            processed = processed.filter(s => s.salespersonId === salespersonFilter);
        }

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            processed = processed.filter(s =>
                s.customerName?.toLowerCase().includes(term) ||
                s.stockNumber?.toLowerCase().includes(term) ||
                s.vehicleModel?.toLowerCase().includes(term) ||
                s.salespersonName?.toLowerCase().includes(term)
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'days-desc':
                processed.sort((a, b) => b.daysSince - a.daysSince);
                break;
            case 'days-asc':
                processed.sort((a, b) => a.daysSince - b.daysSince);
                break;
            case 'name-asc':
                processed.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
                break;
            case 'date-desc':
                processed.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
                break;
            case 'date-asc':
                processed.sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate));
                break;
            default:
                break;
        }

        return processed;
    }, [sales, salespeople, statusFilter, salespersonFilter, searchTerm, sortBy]);

    const handleUpdateStatus = async (saleId, newStatus) => {
        try {
            await api.updateSale(saleId, {
                encoreStatus: newStatus,
                encoreCompletedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
            });
            loadData();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSalespersonFilter('');
        setSortBy('days-desc');
    };

    const hasActiveFilters = searchTerm || statusFilter !== 'all' || salespersonFilter;

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
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl text-white">
                    <Heart size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Love Encore Customers</h1>
                    <p className="text-base-content/60">All new car customers with encore eligibility status</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="form-control flex-1">
                            <label className="input input-bordered flex items-center gap-2">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by customer, vehicle, stock #, or salesperson..."
                                    className="grow"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </label>
                        </div>

                        {/* Status Filter */}
                        <select
                            className="select select-bordered"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="eligible">Eligible Now (15-45 days)</option>
                            <option value="coming-soon">Coming Soon (0-14 days)</option>
                            <option value="overdue">Overdue (&gt;45 days)</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                        </select>

                        {/* Salesperson Filter */}
                        <select
                            className="select select-bordered"
                            value={salespersonFilter}
                            onChange={(e) => setSalespersonFilter(e.target.value)}
                        >
                            <option value="">All Salespeople</option>
                            {salespeople.filter(sp => sp.active).map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                            ))}
                        </select>

                        {/* Sort */}
                        <select
                            className="select select-bordered"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="days-desc">Days (Oldest First)</option>
                            <option value="days-asc">Days (Newest First)</option>
                            <option value="name-asc">Customer Name (A-Z)</option>
                            <option value="date-desc">Sale Date (Newest)</option>
                            <option value="date-asc">Sale Date (Oldest)</option>
                        </select>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="btn btn-ghost btn-sm">
                                <X size={16} />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-base-content/60">
                    Showing {filteredCustomers.length} of {sales.length} customers
                </div>
            </div>

            {/* Customer Table */}
            <div className="card bg-base-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="bg-base-200">
                            <tr>
                                <th>Status</th>
                                <th>Customer Name</th>
                                <th>Vehicle</th>
                                <th>Stock #</th>
                                <th>Sale Date</th>
                                <th>Days Since</th>
                                <th>Salesperson</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-base-content/60">
                                        No customers found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(sale => {
                                    const statusInfo = getStatusInfo(sale.encoreStatusCalc);
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <tr key={sale.id} className="hover">
                                            <td>
                                                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${statusInfo.bgColor} w-fit`}>
                                                    <StatusIcon size={14} className={statusInfo.textColor} />
                                                    <span className={`text-xs font-medium ${statusInfo.textColor}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-base-content/50" />
                                                    <span className="font-medium">{sale.customerName || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Car size={16} className="text-base-content/50" />
                                                    <span>{sale.vehicleYear || ''} {sale.vehicleModel || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="font-mono text-sm">{sale.stockNumber || '-'}</td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} className="text-base-content/50" />
                                                    {new Date(sale.saleDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`font-bold text-lg ${sale.daysSince > 45 ? 'text-error' :
                                                        sale.daysSince >= 15 ? 'text-success' :
                                                            'text-warning'
                                                    }`}>
                                                    {sale.daysSince}
                                                </span>
                                                <span className="text-xs text-base-content/50 ml-1">days</span>
                                            </td>
                                            <td>{sale.salespersonName}</td>
                                            <td>
                                                <div className="flex gap-1">
                                                    {sale.encoreStatusCalc !== 'completed' && sale.encoreStatusCalc !== 'scheduled' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(sale.id, 'scheduled')}
                                                            className="btn btn-xs btn-info btn-outline"
                                                            title="Mark as Scheduled"
                                                        >
                                                            <CalendarCheck size={14} />
                                                        </button>
                                                    )}
                                                    {sale.encoreStatusCalc !== 'completed' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(sale.id, 'completed')}
                                                            className="btn btn-xs btn-success btn-outline"
                                                            title="Mark as Completed"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
