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
        let totalNewCount = 0;
        let totalUsedCount = 0;
        let totalNewGross = 0;
        let totalUsedGross = 0;

        const teamSales = sales.filter(s => {
            if (team.startDate && s.saleDate < team.startDate) return false;
            if (team.endDate && s.saleDate > team.endDate) return false;
            return true;
        });

        const memberStats = [];

        team.members.forEach(memberId => {
            let memberNewCount = 0;
            let memberUsedCount = 0;
            let memberNewGross = 0;
            let memberUsedGross = 0;
            let memberFrontEnd = 0;
            let memberBackEnd = 0;
            let memberGross = 0;

            teamSales.forEach(s => {
                const isNew = (s.carType || 'new') === 'new';
                const saleGross = s.grossProfit || 0;

                if (s.salespersonId === memberId) {
                    const mult = s.isSplit ? 0.5 : 1;
                    if (isNew) {
                        memberNewCount += mult;
                        memberNewGross += saleGross * mult;
                    } else {
                        memberUsedCount += mult;
                        memberUsedGross += saleGross * mult;
                    }
                    memberFrontEnd += (s.frontEnd || 0) * mult;
                    memberBackEnd += (s.backEnd || 0) * mult;
                    memberGross += saleGross * mult;
                }
                if (s.secondSalespersonId === memberId) {
                    if (isNew) {
                        memberNewCount += 0.5;
                        memberNewGross += saleGross * 0.5;
                    } else {
                        memberUsedCount += 0.5;
                        memberUsedGross += saleGross * 0.5;
                    }
                    memberFrontEnd += (s.frontEnd || 0) * 0.5;
                    memberBackEnd += (s.backEnd || 0) * 0.5;
                    memberGross += saleGross * 0.5;
                }
            });

            totalNewCount += memberNewCount;
            totalUsedCount += memberUsedCount;
            totalNewGross += memberNewGross;
            totalUsedGross += memberUsedGross;

            memberStats.push({
                id: memberId,
                name: getSalespersonName(memberId),
                newCount: memberNewCount,
                usedCount: memberUsedCount,
                totalCount: memberNewCount + memberUsedCount,
                frontEnd: memberFrontEnd,
                backEnd: memberBackEnd,
                gross: memberGross
            });
        });

        // Sort members by total count descending
        memberStats.sort((a, b) => b.totalCount - a.totalCount);

        const totalCount = totalNewCount + totalUsedCount;

        return { totalCount, totalNewCount, totalUsedCount, totalNewGross, totalUsedGross, memberStats };
    };

    // Get today's sales (actual daily count)
    const getTodaySales = () => {
        const cstDate = getCSTDate();
        const todayStr = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}-${String(cstDate.getDate()).padStart(2, '0')}`;

        let todayNewCount = 0;
        let todayUsedCount = 0;

        sales.forEach(s => {
            if (s.saleDate === todayStr) {
                const isNew = (s.carType || 'new') === 'new';
                const mult = s.isSplit ? 0.5 : 1;

                if (isNew) {
                    todayNewCount += mult;
                } else {
                    todayUsedCount += mult;
                }

                // Also count if this person is secondary on split
                if (s.secondSalespersonId) {
                    if (isNew) {
                        todayNewCount += 0.5;
                    } else {
                        todayUsedCount += 0.5;
                    }
                }
            }
        });

        return { todayNewCount, todayUsedCount };
    };

    // Get overall competition stats
    const getCompetitionStats = () => {
        let totalNewSales = 0;
        let totalUsedSales = 0;
        let totalNewGross = 0;
        let totalUsedGross = 0;

        teams.forEach(team => {
            const stats = getTeamStats(team);
            totalNewSales += stats.totalNewCount;
            totalUsedSales += stats.totalUsedCount;
            totalNewGross += stats.totalNewGross;
            totalUsedGross += stats.totalUsedGross;
        });

        return { totalNewSales, totalUsedSales, totalSales: totalNewSales + totalUsedSales, totalNewGross, totalUsedGross };
    };

    // Sort teams by performance
    const sortedTeams = useMemo(() => {
        return [...teams].map(team => ({
            ...team,
            stats: getTeamStats(team)
        })).sort((a, b) => b.stats.totalCount - a.stats.totalCount);
    }, [teams, sales, salespeople]);

    const competitionStats = getCompetitionStats();
    const todaySales = getTodaySales();
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
        <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-3 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative mb-3 flex-shrink-0">
                {/* Title and Quote - Centered */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-1">
                        Brandon Tomes Subaru
                    </h1>
                    {settings?.quoteOfTheDay && (
                        <p className="text-base text-blue-400 font-medium italic max-w-4xl mx-auto">
                            "{settings.quoteOfTheDay}"
                        </p>
                    )}
                </div>

                {/* Clock - Absolute Right */}
                <div className="absolute top-0 right-0 text-right">
                    <div className="text-3xl font-bold text-white tabular-nums">
                        {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-gray-500 text-sm">
                        {currentTime.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Competition Summary */}
            <div className="grid grid-cols-4 gap-3 mb-3 flex-shrink-0">
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">New Sold Today</div>
                    <div className="text-3xl font-bold text-white">
                        {todaySales.todayNewCount % 1 === 0 ? todaySales.todayNewCount : todaySales.todayNewCount.toFixed(1)}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Used Sold Today</div>
                    <div className="text-3xl font-bold text-white">
                        {todaySales.todayUsedCount % 1 === 0 ? todaySales.todayUsedCount : todaySales.todayUsedCount.toFixed(1)}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Total New Car Gross</div>
                    <div className={`text-3xl font-bold ${competitionStats.totalNewGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(competitionStats.totalNewGross)}
                    </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 border border-gray-700/50">
                    <div className="text-gray-400 text-sm font-medium mb-1">Total Used Car Gross</div>
                    <div className={`text-3xl font-bold ${competitionStats.totalUsedGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(competitionStats.totalUsedGross)}
                    </div>
                </div>
            </div>

            {/* Teams Grid - Side by Side */}
            <div className={`grid gap-3 flex-1 overflow-hidden ${sortedTeams.length === 2 ? 'grid-cols-2' : sortedTeams.length >= 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {sortedTeams.map((team, index) => {
                    const { totalCount, totalNewCount, totalUsedCount, totalNewGross, totalUsedGross, memberStats } = team.stats;
                    const goalProgress = team.goal > 0 ? (totalCount / team.goal) * 100 : 0;
                    const isTopThree = index < 3;

                    return (
                        <div
                            key={team.id}
                            className="bg-gray-800/60 backdrop-blur rounded-xl overflow-hidden border border-gray-700/50 transition-all duration-300 flex flex-col"
                            style={{ borderTopWidth: '4px', borderTopColor: team.color }}
                        >
                            {/* Team Header */}
                            <div className="px-3 py-2 border-b border-gray-700/50 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    {/* Team Name + Stats */}
                                    <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <h2 className="text-xl font-bold text-white truncate">{team.name}</h2>
                                            {team.contestName && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: team.color, color: 'white' }}
                                                >
                                                    {team.contestName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {team.members.length}
                                            </span>
                                            {team.startDate && team.endDate && (
                                                <span>
                                                    {new Date(team.startDate).toLocaleDateString()} - {new Date(team.endDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sales Counters - New / Used / Total */}
                                    <div className="flex items-center gap-1 flex-shrink-0 bg-gray-900/50 rounded-lg px-3 py-1.5">
                                        <div className="text-center px-2 border-r border-gray-700">
                                            <div className="text-xl font-bold text-blue-400 tabular-nums leading-tight">
                                                {totalNewCount % 1 === 0 ? totalNewCount : totalNewCount.toFixed(1)}
                                            </div>
                                            <div className="text-gray-400 text-[10px] font-medium">New</div>
                                        </div>
                                        <div className="text-center px-2 border-r border-gray-700">
                                            <div className="text-xl font-bold text-orange-400 tabular-nums leading-tight">
                                                {totalUsedCount % 1 === 0 ? totalUsedCount : totalUsedCount.toFixed(1)}
                                            </div>
                                            <div className="text-gray-400 text-[10px] font-medium">Used</div>
                                        </div>
                                        <div className="text-center px-2">
                                            <div className="text-2xl font-bold text-white tabular-nums leading-tight">
                                                {totalCount % 1 === 0 ? totalCount : totalCount.toFixed(1)}
                                            </div>
                                            <div className="text-gray-400 text-[10px] font-medium">Total</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Stats Row */}
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex-1 text-center">
                                        <div className={`text-base font-bold ${totalNewGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(totalNewGross)}
                                        </div>
                                        <div className="text-gray-500 text-[10px]">New Gross</div>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <div className={`text-base font-bold ${totalUsedGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(totalUsedGross)}
                                        </div>
                                        <div className="text-gray-500 text-[10px]">Used Gross</div>
                                    </div>
                                    {team.goal > 0 && (
                                        <div className="flex-1">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <Target size={12} className="text-gray-400" />
                                                <span className="text-gray-400 text-xs">{team.goal}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${goalProgress >= 100
                                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                        : 'bg-gradient-to-r from-blue-400 to-purple-500'
                                                        }`}
                                                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-gray-400 text-center">{goalProgress.toFixed(0)}%</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Members - Compact for 10 members without scrolling */}
                            <div className="px-3 py-1.5 flex-1 overflow-hidden">
                                <div className="flex flex-col gap-1 h-full">
                                    {memberStats.slice(0, 10).map((member, memberIndex) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-2.5 bg-gray-900/40 rounded-lg px-2.5 py-1.5 flex-1 min-h-0"
                                        >
                                            {/* Rank */}
                                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                                                {memberIndex + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                                style={{ backgroundColor: team.color }}
                                            >
                                                {member.name.charAt(0)}
                                            </div>

                                            {/* Name */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-white truncate">{member.name}</div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {/* Unit Counters */}
                                                <div className="flex items-center gap-1 bg-gray-800/50 rounded px-2 py-1">
                                                    <div className="text-center w-7">
                                                        <div className="text-sm font-bold text-blue-400 tabular-nums leading-tight">
                                                            {member.newCount % 1 === 0 ? member.newCount : member.newCount.toFixed(1)}
                                                        </div>
                                                        <div className="text-[8px] text-gray-500">New</div>
                                                    </div>
                                                    <div className="text-center w-7">
                                                        <div className="text-sm font-bold text-orange-400 tabular-nums leading-tight">
                                                            {member.usedCount % 1 === 0 ? member.usedCount : member.usedCount.toFixed(1)}
                                                        </div>
                                                        <div className="text-[8px] text-gray-500">Used</div>
                                                    </div>
                                                    <div className="text-center w-7 border-l border-gray-600 pl-1">
                                                        <div className="text-base font-bold text-white tabular-nums leading-tight">
                                                            {member.totalCount % 1 === 0 ? member.totalCount : member.totalCount.toFixed(1)}
                                                        </div>
                                                        <div className="text-[8px] text-gray-500">Tot</div>
                                                    </div>
                                                </div>
                                                {/* Gross Stats */}
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.frontEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.frontEnd)}
                                                    </div>
                                                    <div className="text-[8px] text-gray-500">Front</div>
                                                </div>
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.backEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.backEnd)}
                                                    </div>
                                                    <div className="text-[8px] text-gray-500">Back</div>
                                                </div>
                                                <div className="text-center w-20">
                                                    <div className={`text-sm font-semibold ${member.gross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(member.gross)}
                                                    </div>
                                                    <div className="text-[8px] text-gray-500">Gross</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {memberStats.length === 0 && (
                                        <div className="text-center text-gray-500 py-3 text-base">No members assigned</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-1.5 text-center text-gray-600 text-xs flex-shrink-0">
                Auto-refreshes every 5 minutes
            </div>
        </div>
    );
}
