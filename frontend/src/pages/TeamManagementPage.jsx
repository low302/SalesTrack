import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    Loader2,
    Users,
    Trophy,
    Target,
    Calendar,
    Palette,
    ChevronDown,
    ChevronUp,
    Award,
    TrendingUp
} from 'lucide-react';

// Preset team colors
const TEAM_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Lime', value: '#84cc16' },
];

export default function TeamManagementPage() {
    const [teams, setTeams] = useState([]);
    const [salespeople, setSalespeople] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3b82f6',
        members: [],
        contestName: '',
        startDate: '',
        endDate: '',
        goal: 0
    });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const { isAdmin } = useAuth();
    const api = useApi();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const loadData = async () => {
        try {
            const [teamsData, salespeopleData, salesData] = await Promise.all([
                api.getTeams(),
                api.getSalespeople(),
                api.getSales()
            ]);
            setTeams(teamsData);
            setSalespeople(salespeopleData.filter(sp => sp.active));
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

    const formatCurrency = (value) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

    const resetForm = () => {
        setEditingTeam(null);
        setFormData({
            name: '',
            description: '',
            color: '#3b82f6',
            members: [],
            contestName: '',
            startDate: '',
            endDate: '',
            goal: 0
        });
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setFormError('Team name is required');
            return;
        }

        setSubmitting(true);
        try {
            if (editingTeam) {
                await api.updateTeam(editingTeam.id, formData);
                showToast(`${formData.name} updated successfully`);
            } else {
                await api.createTeam(formData);
                showToast(`${formData.name} created successfully`);
            }
            setShowModal(false);
            resetForm();
            loadData();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Failed to save team';
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (team) => {
        setEditingTeam(team);
        setFormData({
            name: team.name,
            description: team.description || '',
            color: team.color || '#3b82f6',
            members: team.members || [],
            contestName: team.contestName || '',
            startDate: team.startDate || '',
            endDate: team.endDate || '',
            goal: team.goal || 0
        });
        setFormError('');
        setShowModal(true);
    };

    const handleDelete = async (team) => {
        if (!confirm(`Are you sure you want to delete team "${team.name}"?`)) return;

        try {
            await api.deleteTeam(team.id);
            showToast(`${team.name} deleted successfully`);
            loadData();
        } catch (error) {
            showToast('Failed to delete team', 'error');
        }
    };

    const toggleMember = (memberId) => {
        const currentTeam = getMemberCurrentTeam(memberId);

        // If already in current form's members, just remove
        if (formData.members.includes(memberId)) {
            setFormData(prev => ({
                ...prev,
                members: prev.members.filter(id => id !== memberId)
            }));
            return;
        }

        // If on another team (not the one being edited), ask to switch
        if (currentTeam && currentTeam.id !== editingTeam?.id) {
            const spName = getSalespersonName(memberId);
            if (confirm(`${spName} is currently on team "${currentTeam.name}". Would you like to move them to this team?`)) {
                // Remove from other team
                removeFromOtherTeam(memberId, currentTeam.id);
                // Add to current form
                setFormData(prev => ({
                    ...prev,
                    members: [...prev.members, memberId]
                }));
            }
        } else {
            // Not on any team, just add
            setFormData(prev => ({
                ...prev,
                members: [...prev.members, memberId]
            }));
        }
    };

    // Get which team a salesperson is currently on (excluding the team being edited)
    const getMemberCurrentTeam = (memberId) => {
        return teams.find(team =>
            team.id !== editingTeam?.id &&
            team.members.includes(memberId)
        );
    };

    // Remove a member from another team when switching
    const removeFromOtherTeam = async (memberId, teamId) => {
        try {
            const team = teams.find(t => t.id === teamId);
            if (team) {
                const updatedMembers = team.members.filter(id => id !== memberId);
                await api.updateTeam(teamId, { members: updatedMembers });
                // Update local state
                setTeams(prev => prev.map(t =>
                    t.id === teamId
                        ? { ...t, members: updatedMembers }
                        : t
                ));
            }
        } catch (error) {
            console.error('Failed to remove member from team:', error);
        }
    };

    // Calculate team stats
    const getTeamStats = (team) => {
        let totalCount = 0;
        let totalFrontEnd = 0;
        let totalGross = 0;

        const teamSales = sales.filter(s => {
            // Check date range if set
            if (team.startDate && s.saleDate < team.startDate) return false;
            if (team.endDate && s.saleDate > team.endDate) return false;
            return true;
        });

        team.members.forEach(memberId => {
            teamSales.forEach(s => {
                if (s.salespersonId === memberId) {
                    const mult = s.isSplit ? 0.5 : 1;
                    totalCount += mult;
                    totalFrontEnd += (s.frontEnd || 0) * mult;
                    totalGross += (s.grossProfit || 0) * mult;
                }
                if (s.secondSalespersonId === memberId) {
                    totalCount += 0.5;
                    totalFrontEnd += (s.frontEnd || 0) * 0.5;
                    totalGross += (s.grossProfit || 0) * 0.5;
                }
            });
        });

        return { totalCount, totalFrontEnd, totalGross };
    };

    // Get member stats within a team
    const getMemberStats = (memberId, team) => {
        let count = 0;
        let frontEnd = 0;
        let gross = 0;

        const teamSales = sales.filter(s => {
            if (team.startDate && s.saleDate < team.startDate) return false;
            if (team.endDate && s.saleDate > team.endDate) return false;
            return true;
        });

        teamSales.forEach(s => {
            if (s.salespersonId === memberId) {
                const mult = s.isSplit ? 0.5 : 1;
                count += mult;
                frontEnd += (s.frontEnd || 0) * mult;
                gross += (s.grossProfit || 0) * mult;
            }
            if (s.secondSalespersonId === memberId) {
                count += 0.5;
                frontEnd += (s.frontEnd || 0) * 0.5;
                gross += (s.grossProfit || 0) * 0.5;
            }
        });

        return { count, frontEnd, gross };
    };

    const getSalespersonName = (id) => {
        const sp = salespeople.find(s => s.id === id);
        return sp?.name || 'Unknown';
    };

    // Sort teams by total count for leaderboard
    const sortedTeams = useMemo(() => {
        return [...teams].map(team => ({
            ...team,
            stats: getTeamStats(team)
        })).sort((a, b) => b.stats.totalCount - a.stats.totalCount);
    }, [teams, sales]);

    if (!isAdmin) {
        return <div className="alert alert-error">Access denied. Admin privileges required.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className="toast toast-top toast-end z-50">
                    <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="text-warning" />
                        Team Management
                    </h1>
                    <p className="text-base-content/60">Create and manage teams for contests and competitions</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
                    <Plus size={20} /> Create Team
                </button>
            </div>

            {/* Teams Overview */}
            {teams.length === 0 ? (
                <div className="card bg-base-100 shadow-md">
                    <div className="card-body text-center py-12">
                        <Users size={48} className="mx-auto text-base-content/30 mb-4" />
                        <h3 className="text-lg font-medium">No Teams Yet</h3>
                        <p className="text-base-content/60 mb-4">Create your first team to start tracking competitions!</p>
                        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary btn-sm mx-auto">
                            <Plus size={16} /> Create First Team
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Leaderboard Header */}
                    <div className="flex items-center gap-2 text-sm text-base-content/60">
                        <Award size={16} />
                        <span>Teams ranked by sales performance</span>
                    </div>

                    {/* Team Cards */}
                    {sortedTeams.map((team, index) => {
                        const { totalCount, totalFrontEnd, totalGross } = team.stats;
                        const goalProgress = team.goal > 0 ? (totalCount / team.goal) * 100 : 0;
                        const isExpanded = expandedTeam === team.id;

                        return (
                            <div
                                key={team.id}
                                className="card bg-base-100 shadow-md overflow-hidden"
                                style={{ borderLeft: `4px solid ${team.color}` }}
                            >
                                <div className="card-body p-4">
                                    {/* Team Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Rank Badge */}
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                                    index === 1 ? 'bg-gray-400' :
                                                        index === 2 ? 'bg-amber-700' :
                                                            'bg-base-300 text-base-content'
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>

                                            {/* Team Info */}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg">{team.name}</h3>
                                                    {team.contestName && (
                                                        <span className="badge badge-sm" style={{ backgroundColor: team.color, color: 'white' }}>
                                                            {team.contestName}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-base-content/60">
                                                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                                                    {team.startDate && team.endDate && (
                                                        <span className="ml-2">
                                                            • {new Date(team.startDate).toLocaleDateString()} - {new Date(team.endDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats Summary */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-center w-16">
                                                <div className="text-2xl font-bold text-primary">{totalCount % 1 === 0 ? totalCount : totalCount.toFixed(1)}</div>
                                                <div className="text-xs text-base-content/60">Sales</div>
                                            </div>
                                            <div className="text-center w-24 hidden sm:block">
                                                <div className={`text-lg font-semibold ${totalFrontEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(totalFrontEnd)}</div>
                                                <div className="text-xs text-base-content/60">Front End</div>
                                            </div>
                                            <div className="text-center w-24 hidden md:block">
                                                <div className={`text-lg font-semibold ${totalGross >= 0 ? 'text-success' : 'text-error'}`}>
                                                    {formatCurrency(totalGross)}
                                                </div>
                                                <div className="text-xs text-base-content/60">Gross</div>
                                            </div>

                                            {/* Goal Progress */}
                                            {team.goal > 0 && (
                                                <div className="text-center hidden lg:block w-28">
                                                    <div className="flex items-center gap-2">
                                                        <progress
                                                            className={`progress w-16 ${goalProgress >= 100 ? 'progress-success' : 'progress-primary'}`}
                                                            value={Math.min(goalProgress, 100)}
                                                            max="100"
                                                        />
                                                        <span className="text-sm font-medium">{goalProgress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="text-xs text-base-content/60">Goal: {team.goal}</div>
                                                </div>
                                            )}

                                            {/* Edit Button */}
                                            <button onClick={() => handleEdit(team)} className="btn btn-ghost btn-sm" title="Edit">
                                                <Edit2 size={16} />
                                            </button>

                                            {/* Expand Arrow - Far Right */}
                                            <button
                                                onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                                                className="btn btn-ghost btn-sm"
                                                title="View Details"
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Member Details */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-base-200">
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Users size={16} />
                                                Team Members
                                            </h4>
                                            <div className="overflow-x-auto">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th className="text-center">Sales</th>
                                                            <th className="text-right">Front End</th>
                                                            <th className="text-right">Gross</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {team.members.map(memberId => {
                                                            const memberStats = getMemberStats(memberId, team);
                                                            return (
                                                                <tr key={memberId} className="hover">
                                                                    <td className="font-medium">{getSalespersonName(memberId)}</td>
                                                                    <td className="text-center">
                                                                        {memberStats.count % 1 === 0 ? memberStats.count : memberStats.count.toFixed(1)}
                                                                    </td>
                                                                    <td className="text-right">{formatCurrency(memberStats.frontEnd)}</td>
                                                                    <td className={`text-right ${memberStats.gross >= 0 ? 'text-success' : 'text-error'}`}>
                                                                        {formatCurrency(memberStats.gross)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {team.description && (
                                                <p className="text-sm text-base-content/60 mt-3">{team.description}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <button
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Trophy size={20} className="text-warning" />
                            {editingTeam ? 'Edit Team' : 'Create New Team'}
                        </h3>

                        {formError && (
                            <div className="alert alert-error mb-4">
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Team Name */}
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Team Name *</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        placeholder="e.g., Team Alpha"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Contest Name */}
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Contest Name</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        placeholder="e.g., January Sales Challenge"
                                        value={formData.contestName}
                                        onChange={(e) => setFormData({ ...formData, contestName: e.target.value })}
                                    />
                                </div>

                                {/* Team Color */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Palette size={14} /> Team Color
                                        </span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {TEAM_COLORS.map(color => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                className={`w-8 h-8 rounded-full transition-transform ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Goal */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Target size={14} /> Sales Goal
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        placeholder="e.g., 50"
                                        min="0"
                                        value={formData.goal ?? ''}
                                        onChange={(e) => setFormData({ ...formData, goal: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                        onBlur={(e) => {
                                            if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                                                setFormData({ ...formData, goal: 0 });
                                            }
                                        }}
                                    />
                                </div>

                                {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Calendar size={14} /> Start Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                {/* End Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Calendar size={14} /> End Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>

                                {/* Description */}
                                <div className="form-control md:col-span-2">
                                    <label className="label"><span className="label-text">Description</span></label>
                                    <textarea
                                        className="textarea textarea-bordered"
                                        placeholder="Optional team description..."
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Team Members */}
                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text flex items-center gap-2">
                                            <Users size={14} /> Team Members
                                        </span>
                                        <span className="label-text-alt">{formData.members.length} selected</span>
                                    </label>
                                    <div className="bg-base-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {salespeople.map(sp => {
                                                const isSelected = formData.members.includes(sp.id);
                                                const currentTeam = getMemberCurrentTeam(sp.id);
                                                const isOnOtherTeam = currentTeam && currentTeam.id !== editingTeam?.id;

                                                return (
                                                    <div
                                                        key={sp.id}
                                                        className={`relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                                                            ? 'bg-primary/20 border border-primary'
                                                            : isOnOtherTeam
                                                                ? 'bg-base-300/50 border border-base-300 opacity-60'
                                                                : 'bg-base-100 border border-transparent hover:border-base-300'
                                                            }`}
                                                        onClick={() => toggleMember(sp.id)}
                                                        title={isOnOtherTeam ? `Currently on: ${currentTeam.name}` : sp.name}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-primary checkbox-sm"
                                                            checked={isSelected}
                                                            onChange={() => { }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-sm truncate block ${isOnOtherTeam && !isSelected ? 'text-base-content/50' : ''}`}>
                                                                {sp.name}
                                                            </span>
                                                            {isOnOtherTeam && !isSelected && (
                                                                <span
                                                                    className="text-xs truncate block"
                                                                    style={{ color: currentTeam.color }}
                                                                >
                                                                    On: {currentTeam.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {salespeople.length === 0 && (
                                            <p className="text-center text-base-content/60 py-4">No active salespeople available</p>
                                        )}
                                    </div>
                                    <label className="label">
                                        <span className="label-text-alt text-base-content/50">
                                            Grayed names are on other teams. Click to switch them.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="modal-action justify-between">
                                {editingTeam ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to delete team "${editingTeam.name}"? This action cannot be undone.`)) {
                                                handleDelete(editingTeam);
                                                setShowModal(false);
                                                resetForm();
                                            }
                                        }}
                                        className="btn btn-error btn-outline"
                                        disabled={submitting}
                                    >
                                        <Trash2 size={16} />
                                        Delete Team
                                    </button>
                                ) : (
                                    <div></div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                        className="btn btn-ghost"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {editingTeam ? 'Update Team' : 'Create Team'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => { setShowModal(false); resetForm(); }} />
                </div>
            )}
        </div>
    );
}
