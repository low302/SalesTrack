import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Loader2, Calendar, GitCompare, X, ChevronDown } from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ReportsPage({ carTypeFilter = null, pageTitle = 'Reports' }) {
  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [compareMode, setCompareMode] = useState(null);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [dealTypeFilter, setDealTypeFilter] = useState(''); // '', 'Retail', 'Lease'
  const api = useApi();

  const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashboardData, salesData, salespeopleData, settingsData] = await Promise.all([
        api.getDashboard(), api.getSales(), api.getSalespeople(), api.getSettings()
      ]);
      setData(dashboardData);
      setSales(salesData);
      setSalespeople(salespeopleData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);

  // Date range helpers
  const getDateRange = (rangeType, customStart, customEnd) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start, end;

    switch (rangeType) {
      case 'thisWeek': {
        const dayOfWeek = today.getDay();
        start = new Date(today);
        start.setDate(today.getDate() - dayOfWeek);
        end = new Date(today);
        break;
      }
      case 'lastWeek': {
        const dayOfWeek = today.getDay();
        end = new Date(today);
        end.setDate(today.getDate() - dayOfWeek - 1);
        start = new Date(end);
        start.setDate(end.getDate() - 6);
        break;
      }
      case 'thisMonth': {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      }
      case 'lastMonth': {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      case 'lastQuarter': {
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const year = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
        start = new Date(year, lastQuarter * 3, 1);
        end = new Date(year, lastQuarter * 3 + 3, 0);
        break;
      }
      case 'custom': {
        start = customStart ? new Date(customStart) : new Date(today.getFullYear(), today.getMonth(), 1);
        end = customEnd ? new Date(customEnd) : today;
        break;
      }
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
    }

    return { start, end };
  };

  const getCompareRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'lastWeekVsThisWeek': {
        const dayOfWeek = today.getDay();
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - dayOfWeek);
        const thisWeekEnd = new Date(today);

        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

        return {
          primary: { start: thisWeekStart, end: thisWeekEnd, label: 'This Week' },
          compare: { start: lastWeekStart, end: lastWeekEnd, label: 'Last Week' }
        };
      }
      case 'lastMonthVsThisMonth': {
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today);

        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        return {
          primary: { start: thisMonthStart, end: thisMonthEnd, label: 'This Month' },
          compare: { start: lastMonthStart, end: lastMonthEnd, label: 'Last Month' }
        };
      }
      case 'lastYearMonthVsCurrentYearMonth': {
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today);

        const lastYearStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);

        return {
          primary: { start: thisMonthStart, end: thisMonthEnd, label: `${new Date().toLocaleString('default', { month: 'short' })} ${today.getFullYear()}` },
          compare: { start: lastYearStart, end: lastYearEnd, label: `${new Date().toLocaleString('default', { month: 'short' })} ${today.getFullYear() - 1}` }
        };
      }
      default:
        return null;
    }
  };

  // Filter sales by date range
  const filterSalesByRange = (salesData, start, end) => {
    return salesData.filter(s => {
      const saleDate = new Date(s.saleDate);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= start && saleDate <= end;
    });
  };

  // Get current date range
  const currentRange = useMemo(() => getDateRange(dateRange, customStartDate, customEndDate), [dateRange, customStartDate, customEndDate]);

  // Apply carType filter first if provided
  const carTypeFilteredSales = useMemo(() => {
    if (!carTypeFilter) return sales;
    return sales.filter(s => (s.carType || 'new') === carTypeFilter);
  }, [sales, carTypeFilter]);

  // Apply dealType filter
  const dealTypeFilteredSales = useMemo(() => {
    if (!dealTypeFilter) return carTypeFilteredSales;
    return carTypeFilteredSales.filter(s => s.dealType === dealTypeFilter);
  }, [carTypeFilteredSales, dealTypeFilter]);

  // Filtered sales for current range (use carType and dealType filtered sales)
  const filteredSales = useMemo(() => filterSalesByRange(dealTypeFilteredSales, currentRange.start, currentRange.end), [dealTypeFilteredSales, currentRange]);

  // Compare data
  const compareData = useMemo(() => {
    if (!compareMode) return null;
    const ranges = getCompareRange(compareMode);
    if (!ranges) return null;

    return {
      primary: {
        ...ranges.primary,
        sales: filterSalesByRange(dealTypeFilteredSales, ranges.primary.start, ranges.primary.end)
      },
      compare: {
        ...ranges.compare,
        sales: filterSalesByRange(dealTypeFilteredSales, ranges.compare.start, ranges.compare.end)
      }
    };
  }, [compareMode, dealTypeFilteredSales]);

  const getSalespersonName = (sale) => {
    const sp1 = salespeople.find(sp => sp.id === sale.salespersonId);
    if (sale.isSplit && sale.secondSalespersonId) {
      const sp2 = salespeople.find(sp => sp.id === sale.secondSalespersonId);
      return `${sp1?.name || 'Unknown'} / ${sp2?.name || 'Unknown'}`;
    }
    return sp1?.name || 'Unknown';
  };

  // Calculate sales by salesperson for pie chart (handles splits)
  const salesByPerson = useMemo(() => {
    const activeSales = compareMode ? (compareData?.primary.sales || []) : filteredSales;
    return salespeople.map(sp => {
      let count = 0;
      let frontEnd = 0;
      activeSales.forEach(s => {
        if (s.salespersonId === sp.id) {
          count += s.isSplit ? 0.5 : 1;
          frontEnd += s.isSplit ? (s.frontEnd || 0) / 2 : (s.frontEnd || 0);
        }
        if (s.secondSalespersonId === sp.id) {
          count += 0.5;
          frontEnd += (s.frontEnd || 0) / 2;
        }
      });
      return { name: sp.name, value: count, frontEnd };
    }).filter(s => s.value > 0);
  }, [salespeople, filteredSales, compareMode, compareData]);

  // Sales by day of week - now as line chart data
  const dayOfWeekData = useMemo(() => {
    const activeSales = compareMode ? (compareData?.primary.sales || []) : filteredSales;
    const compareSales = compareMode ? (compareData?.compare.sales || []) : [];

    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
      const daySales = activeSales.filter(s => new Date(s.saleDate).getDay() === index);
      const compareDay = compareSales.filter(s => new Date(s.saleDate).getDay() === index);

      const result = {
        day,
        count: daySales.length,
        frontEnd: daySales.reduce((sum, s) => sum + (s.frontEnd || 0), 0)
      };

      if (compareMode) {
        result.compareCount = compareDay.length;
        result.compareFrontEnd = compareDay.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
      }

      return result;
    });
  }, [filteredSales, compareMode, compareData]);

  // Generate daily data for date range
  const dailyData = useMemo(() => {
    const activeSales = compareMode ? (compareData?.primary.sales || []) : filteredSales;
    const compareSales = compareMode ? (compareData?.compare.sales || []) : [];

    const range = compareMode ? compareData?.primary : currentRange;
    if (!range) return [];

    const days = [];
    const current = new Date(range.start);
    const end = new Date(range.end);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const daySales = activeSales.filter(s => s.saleDate && s.saleDate.split('T')[0] === dateStr);

      const dayData = {
        date: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: daySales.length,
        frontEnd: daySales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
        gross: daySales.reduce((sum, s) => sum + (s.grossProfit || 0), 0)
      };

      if (compareMode && compareData) {
        // Find equivalent day in compare range
        const dayOffset = Math.floor((current - new Date(compareData.primary.start)) / (1000 * 60 * 60 * 24));
        const compareDate = new Date(compareData.compare.start);
        compareDate.setDate(compareDate.getDate() + dayOffset);
        const compareDateStr = compareDate.toISOString().split('T')[0];

        const compareDay = compareSales.filter(s => s.saleDate && s.saleDate.split('T')[0] === compareDateStr);
        dayData.compareCount = compareDay.length;
        dayData.compareFrontEnd = compareDay.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
        dayData.compareGross = compareDay.reduce((sum, s) => sum + (s.grossProfit || 0), 0);
      }

      days.push(dayData);
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [filteredSales, currentRange, compareMode, compareData]);

  const handleComparePreset = (preset) => {
    setCompareMode(preset);
    setShowCompareDropdown(false);
  };

  const clearCompare = () => {
    setCompareMode(null);
    setShowCompare(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data) return <div className="alert alert-error">Failed to load report data.</div>;

  const monthlyData = data.monthlySales.map(d => ({
    ...d, month: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }));

  // Calculate totals for summary
  const activeSales = compareMode ? (compareData?.primary.sales || []) : filteredSales;
  const totalFrontEnd = activeSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
  const totalBackEnd = activeSales.reduce((sum, s) => sum + (s.backEnd || 0), 0);
  const totalGross = activeSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);
  const cpoCount = activeSales.filter(s => s.cpo).length;
  const sslpCount = activeSales.filter(s => s.sslp).length;
  const currentPackAmount = settings?.packAmount || 500;
  const totalPack = activeSales.length * currentPackAmount;
  const avgPackAmount = currentPackAmount;
  const totalShopBill = activeSales.reduce((sum, s) => sum + (s.shopBill || 0), 0);
  const avgShopBill = activeSales.length > 0 ? totalShopBill / activeSales.length : 0;

  // Compare totals
  const compareTotals = compareMode && compareData ? {
    frontEnd: compareData.compare.sales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
    backEnd: compareData.compare.sales.reduce((sum, s) => sum + (s.backEnd || 0), 0),
    gross: compareData.compare.sales.reduce((sum, s) => sum + (s.grossProfit || 0), 0),
    cpo: compareData.compare.sales.filter(s => s.cpo).length,
    sslp: compareData.compare.sales.filter(s => s.sslp).length,
    count: compareData.compare.sales.length
  } : null;

  const getPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-base-content/60">Detailed sales analytics and insights{carTypeFilter ? ` (${carTypeFilter === 'new' ? 'New' : 'Used'} vehicles only)` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Deal Type Filter */}
          <select
            className="select select-bordered select-sm"
            value={dealTypeFilter}
            onChange={(e) => setDealTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Retail">Retail Only</option>
            <option value="Lease">Lease Only</option>
          </select>

          {/* Date Range Selector */}
          <select
            className="select select-bordered select-sm"
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              if (e.target.value !== 'custom') {
                setCompareMode(null);
              }
            }}
            disabled={compareMode !== null}
          >
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="lastQuarter">Last Quarter</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && !compareMode && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input input-bordered input-sm"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-base-content/60">to</span>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Compare Button & Dropdown */}
          <div className="relative">
            {compareMode ? (
              <button
                className="btn btn-sm btn-ghost gap-1 text-primary"
                onClick={clearCompare}
              >
                <X className="w-4 h-4" />
                Clear Compare
              </button>
            ) : (
              <button
                className="btn btn-sm btn-ghost gap-1 opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => setShowCompareDropdown(!showCompareDropdown)}
              >
                <GitCompare className="w-4 h-4" />
                Compare
                <ChevronDown className="w-3 h-3" />
              </button>
            )}

            {showCompareDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <p className="text-xs text-base-content/60 px-2 py-1 uppercase tracking-wide">Comparison Presets</p>
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-base-200 transition-colors text-sm"
                    onClick={() => handleComparePreset('lastWeekVsThisWeek')}
                  >
                    Last Week vs This Week
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-base-200 transition-colors text-sm"
                    onClick={() => handleComparePreset('lastMonthVsThisMonth')}
                  >
                    Last Month vs This Month
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-base-200 transition-colors text-sm"
                    onClick={() => handleComparePreset('lastYearMonthVsCurrentYearMonth')}
                  >
                    Same Month Last Year vs This Year
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare Mode Indicator */}
      {compareMode && compareData && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GitCompare className="w-5 h-5 text-primary" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary">{compareData.primary.label}</span>
              <span className="text-base-content/60">vs</span>
              <span className="font-medium text-secondary">{compareData.compare.label}</span>
            </div>
          </div>
          <div className="text-sm text-base-content/60">
            {compareData.primary.sales.length} sales vs {compareData.compare.sales.length} sales
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-2 gap-4 ${carTypeFilter === 'new' ? 'lg:grid-cols-3' : 'lg:grid-cols-6'}`}>
        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-title">Avg Front End</div>
          <div className="stat-value text-lg">{formatCurrency(activeSales.length > 0 ? totalFrontEnd / activeSales.length : 0)}</div>
          {compareMode && compareTotals && (
            <div className={`stat-desc ${getPercentChange(totalFrontEnd / (activeSales.length || 1), compareTotals.frontEnd / (compareTotals.count || 1)) >= 0 ? 'text-success' : 'text-error'}`}>
              {getPercentChange(totalFrontEnd / (activeSales.length || 1), compareTotals.frontEnd / (compareTotals.count || 1))}% vs previous
            </div>
          )}
        </div>
        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-title">Avg Gross</div>
          <div className="stat-value text-lg text-success">{formatCurrency(activeSales.length > 0 ? totalGross / activeSales.length : 0)}</div>
          {compareMode && compareTotals && (
            <div className={`stat-desc ${getPercentChange(totalGross / (activeSales.length || 1), compareTotals.gross / (compareTotals.count || 1)) >= 0 ? 'text-success' : 'text-error'}`}>
              {getPercentChange(totalGross / (activeSales.length || 1), compareTotals.gross / (compareTotals.count || 1))}% vs previous
            </div>
          )}
        </div>
        
        {/* Hide CPO, SSLP, and Shop Bill for New Car Reports */}
        {carTypeFilter !== 'new' && (
          <>
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">CPO Sales</div>
              <div className="stat-value text-lg">{cpoCount}</div>
              <div className="stat-desc">
                {activeSales.length > 0 ? ((cpoCount / activeSales.length) * 100).toFixed(0) : 0}% of total
                {compareMode && compareTotals && ` (was ${compareTotals.count > 0 ? ((compareTotals.cpo / compareTotals.count) * 100).toFixed(0) : 0}%)`}
              </div>
            </div>
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">SSLP Sales</div>
              <div className="stat-value text-lg">{sslpCount}</div>
              <div className="stat-desc">
                {activeSales.length > 0 ? ((sslpCount / activeSales.length) * 100).toFixed(0) : 0}% of total
                {compareMode && compareTotals && ` (was ${compareTotals.count > 0 ? ((compareTotals.sslp / compareTotals.count) * 100).toFixed(0) : 0}%)`}
              </div>
            </div>
          </>
        )}
        
        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-title">Total Pack</div>
          <div className="stat-value text-lg text-warning">{formatCurrency(totalPack)}</div>
          <div className="stat-desc">
            {activeSales.length} units × {formatCurrency(avgPackAmount)}
          </div>
        </div>
        
        {carTypeFilter !== 'new' && (
          <div className="stat bg-base-100 rounded-box shadow">
            <div className="stat-title">Total Shop Bill</div>
            <div className="stat-value text-lg text-error">{formatCurrency(totalShopBill)}</div>
            <div className="stat-desc">
              {activeSales.length} units × {formatCurrency(avgShopBill)}
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Daily Sales Trend</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name={compareMode ? compareData?.primary.label : "Sales Count"}
                    dot={false}
                  />
                  {compareMode && (
                    <Line
                      type="monotone"
                      dataKey="compareCount"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={compareData?.compare.label}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales by Salesperson */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Sales Distribution by Salesperson</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={salesByPerson} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {salesByPerson.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value.toFixed(1), `${props.payload.name}`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Now Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day of Week - Now Line Chart */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Sales by Day of Week</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    name={compareMode ? compareData?.primary.label : "Sales Count"}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                  />
                  {compareMode && (
                    <Line
                      type="monotone"
                      dataKey="compareCount"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={compareData?.compare.label}
                      dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Sales Volume - Now Line Chart */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-lg">Monthly Sales Volume</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    name="Vehicles Sold"
                    dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Salesperson Performance Table */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg">Salesperson Performance Summary</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Salesperson</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Front End</th>
                  <th className="text-right">Back End</th>
                  <th className="text-right">Total Gross</th>
                  <th className="text-right">Avg Gross</th>
                </tr>
              </thead>
              <tbody>
                {salespeople.map(sp => {
                  let units = 0;
                  let frontEnd = 0;
                  let backEnd = 0;
                  let gross = 0;

                  activeSales.forEach(s => {
                    if (s.salespersonId === sp.id) {
                      const mult = s.isSplit ? 0.5 : 1;
                      units += mult;
                      frontEnd += (s.frontEnd || 0) * mult;
                      backEnd += (s.backEnd || 0) * mult;
                      gross += (s.grossProfit || 0) * mult;
                    }
                    if (s.secondSalespersonId === sp.id) {
                      units += 0.5;
                      frontEnd += (s.frontEnd || 0) * 0.5;
                      backEnd += (s.backEnd || 0) * 0.5;
                      gross += (s.grossProfit || 0) * 0.5;
                    }
                  });

                  if (units === 0) return null;

                  return (
                    <tr key={sp.id} className="hover font-semibold">
                      <td>{sp.name}</td>
                      <td className="text-right">{units % 1 === 0 ? units : units.toFixed(1)}</td>
                      <td className={`text-right ${frontEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(frontEnd)}</td>
                      <td className={`text-right ${backEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(backEnd)}</td>
                      <td className="text-right"><span className={gross >= 0 ? 'text-success' : 'text-error'}>{formatCurrency(gross)}</span></td>
                      <td className={`text-right ${(units > 0 ? gross / units : 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(units > 0 ? gross / units : 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Profit Sales */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg">Top Profit Sales</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Deal #</th>
                  <th>Salesperson</th>
                  <th className="text-right">Front</th>
                  <th className="text-right">Back</th>
                  <th className="text-right">Gross</th>
                </tr>
              </thead>
              <tbody>
                {[...activeSales].sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0)).slice(0, 10).map(sale => (
                  <tr key={sale.id} className="hover font-semibold">
                    <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td>{sale.dealNumber || '-'}</td>
                    <td>{getSalespersonName(sale)}</td>
                    <td className={`text-right ${(sale.frontEnd || 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(sale.frontEnd)}</td>
                    <td className={`text-right ${(sale.backEnd || 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(sale.backEnd)}</td>
                    <td className={`text-right ${(sale.grossProfit || 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(sale.grossProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showCompareDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCompareDropdown(false)}
        />
      )}
    </div>
  );
}
