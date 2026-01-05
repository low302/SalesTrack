import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, Loader2, UserCheck, UserX, Search, ArrowUpDown, Users, UserMinus, AlertTriangle } from 'lucide-react';

// Helper to get current date in CST
const getCSTDate = () => {
  const now = new Date();
  const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  return new Date(cstString);
};

export default function SalespeoplePage() {
  const [salespeople, setSalespeople] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({ name: '', nickname: '', hireDate: new Date().toISOString().split('T')[0], active: true, monthlyGoal: 0 });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'inactive', 'all'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'sales', 'hireDate', 'goal'
  const [sortOrder, setSortOrder] = useState('asc');
  const [toast, setToast] = useState(null);
  const { isAdmin } = useAuth();
  const api = useApi();

  // Get current month string in CST
  const cstDate = getCSTDate();
  const currentMonthStr = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = cstDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => { loadData(); }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    try {
      const [spData, salesData] = await Promise.all([api.getSalespeople(), api.getSales()]);
      setSalespeople(spData);
      setSales(salesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const validateForm = () => {
    const trimmedName = formData.name.trim().toLowerCase();

    // Check for duplicate name
    const existingByName = salespeople.find(sp =>
      sp.name.toLowerCase() === trimmedName &&
      (!editingPerson || sp.id !== editingPerson.id)
    );
    if (existingByName) {
      setFormError(`A salesperson named "${formData.name}" already exists`);
      return false;
    }

    // Check for duplicate nickname if provided
    if (formData.nickname.trim()) {
      const trimmedNickname = formData.nickname.trim().toLowerCase();
      const existingByNickname = salespeople.find(sp =>
        sp.nickname && sp.nickname.toLowerCase() === trimmedNickname &&
        (!editingPerson || sp.id !== editingPerson.id)
      );
      if (existingByNickname) {
        setFormError(`The nickname "${formData.nickname}" is already used by ${existingByNickname.name}`);
        return false;
      }
    }

    setFormError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingPerson) {
        await api.updateSalesperson(editingPerson.id, formData);
        showToast(`${formData.name} updated successfully`);
      } else {
        await api.createSalesperson(formData);
        showToast(`${formData.name} added successfully`);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save salesperson';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (person) => {
    const salesCount = getMTDSalesCount(person.id);
    const totalCount = getTotalSalesCount(person.id);
    const message = totalCount > 0
      ? `Are you sure you want to delete ${person.name}? They have ${totalCount} total sales associated with them. This action cannot be undone.`
      : `Are you sure you want to delete ${person.name}?`;

    if (!confirm(message)) return;

    try {
      await api.deleteSalesperson(person.id);
      showToast(`${person.name} deleted successfully`);
      loadData();
    } catch (error) {
      showToast('Failed to delete salesperson', 'error');
    }
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      nickname: person.nickname || '',
      hireDate: person.hireDate,
      active: person.active,
      monthlyGoal: person.monthlyGoal || 0
    });
    setFormError('');
    setShowModal(true);
  };

  const toggleActive = async (person) => {
    try {
      await api.updateSalesperson(person.id, { active: !person.active });
      showToast(`${person.name} ${person.active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const resetForm = () => {
    setEditingPerson(null);
    setFormData({ name: '', nickname: '', hireDate: new Date().toISOString().split('T')[0], active: true, monthlyGoal: 0 });
    setFormError('');
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  // Get total sales count (all time)
  const getTotalSalesCount = (id) => {
    let count = 0;
    sales.forEach(s => {
      if (s.salespersonId === id) count += s.isSplit ? 0.5 : 1;
      if (s.secondSalespersonId === id) count += 0.5;
    });
    return count;
  };

  // Get MTD sales count (current month only)
  const getMTDSalesCount = (id) => {
    let count = 0;
    sales.forEach(s => {
      if (!s.saleDate?.startsWith(currentMonthStr)) return;
      if (s.salespersonId === id) count += s.isSplit ? 0.5 : 1;
      if (s.secondSalespersonId === id) count += 0.5;
    });
    return count;
  };

  // Get stats for current month only
  const getStats = (id, monthlyGoal = 0) => {
    let mtdCount = 0;
    let mtdFrontEnd = 0;
    let mtdProfit = 0;

    sales.forEach(s => {
      const isMTD = s.saleDate?.startsWith(currentMonthStr);
      if (!isMTD) return;

      if (s.salespersonId === id) {
        const mult = s.isSplit ? 0.5 : 1;
        mtdCount += mult;
        mtdFrontEnd += (s.frontEnd || 0) * mult;
        mtdProfit += (s.grossProfit || 0) * mult;
      }
      if (s.secondSalespersonId === id) {
        mtdCount += 0.5;
        mtdFrontEnd += (s.frontEnd || 0) * 0.5;
        mtdProfit += (s.grossProfit || 0) * 0.5;
      }
    });

    const dayOfMonth = cstDate.getDate();
    const year = cstDate.getFullYear();
    const month = cstDate.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    let workingDaysLeft = 0;
    for (let d = dayOfMonth + 1; d <= totalDaysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date.getDay() !== 0) workingDaysLeft++;
    }

    const dailyRate = dayOfMonth > 0 ? mtdCount / dayOfMonth : 0;
    const projectedTotal = Math.round(mtdCount + (dailyRate * workingDaysLeft));

    return { mtdCount, mtdFrontEnd, mtdProfit, projectedTotal, monthlyGoal, workingDaysLeft };
  };

  // Filter and sort salespeople
  const filteredSalespeople = useMemo(() => {
    let filtered = [...salespeople];

    // Filter by active status
    if (activeTab === 'active') {
      filtered = filtered.filter(p => p.active);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(p => !p.active);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.nickname && p.nickname.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'sales':
          comparison = getMTDSalesCount(b.id) - getMTDSalesCount(a.id);
          break;
        case 'hireDate':
          comparison = new Date(a.hireDate) - new Date(b.hireDate);
          break;
        case 'goal':
          comparison = (b.monthlyGoal || 0) - (a.monthlyGoal || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [salespeople, activeTab, searchQuery, sortBy, sortOrder, sales, currentMonthStr]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const counts = useMemo(() => ({
    active: salespeople.filter(p => p.active).length,
    inactive: salespeople.filter(p => !p.active).length,
    all: salespeople.length
  }), [salespeople]);

  if (!isAdmin) return <div className="alert alert-error">Access denied. Admin privileges required.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-top toast-end z-50`}>
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Salespeople</h1>
          <p className="text-base-content/60">Manage your sales team ({counts.all} total) - Showing {currentMonthName}</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
          <Plus size={20} /> Add Salesperson
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="form-control flex-1">
              <div className="input-group">
                <span className="bg-base-200">
                  <Search size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search by name or nickname..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-200">
              <button
                className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                <UserCheck size={16} className="mr-1" />
                Active ({counts.active})
              </button>
              <button
                className={`tab ${activeTab === 'inactive' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('inactive')}
              >
                <UserMinus size={16} className="mr-1" />
                Inactive ({counts.inactive})
              </button>
              <button
                className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <Users size={16} className="mr-1" />
                All ({counts.all})
              </button>
            </div>

            {/* Sort */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-outline gap-2">
                <ArrowUpDown size={16} />
                Sort: {sortBy === 'sales' ? 'MTD Sales' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><button onClick={() => handleSort('name')} className={sortBy === 'name' ? 'active' : ''}>Name</button></li>
                <li><button onClick={() => handleSort('sales')} className={sortBy === 'sales' ? 'active' : ''}>MTD Sales</button></li>
                <li><button onClick={() => handleSort('hireDate')} className={sortBy === 'hireDate' ? 'active' : ''}>Hire Date</button></li>
                <li><button onClick={() => handleSort('goal')} className={sortBy === 'goal' ? 'active' : ''}>Monthly Goal</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Salespeople Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSalespeople.map(person => {
          const stats = getStats(person.id, person.monthlyGoal || 0);
          const goalProgress = stats.monthlyGoal > 0 ? (stats.mtdCount / stats.monthlyGoal) * 100 : 0;
          const paceOnTrack = stats.monthlyGoal > 0 ? stats.projectedTotal >= stats.monthlyGoal : true;
          return (
            <div key={person.id} className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow ${!person.active ? 'opacity-60' : ''}`}>
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className={`rounded-full w-12 ${person.active ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>
                        <span className="text-lg">{person.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold">{person.name}</h3>
                      {person.nickname && <p className="text-xs text-primary">aka "{person.nickname}"</p>}
                      <p className="text-sm text-base-content/60">Since {new Date(person.hireDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`badge ${person.active ? 'badge-success' : 'badge-ghost'}`}>
                    {person.active ? <UserCheck size={12} className="mr-1" /> : <UserX size={12} className="mr-1" />}
                    {person.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="divider my-2"></div>

                {/* MTD Stats with Goal & Pace */}
                {stats.monthlyGoal > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">MTD Progress</span>
                      <span className="text-xs text-base-content/60">
                        {stats.mtdCount % 1 === 0 ? stats.mtdCount : stats.mtdCount.toFixed(1)} / {stats.monthlyGoal} goal
                      </span>
                    </div>
                    <progress
                      className={`progress w-full ${goalProgress >= 100 ? 'progress-success' : 'progress-primary'}`}
                      value={Math.min(goalProgress, 100)}
                      max="100"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs font-medium ${paceOnTrack ? 'text-success' : 'text-warning'}`}>
                        Pace: {stats.projectedTotal} projected
                      </span>
                      <span className="text-xs text-base-content/50">
                        {stats.workingDaysLeft} days left
                      </span>
                    </div>
                  </div>
                )}

                {/* Show simple MTD count if no goal set */}
                {!stats.monthlyGoal && (
                  <div className="mb-3 text-center">
                    <div className="text-2xl font-bold text-primary">{stats.mtdCount % 1 === 0 ? stats.mtdCount : stats.mtdCount.toFixed(1)}</div>
                    <div className="text-xs text-base-content/60">MTD Sales (Pace: {stats.projectedTotal})</div>
                  </div>
                )}

                {/* Current Month Stats Only */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{stats.mtdCount % 1 === 0 ? stats.mtdCount : stats.mtdCount.toFixed(1)}</div>
                    <div className="text-xs text-base-content/60">MTD Sales</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-secondary">{formatCurrency(stats.mtdFrontEnd)}</div>
                    <div className="text-xs text-base-content/60">Front End</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${stats.mtdProfit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(stats.mtdProfit)}</div>
                    <div className="text-xs text-base-content/60">Gross</div>
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button onClick={() => toggleActive(person)} className="btn btn-ghost btn-sm">
                    {person.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleEdit(person)} className="btn btn-ghost btn-sm"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(person)} className="btn btn-ghost btn-sm text-error"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSalespeople.length === 0 && (
        <div className="text-center py-12 text-base-content/60">
          {searchQuery ? (
            <p>No salespeople found matching "{searchQuery}"</p>
          ) : activeTab === 'inactive' ? (
            <p>No inactive salespeople</p>
          ) : (
            <p>No salespeople found. Add your first team member!</p>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4">{editingPerson ? 'Edit Salesperson' : 'Add Salesperson'}</h3>

            {formError && (
              <div className="alert alert-error mb-4">
                <AlertTriangle size={20} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Full Name *</span></label>
                  <input
                    type="text"
                    className={`input input-bordered ${formError && formError.includes('name') ? 'input-error' : ''}`}
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormError(''); }}
                    required
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Nickname</span></label>
                  <input
                    type="text"
                    className={`input input-bordered ${formError && formError.includes('nickname') ? 'input-error' : ''}`}
                    placeholder="Optional short name for imports"
                    value={formData.nickname}
                    onChange={(e) => { setFormData({ ...formData, nickname: e.target.value }); setFormError(''); }}
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">Used for CSV imports and quick entry</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Hire Date *</span></label>
                  <input type="date" className="input input-bordered" value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Monthly Goal</span></label>
                  <input type="number" className="input input-bordered" placeholder="e.g., 10" min="0" value={formData.monthlyGoal} onChange={(e) => setFormData({ ...formData, monthlyGoal: parseInt(e.target.value) || 0 })} />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">Target number of sales per month</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-4">
                    <input type="checkbox" className="checkbox checkbox-primary" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
                    <span className="label-text">Active</span>
                  </label>
                </div>
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-ghost" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingPerson ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowModal(false); resetForm(); }}></div>
        </div>
      )}
    </div>
  );
}
