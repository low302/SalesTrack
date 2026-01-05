import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Loader2, TrendingUp, TrendingDown, Target } from 'lucide-react';

export default function TeamDashboard() {
  const [salespeople, setSalespeople] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
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
      const [spData, salesData] = await Promise.all([api.getSalespeople(), api.getSales()]);
      setSalespeople(spData.filter(sp => sp.active));
      setSales(salesData);
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

  const getStats = (id, monthlyGoal = 0) => {
    let mtdCount = 0;
    let mtdFrontEnd = 0;
    let mtdProfit = 0;

    const cstDate = getCSTDate();
    const currentMonth = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;

    sales.forEach(s => {
      const isMTD = s.saleDate?.startsWith(currentMonth);
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

    // Calculate pace
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

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  // Get team totals
  const getTeamStats = () => {
    const cstDate = getCSTDate();
    const currentMonth = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;
    const mtdSales = sales.filter(s => s.saleDate?.startsWith(currentMonth));

    return {
      totalSales: mtdSales.length,
      totalFrontEnd: mtdSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
      totalGross: mtdSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0)
    };
  };

  const teamStats = getTeamStats();
  const cstDate = getCSTDate();
  const monthName = cstDate.toLocaleString('en-US', { month: 'long', timeZone: 'America/Chicago' });

  // Sort salespeople by MTD count descending
  const sortedSalespeople = [...salespeople].sort((a, b) => {
    const statsA = getStats(a.id, a.monthlyGoal || 0);
    const statsB = getStats(b.id, b.monthlyGoal || 0);
    return statsB.mtdCount - statsA.mtdCount;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Sales Leaderboard
          </h1>
          <p className="text-gray-400 text-lg mt-1">{monthName} {cstDate.getFullYear()}</p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold text-white tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-gray-500 text-sm">
            {currentTime.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-5 border border-gray-700/50">
          <div className="text-gray-400 text-sm font-medium mb-1">Team Sales</div>
          <div className="text-4xl font-bold text-white">{teamStats.totalSales}</div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-5 border border-gray-700/50">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Front End</div>
          <div className="text-4xl font-bold text-blue-400">{formatCurrency(teamStats.totalFrontEnd)}</div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-5 border border-gray-700/50">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Gross</div>
          <div className={`text-4xl font-bold ${teamStats.totalGross >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(teamStats.totalGross)}
          </div>
        </div>
      </div>

      {/* Salesperson Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedSalespeople.map((person, index) => {
          const stats = getStats(person.id, person.monthlyGoal || 0);
          const goalProgress = stats.monthlyGoal > 0 ? (stats.mtdCount / stats.monthlyGoal) * 100 : 0;
          const paceOnTrack = stats.monthlyGoal > 0 ? stats.projectedTotal >= stats.monthlyGoal : true;
          const isTopThree = index < 3;

          return (
            <div
              key={person.id}
              className={`relative bg-gray-800/60 backdrop-blur rounded-2xl p-5 border transition-all duration-300 ${
                isTopThree
                  ? index === 0
                    ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : index === 1
                    ? 'border-gray-400/50 shadow-lg shadow-gray-400/10'
                    : 'border-amber-700/50 shadow-lg shadow-amber-700/10'
                  : 'border-gray-700/50'
              }`}
            >
              {/* Rank Badge */}
              {isTopThree && (
                <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800' :
                  'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100'
                }`}>
                  {index + 1}
                </div>
              )}

              {/* Name and Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${
                  isTopThree
                    ? index === 0
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800'
                      : 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                }`}>
                  {person.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{person.name}</h3>
                  {!isTopThree && (
                    <span className="text-gray-500 text-sm">#{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Sales Count */}
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-white">
                  {stats.mtdCount % 1 === 0 ? stats.mtdCount : stats.mtdCount.toFixed(1)}
                </div>
                <div className="text-gray-400 text-sm">sales this month</div>
              </div>

              {/* Goal Progress */}
              {stats.monthlyGoal > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Target size={12} />
                      <span>Goal: {stats.monthlyGoal}</span>
                    </div>
                    <span className="text-xs text-gray-400">{goalProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goalProgress >= 100
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                          : 'bg-gradient-to-r from-blue-400 to-purple-500'
                      }`}
                      style={{ width: `${Math.min(goalProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Pace */}
              <div className={`flex items-center justify-center gap-2 text-sm ${
                paceOnTrack ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {paceOnTrack ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>Pace: {stats.projectedTotal} projected</span>
              </div>

              {/* Gross */}
              <div className="mt-3 pt-3 border-t border-gray-700/50 text-center">
                <span className={`text-lg font-semibold ${stats.mtdProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.mtdProfit)}
                </span>
                <span className="text-gray-500 text-xs ml-2">gross</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-600 text-sm">
        Auto-refreshes every 5 minutes
      </div>
    </div>
  );
}
