import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Loader2, Trophy, Target, Users } from 'lucide-react';

export default function TeamTracker() {
    const [teams, setTeams] = useState([]);
    const [salespeople, setSalespeople] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [settings, setSettings] = useState(null);
    const api = useApi();

    useEffect(() => {
        loadData();
        // Refresh data every 5 minutes
        const dataInterval = setInterval(loadData, 5 * 60 * 1000);
        // Update clock every second
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(dataInterval);
            clearInterval(clockInterval);
        };
    }, []);

    const loadData = async () => {
        try {
            const [teamsData, spData, salesData, settingsData] = await Promise.all([
                api.getTeams(),
                api.getSalespeople(),
                api.getSales(),
                api.getSettings()
            ]);
            setTeams(teamsData);
            setSalespeople(spData);
            setSales(salesData);
            setSettings(settingsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get current date in CST
    const getCSTDate = () => {
        const now = new Date();
        const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
        return new Date(cstString);
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

    const getSalespersonName = (id) => {
        const sp = salespeople.find(s => s.id === id);
        return sp?.name || 'Unknown';
    };

    // Calculate dynamic daily used goal based on monthly target and pace
    const getDynamicDailyUsedGoal = () => {
        const cstDate = getCSTDate();
        const currentMonthKey = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;
        const monthlyTargets = settings?.monthlyTargets?.[currentMonthKey];

        if (!monthlyTargets?.usedCars || !monthlyTargets?.workingDays) {
            return settings?.dailyUsedGoal || 0; // Fall back to static goal
        }

        const usedCarTarget = monthlyTargets.usedCars;
        const workingDays = monthlyTargets.workingDays;

        // Count sales this month
        const monthStart = `${currentMonthKey}-01`;
        const monthSales = sales.filter(s => s.saleDate && s.saleDate >= monthStart && s.saleDate.startsWith(currentMonthKey));
        const soldThisMonth = monthSales.reduce((acc, s) => acc + (s.isSplit ? 0.5 : 1), 0);

        // Calculate working days elapsed (approximate based on calendar days)
        const dayOfMonth = cstDate.getDate();
        const daysInMonth = new Date(cstDate.getFullYear(), cstDate.getMonth() + 1, 0).getDate();
        const workingDaysElapsed = Math.round((dayOfMonth / daysInMonth) * workingDays);
        const workingDaysRemaining = Math.max(workingDays - workingDaysElapsed + 1, 1); // +1 to include today

        // Calculate how many more cars needed to hit target
        const remainingToSell = Math.max(usedCarTarget - soldThisMonth, 0);
        const dynamicGoal = Math.ceil(remainingToSell / workingDaysRemaining);

        return dynamicGoal;
    };

    const dynamicDailyUsedGoal = getDynamicDailyUsedGoal();

    // Calculate team stats
    const getTeamStats = (team) => {
        let totalCount = 0;
        let totalFrontEnd = 0;
        let totalGross = 0;

        const teamSales = sales.filter(s => {
            if (team.startDate && s.saleDate < team.startDate) return false;
            if (team.endDate && s.saleDate > team.endDate) return false;
            return true;
        });

        const memberStats = [];

        team.members.forEach(memberId => {
            let memberCount = 0;
            let memberFrontEnd = 0;
            let memberBackEnd = 0;
            let memberGross = 0;

            teamSales.forEach(s => {
                if (s.salespersonId === memberId) {
                    const mult = s.isSplit ? 0.5 : 1;
                    memberCount += mult;
                    memberFrontEnd += (s.frontEnd || 0) * mult;
                    memberBackEnd += (s.backEnd || 0) * mult;
                    memberGross += (s.grossProfit || 0) * mult;
                }
                if (s.secondSalespersonId === memberId) {
                    memberCount += 0.5;
                    memberFrontEnd += (s.frontEnd || 0) * 0.5;
                    memberBackEnd += (s.backEnd || 0) * 0.5;
                    memberGross += (s.grossProfit || 0) * 0.5;
                }
            });

            totalCount += memberCount;
            totalFrontEnd += memberFrontEnd;
            totalGross += memberGross;

            memberStats.push({
                id: memberId,
                name: getSalespersonName(memberId),
                count: memberCount,
                frontEnd: memberFrontEnd,
                backEnd: memberBackEnd,
                gross: memberGross
            });
        });

        // Sort members by count descending
        memberStats.sort((a, b) => b.count - a.count);

        return { totalCount, totalFrontEnd, totalGross, memberStats };
    };

    // Get overall competition stats
    const getCompetitionStats = () => {
        let totalSales = 0;
        let totalFrontEnd = 0;
        let totalGross = 0;

        teams.forEach(team => {
            const stats = getTeamStats(team);
            totalSales += stats.totalCount;
            totalFrontEnd += stats.totalFrontEnd;
            totalGross += stats.totalGross;
        });

        return { totalSales, totalFrontEnd, totalGross };
    };

    // Sort teams by performance
    const sortedTeams = useMemo(() => {
        return [...teams].map(team => ({
            ...team,
            stats: getTeamStats(team)
        })).sort((a, b) => b.stats.totalCount - a.stats.totalCount);
    }, [teams, sales, salespeople]);

    const competitionStats = getCompetitionStats();
    const cstDate = getCSTDate();
    const monthName = cstDate.toLocaleString('en-US', { month: 'long', timeZone: 'America/Chicago' });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <Trophy className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-400">No Teams Created</h2>
                    <p className="text-gray-500 mt-2">Create teams in the admin panel to start tracking competitions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6">
            {/* Header */}
            <div className="relative mb-8">
                {/* Title and Quote - Centered */}
                <div className="text-center pt-2">
                    <h1 className="text-5xl font-bold text-white mb-3">
                        Brandon Tomes Subaru
                    </h1>
                    {settings?.quoteOfTheDay && (
                        <p className="text-2xl text-blue-400 font-medium italic max-w-4xl mx-auto">
                            "{settings.quoteOfTheDay}"
                        </p>
                    )}
                </div>

                {/* Clock - Absolute Right */}
                <div className="absolute top-0 right-0 text-right">
                    <div className="text-5xl font-bold text-white tabular-nums">
                        {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-gray-500 text-sm">
                        {currentTime.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Competition Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Daily Used Goal</div>
                    <div className="text-4xl font-bold text-white">
                        {dynamicDailyUsedGoal}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Total Sales</div>
                    <div className="text-4xl font-bold text-white">
                        {competitionStats.totalSales % 1 === 0 ? competitionStats.totalSales : competitionStats.totalSales.toFixed(1)}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Total Front End</div>
                    <div className={`text-4xl font-bold ${competitionStats.totalFrontEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(competitionStats.totalFrontEnd)}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Total Gross</div>
                    <div className={`text-4xl font-bold ${competitionStats.totalGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(competitionStats.totalGross)}
                    </div>
                </div>
            </div>

            {/* Teams Grid - Side by Side */}
            <div className={`grid gap-4 ${sortedTeams.length === 2 ? 'grid-cols-2' : sortedTeams.length >= 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {sortedTeams.map((team, index) => {
                    const { totalCount, totalFrontEnd, totalGross, memberStats } = team.stats;
                    const goalProgress = team.goal > 0 ? (totalCount / team.goal) * 100 : 0;
                    const isTopThree = index < 3;

                    return (
                        <div
                            key={team.id}
                            className="bg-gray-800/60 backdrop-blur rounded-2xl overflow-hidden border border-gray-700/50 transition-all duration-300"
                            style={{ borderTopWidth: '4px', borderTopColor: team.color }}
                        >
                            {/* Team Header */}
                            <div className="p-4 border-b border-gray-700/50">
                                <div className="flex items-center gap-4">
                                    {/* Team Name + Stats */}
                                    <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <h2 className="text-2xl font-bold text-white truncate">{team.name}</h2>
                                            {team.contestName && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: team.color, color: 'white' }}
                                                >
                                                    {team.contestName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-3 mt-1 text-gray-400 text-sm">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {team.members.length}
                                            </span>
                                            {team.startDate && team.endDate && (
                                                <span className="text-xs">
                                                    {new Date(team.startDate).toLocaleDateString()} - {new Date(team.endDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Big Sales Number */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-4xl font-bold text-white">
                                            {totalCount % 1 === 0 ? totalCount : totalCount.toFixed(1)}
                                        </div>
                                        <div className="text-gray-400 text-xs">Sales</div>
                                    </div>
                                </div>

                                {/* Team Stats Row */}
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex-1 text-center">
                                        <div className={`text-lg font-bold ${totalFrontEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(totalFrontEnd)}
                                        </div>
                                        <div className="text-gray-500 text-xs">Front End</div>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <div className={`text-lg font-bold ${totalGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(totalGross)}
                                        </div>
                                        <div className="text-gray-500 text-xs">Gross</div>
                                    </div>
                                    {team.goal > 0 && (
                                        <div className="flex-1">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Target size={12} className="text-gray-400" />
                                                <span className="text-gray-400 text-xs">{team.goal}</span>
                                            </div>
                                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${goalProgress >= 100
                                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                        : 'bg-gradient-to-r from-blue-400 to-purple-500'
                                                        }`}
                                                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-400 text-center mt-0.5">{goalProgress.toFixed(0)}%</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Members - Always Visible */}
                            <div className="p-4">
                                <div className="space-y-2">
                                    {memberStats.map((member, memberIndex) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-3 bg-gray-900/40 rounded-xl p-3"
                                        >
                                            {/* Rank */}
                                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                                                {memberIndex + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                                                style={{ backgroundColor: team.color }}
                                            >
                                                {member.name.charAt(0)}
                                            </div>

                                            {/* Name */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-white truncate">{member.name}</div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="text-center w-12">
                                                    <div className="text-xl font-bold text-white">
                                                        {member.count % 1 === 0 ? member.count : member.count.toFixed(1)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Sales</div>
                                                </div>
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.frontEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.frontEnd)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Front</div>
                                                </div>
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.backEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.backEnd)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Back</div>
                                                </div>
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.gross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.gross)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Total</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {memberStats.length === 0 && (
                                        <div className="text-center text-gray-500 py-4">No members assigned</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-gray-600 text-sm">
                Auto-refreshes every 5 minutes
            </div>
        </div>
    );
}
