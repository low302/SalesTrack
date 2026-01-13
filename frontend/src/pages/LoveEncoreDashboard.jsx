import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import {
    Loader2, Heart, Calendar, Clock, CheckCircle2, AlertTriangle,
    Users, TrendingUp, Phone, Car, User, ChevronRight, Search,
    CalendarCheck, CalendarX, Filter
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

export default function LoveEncoreDashboard() {
    const [sales, setSales] = useState([]);
    const [salespeople, setSalespeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [filterStatus, setFilterStatus] = useState('eligible');
    const [searchTerm, setSearchTerm] = useState('');
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

    // Process sales with encore status
    const processedSales = useMemo(() => {
        return sales.map(sale => ({
            ...sale,
            encoreStatusCalc: getEncoreStatus(sale),
            daysSince: daysSinceSale(sale.saleDate),
            salespersonName: getSalespersonName(sale)
        }));
    }, [sales, salespeople]);

    // Calculate stats
    const stats = useMemo(() => {
        const eligible = processedSales.filter(s => s.encoreStatusCalc === 'eligible').length;
        const comingSoon = processedSales.filter(s => s.encoreStatusCalc === 'coming-soon').length;
        const overdue = processedSales.filter(s => s.encoreStatusCalc === 'overdue').length;
        const scheduled = processedSales.filter(s => s.encoreStatusCalc === 'scheduled').length;
        const completed = processedSales.filter(s => s.encoreStatusCalc === 'completed').length;

        return { eligible, comingSoon, overdue, scheduled, completed };
    }, [processedSales]);

    // Filter and sort customers
    const filteredCustomers = useMemo(() => {
        let filtered = processedSales;

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(s => s.encoreStatusCalc === filterStatus);
        }

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.customerName?.toLowerCase().includes(term) ||
                s.salespersonName?.toLowerCase().includes(term) ||
                s.stockNumber?.toLowerCase().includes(term)
            );
        }

        // Sort by days since sale (oldest first for urgency)
        return filtered.sort((a, b) => b.daysSince - a.daysSince);
    }, [processedSales, filterStatus, searchTerm]);

    const handleUpdateStatus = async (saleId, newStatus, scheduledDate = null) => {
        try {
            await api.updateSale(saleId, {
                encoreStatus: newStatus,
                encoreScheduledDate: scheduledDate,
                encoreCompletedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
            });
            loadData();
            setSelectedCustomer(null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
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
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl text-white">
                    <Heart size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Love Encore Dashboard</h1>
                    <p className="text-base-content/60">Manage customer re-delivery appointments (15-45 days post-sale)</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setFilterStatus('eligible')}
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer ${filterStatus === 'eligible' ? 'ring-2 ring-success' : ''}`}
                >
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-success/10 rounded-lg">
                                <CheckCircle2 size={20} className="text-success" />
                            </div>
                            <span className="text-sm font-medium text-base-content/70">Eligible Now</span>
                        </div>
                        <div className="text-3xl font-bold text-success">{stats.eligible}</div>
                        <div className="text-xs text-base-content/50">Ready for scheduling</div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus('coming-soon')}
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer ${filterStatus === 'coming-soon' ? 'ring-2 ring-warning' : ''}`}
                >
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-warning/10 rounded-lg">
                                <Clock size={20} className="text-warning" />
                            </div>
                            <span className="text-sm font-medium text-base-content/70">Coming Soon</span>
                        </div>
                        <div className="text-3xl font-bold text-warning">{stats.comingSoon}</div>
                        <div className="text-xs text-base-content/50">0-14 days since sale</div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus('overdue')}
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer ${filterStatus === 'overdue' ? 'ring-2 ring-error' : ''}`}
                >
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-error/10 rounded-lg">
                                <AlertTriangle size={20} className="text-error" />
                            </div>
                            <span className="text-sm font-medium text-base-content/70">Overdue</span>
                        </div>
                        <div className="text-3xl font-bold text-error">{stats.overdue}</div>
                        <div className="text-xs text-base-content/50">&gt;45 days, needs attention</div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus('scheduled')}
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer ${filterStatus === 'scheduled' ? 'ring-2 ring-info' : ''}`}
                >
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-info/10 rounded-lg">
                                <CalendarCheck size={20} className="text-info" />
                            </div>
                            <span className="text-sm font-medium text-base-content/70">Scheduled</span>
                        </div>
                        <div className="text-3xl font-bold text-info">{stats.scheduled}</div>
                        <div className="text-xs text-base-content/50">Appointments pending</div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus('completed')}
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer ${filterStatus === 'completed' ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Heart size={20} className="text-primary" />
                            </div>
                            <span className="text-sm font-medium text-base-content/70">Completed</span>
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.completed}</div>
                        <div className="text-xs text-base-content/50">Encores done</div>
                    </div>
                </button>
            </div>

            {/* Customer Queue */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="card-title flex items-center gap-2">
                            <Users size={20} />
                            Customer Queue
                            <span className="badge badge-ghost">{filteredCustomers.length}</span>
                        </h2>
                        <div className="flex gap-2">
                            <label className="input input-bordered input-sm flex items-center gap-2">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    className="grow w-40"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </label>
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead className="bg-base-200">
                                <tr>
                                    <th>Status</th>
                                    <th>Customer</th>
                                    <th>Vehicle</th>
                                    <th>Sale Date</th>
                                    <th>Days</th>
                                    <th>Salesperson</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-base-content/60">
                                            No customers found for the selected filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.slice(0, 20).map(sale => {
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
                                                    <div className="font-medium">{sale.customerName || 'N/A'}</div>
                                                    <div className="text-xs text-base-content/50">Stock: {sale.stockNumber || '-'}</div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-1">
                                                        <Car size={14} className="text-base-content/50" />
                                                        <span>{sale.vehicleYear} {sale.vehicleModel || 'Vehicle'}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {new Date(sale.saleDate).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <span className={`font-semibold ${sale.daysSince > 45 ? 'text-error' : sale.daysSince >= 15 ? 'text-success' : 'text-warning'}`}>
                                                        {sale.daysSince}
                                                    </span>
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
                                                        <button
                                                            onClick={() => setSelectedCustomer(sale)}
                                                            className="btn btn-xs btn-ghost"
                                                            title="View Details"
                                                        >
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredCustomers.length > 20 && (
                        <div className="text-center text-sm text-base-content/60 mt-4">
                            Showing 20 of {filteredCustomers.length} customers. View all in the Customers page.
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <button
                            onClick={() => setSelectedCustomer(null)}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>

                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <User size={20} />
                            {selectedCustomer.customerName || 'Customer Details'}
                        </h3>

                        <div className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-base-content/60">Vehicle</div>
                                    <div className="font-medium">{selectedCustomer.vehicleYear} {selectedCustomer.vehicleModel || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-base-content/60">Stock Number</div>
                                    <div className="font-medium">{selectedCustomer.stockNumber || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-base-content/60">Sale Date</div>
                                    <div className="font-medium">{new Date(selectedCustomer.saleDate).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-base-content/60">Days Since Sale</div>
                                    <div className="font-medium">{selectedCustomer.daysSince} days</div>
                                </div>
                                <div>
                                    <div className="text-sm text-base-content/60">Salesperson</div>
                                    <div className="font-medium">{selectedCustomer.salespersonName}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-base-content/60">Status</div>
                                    <div className={`badge badge-${getStatusInfo(selectedCustomer.encoreStatusCalc).color}`}>
                                        {getStatusInfo(selectedCustomer.encoreStatusCalc).label}
                                    </div>
                                </div>
                            </div>

                            {selectedCustomer.encoreNotes && (
                                <div>
                                    <div className="text-sm text-base-content/60">Notes</div>
                                    <div className="p-2 bg-base-200 rounded-lg text-sm">{selectedCustomer.encoreNotes}</div>
                                </div>
                            )}
                        </div>

                        <div className="modal-action">
                            {selectedCustomer.encoreStatusCalc !== 'completed' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(selectedCustomer.id, 'scheduled')}
                                        className="btn btn-info"
                                    >
                                        <CalendarCheck size={18} />
                                        Mark Scheduled
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(selectedCustomer.id, 'completed')}
                                        className="btn btn-success"
                                    >
                                        <CheckCircle2 size={18} />
                                        Mark Completed
                                    </button>
                                </>
                            )}
                            <button onClick={() => setSelectedCustomer(null)} className="btn">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
