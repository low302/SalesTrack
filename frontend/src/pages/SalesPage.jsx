import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Plus, Search, Edit2, Trash2, X, Loader2, ChevronDown, FileText, CheckSquare, Calendar, Upload, AlertTriangle, Check, Eye } from 'lucide-react';

// Helper to get current date in CST
const getCSTDate = () => {
  const now = new Date();
  const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  return new Date(cstString);
};

// Helper to format date as YYYY-MM-DD in CST
const formatDateCST = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get date range presets in CST
const getDatePresets = () => {
  const cstDate = getCSTDate();
  const year = cstDate.getFullYear();
  const month = cstDate.getMonth();
  const day = cstDate.getDate();
  const dayOfWeek = cstDate.getDay(); // 0 = Sunday

  // Current Month: 1st of current month to today
  const currentMonthStart = new Date(year, month, 1);
  const currentMonthEnd = new Date(year, month + 1, 0); // Last day of current month

  // Last Month
  const lastMonthStart = new Date(year, month - 1, 1);
  const lastMonthEnd = new Date(year, month, 0); // Last day of previous month

  // This Week (Monday to Sunday)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekStart = new Date(year, month, day + mondayOffset);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  // Last Week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  return {
    currentMonth: { start: formatDateCST(currentMonthStart), end: formatDateCST(currentMonthEnd), label: 'Current Month' },
    lastMonth: { start: formatDateCST(lastMonthStart), end: formatDateCST(lastMonthEnd), label: 'Last Month' },
    thisWeek: { start: formatDateCST(thisWeekStart), end: formatDateCST(thisWeekEnd), label: 'This Week' },
    lastWeek: { start: formatDateCST(lastWeekStart), end: formatDateCST(lastWeekEnd), label: 'Last Week' },
    all: { start: '', end: '', label: 'All Time' }
  };
};

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('currentMonth'); // Default to current month
  const [filters, setFilters] = useState(() => {
    const presets = getDatePresets();
    return {
      startDate: presets.currentMonth.start,
      endDate: presets.currentMonth.end,
      salespersonId: '',
      cpo: false,
      sslp: false
    };
  });
  const [formData, setFormData] = useState({
    dealNumber: '', stockNumber: '', frontEnd: '', backEnd: '', shopBill: '', salespersonName: '', salesperson2Name: '',
    saleDate: formatDateCST(getCSTDate()),
    customerName: '', serviceComplete: false, cpo: false, sslp: false, delivered: false, notes: ''
  });
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const salespersonInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // PDF Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Sale detail popup state
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);

  const api = useApi();
  const datePresets = useMemo(() => getDatePresets(), []);

  useEffect(() => { loadData(); }, [filters]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        salespersonInputRef.current && !salespersonInputRef.current.contains(event.target)) {
        setShowSalespersonDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [salesData, salespeopleData] = await Promise.all([api.getSales(filters), api.getSalespeople()]);
      setSales(salesData);
      setSalespeople(salespeopleData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const presetData = datePresets[preset];
    setFilters(prev => ({
      ...prev,
      startDate: presetData.start,
      endDate: presetData.end
    }));
  };

  const handleCustomDateChange = (field, value) => {
    setDatePreset('custom');
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Combine salesperson names if salesperson2 is set
      let combinedSalespersonName = formData.salespersonName;
      if (formData.salesperson2Name && formData.salesperson2Name.trim()) {
        combinedSalespersonName = `${formData.salespersonName}/${formData.salesperson2Name}`;
      }

      const saleData = {
        ...formData,
        salespersonName: combinedSalespersonName,
        frontEnd: parseFloat(formData.frontEnd) || 0,
        backEnd: parseFloat(formData.backEnd) || 0,
        shopBill: parseFloat(formData.shopBill) || 0
      };
      delete saleData.salesperson2Name; // Remove separate field, backend uses combined name

      if (editingSale) await api.updateSale(editingSale.id, saleData);
      else await api.createSale(saleData);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save sale:', error);
    }
  };

  // Row selection handlers
  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredSales.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredSales.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} sale(s)?`)) return;

    try {
      for (const id of selectedRows) {
        await api.deleteSale(id);
      }
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to delete sales:', error);
    }
  };

  const handleExportPDF = () => {
    if (selectedRows.size === 0) return;

    const selectedSales = filteredSales.filter(s => selectedRows.has(s.id));
    const totalFront = selectedSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
    const totalBack = selectedSales.reduce((sum, s) => sum + (s.backEnd || 0), 0);
    const totalGross = selectedSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);

    const printContent = `
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; font-weight: bold; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; }
            .badge-cpo { background: #3b82f6; color: white; }
            .badge-sslp { background: #8b5cf6; color: white; }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <p>Generated: ${getCSTDate().toLocaleDateString()} | ${selectedSales.length} sales selected</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Deal #</th>
                <th>Stock #</th>
                <th>Customer</th>
                <th>Salesperson</th>
                <th class="text-right">Front</th>
                <th class="text-right">Back</th>
                <th class="text-right">Gross</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${selectedSales.map(sale => `
                <tr>
                  <td>${new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td>${sale.dealNumber || '-'}</td>
                  <td>${sale.stockNumber || '-'}</td>
                  <td>${sale.customerName || '-'}</td>
                  <td>${getSalespersonName(sale)}</td>
                  <td class="text-right">${formatCurrency(sale.frontEnd || 0)}</td>
                  <td class="text-right">${formatCurrency(sale.backEnd || 0)}</td>
                  <td class="text-right">${formatCurrency(sale.grossProfit || 0)}</td>
                  <td>
                    ${sale.cpo ? '<span class="badge badge-cpo">CPO</span>' : ''}
                    ${sale.sslp ? '<span class="badge badge-sslp">SSLP</span>' : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Front End: ${formatCurrency(totalFront)}</p>
            <p>Total Back End: ${formatCurrency(totalBack)}</p>
            <p>Total Gross: ${formatCurrency(totalGross)}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    try { await api.deleteSale(id); loadData(); } catch (error) { console.error('Failed to delete sale:', error); }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    const sp1 = salespeople.find(sp => sp.id === sale.salespersonId);
    const sp2 = sale.secondSalespersonId ? salespeople.find(sp => sp.id === sale.secondSalespersonId) : null;
    setFormData({
      dealNumber: sale.dealNumber || '', stockNumber: sale.stockNumber || '',
      frontEnd: sale.frontEnd?.toString() || '', backEnd: sale.backEnd?.toString() || '',
      shopBill: sale.shopBill?.toString() || '',
      salespersonName: sp1?.name || '', salesperson2Name: sp2?.name || '',
      saleDate: sale.saleDate, customerName: sale.customerName || '',
      serviceComplete: sale.serviceComplete || false, cpo: sale.cpo || false,
      sslp: sale.sslp || false, delivered: sale.delivered || false, notes: sale.notes || ''
    });
    setSalespersonSearch(sp1?.name || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSale(null);
    setFormData({
      dealNumber: '', stockNumber: '', frontEnd: '', backEnd: '', shopBill: '', salespersonName: '', salesperson2Name: '',
      saleDate: formatDateCST(getCSTDate()),
      customerName: '', serviceComplete: false, cpo: false, sslp: false, delivered: false, notes: ''
    });
    setSalespersonSearch('');
  };

  const handleSalespersonInputChange = (value) => {
    // Check for / separator and auto-split
    if (value.includes('/')) {
      const parts = value.split('/').map(p => p.trim());
      setSalespersonSearch(parts[0]);
      setFormData({
        ...formData,
        salespersonName: parts[0],
        salesperson2Name: parts[1] || ''
      });
    } else {
      setSalespersonSearch(value);
      setFormData({ ...formData, salespersonName: value });
    }
    setShowSalespersonDropdown(true);
  };

  const handleSalespersonSelect = (name) => {
    setSalespersonSearch(name);
    setFormData({ ...formData, salespersonName: name });
    setShowSalespersonDropdown(false);
  };

  const handleSalesperson2Change = (name) => {
    setFormData({ ...formData, salesperson2Name: name });
  };

  const getFilteredSalespeople = () => {
    if (!salespersonSearch) return salespeople.filter(sp => sp.active);
    return salespeople.filter(sp =>
      sp.active && sp.name.toLowerCase().includes(salespersonSearch.toLowerCase())
    );
  };

  // PDF Import handlers
  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportResult(null);
    }
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const result = await api.importSalesPDF(importFile);
      if (result.error) {
        alert(result.error);
      } else {
        setImportPreview(result);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to parse PDF: ' + error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportActionChange = (index, action) => {
    if (!importPreview) return;
    const updatedRecords = [...importPreview.records];
    updatedRecords[index] = { ...updatedRecords[index], duplicateAction: action };
    setImportPreview({ ...importPreview, records: updatedRecords });
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const result = await api.confirmSalesImport(importPreview.records);
      if (result.error) {
        alert(result.error);
      } else {
        setImportResult(result);
        loadData(); // Refresh the sales list
      }
    } catch (error) {
      console.error('Confirm import error:', error);
      alert('Failed to import: ' + error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  const getSalespersonName = (sale) => {
    const sp1 = salespeople.find(sp => sp.id === sale.salespersonId);
    if (sale.isSplit && sale.secondSalespersonId) {
      const sp2 = salespeople.find(sp => sp.id === sale.secondSalespersonId);
      return `${sp1?.name || 'Unknown'} / ${sp2?.name || 'Unknown'}`;
    }
    return sp1?.name || 'Unknown';
  };

  // Apply filters including CPO and SSLP
  let filteredSales = sales.filter(sale =>
  (sale.dealNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  if (filters.cpo) filteredSales = filteredSales.filter(s => s.cpo);
  if (filters.sslp) filteredSales = filteredSales.filter(s => s.sslp);

  // Calculate stats using the current CST month/year
  const cstDate = getCSTDate();
  const currentMonthStr = `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = `${cstDate.getFullYear()}`;

  const mtdSales = sales.filter(s => s.saleDate?.startsWith(currentMonthStr));
  const ytdSales = sales.filter(s => s.saleDate?.startsWith(currentYearStr));

  const mtdStats = {
    count: mtdSales.length,
    frontEnd: mtdSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
    backEnd: mtdSales.reduce((sum, s) => sum + (s.backEnd || 0), 0),
    gross: mtdSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0)
  };

  const ytdStats = {
    count: ytdSales.length,
    frontEnd: ytdSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
    backEnd: ytdSales.reduce((sum, s) => sum + (s.backEnd || 0), 0),
    gross: ytdSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0)
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filteredSalespeopleList = getFilteredSalespeople();
  const isNewSalesperson = salespersonSearch && !salespeople.some(sp => sp.name.toLowerCase() === salespersonSearch.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-base-content/60">Manage vehicle sales records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline btn-primary">
            <Upload size={20} /> Import PDF
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
            <Plus size={20} /> New Sale
          </button>
        </div>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex flex-col gap-4">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 mr-2">
                <Calendar size={16} className="text-base-content/60" />
                <span className="text-sm font-medium text-base-content/60">Quick Filter:</span>
              </div>
              {Object.entries(datePresets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleDatePresetChange(key)}
                  className={`btn btn-sm ${datePreset === key ? 'btn-primary' : 'btn-outline'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="form-control flex-1">
                <label className="input input-bordered flex items-center gap-2">
                  <Search size={18} />
                  <input type="text" placeholder="Search by Deal #, Stock #, or customer..." className="grow" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </label>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={filters.startDate}
                  onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                />
                <span className="text-base-content/60">to</span>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={filters.endDate}
                  onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                />
              </div>
              <select className="select select-bordered select-sm" value={filters.salespersonId} onChange={(e) => setFilters({ ...filters, salespersonId: e.target.value })}>
                <option value="">All Salespeople</option>
                {salespeople.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={filters.cpo} onChange={(e) => setFilters({ ...filters, cpo: e.target.checked })} />
                <span className="label-text">CPO</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-sm checkbox-accent" checked={filters.sslp} onChange={(e) => setFilters({ ...filters, sslp: e.target.checked })} />
                <span className="label-text">SSLP</span>
              </label>
              {(filters.startDate || filters.endDate || filters.salespersonId || filters.cpo || filters.sslp) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDatePreset('all');
                    setFilters({ startDate: '', endDate: '', salespersonId: '', cpo: false, sslp: false });
                  }}
                >
                  <X size={16} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedRows.size > 0 && (
        <div className="alert bg-base-200 shadow-md">
          <CheckSquare size={20} />
          <span>{selectedRows.size} sale(s) selected</span>
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="btn btn-sm btn-outline">
              <FileText size={16} /> Export PDF
            </button>
            <button onClick={handleBulkDelete} className="btn btn-sm btn-error btn-outline">
              <Trash2 size={16} /> Delete Selected
            </button>
            <button onClick={() => setSelectedRows(new Set())} className="btn btn-sm btn-ghost">
              <X size={16} /> Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead className="bg-base-200">
              <tr className="text-xs">
                <th className="text-center w-8">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={filteredSales.length > 0 && selectedRows.size === filteredSales.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-center">Date</th>
                <th className="text-center">Deal #</th>
                <th className="text-center">Customer</th>
                <th className="text-center">Vehicle</th>
                <th className="text-center">Stock #</th>
                <th className="text-center">Salesperson</th>
                <th className="text-center">Front</th>
                <th className="text-center">Back</th>
                <th className="text-center">Gross</th>
                <th className="text-center">Status</th>
                <th className="text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredSales.length === 0 ? (
                <tr><td colSpan="12" className="text-center py-8 text-base-content/60">No sales found for this period.</td></tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`hover cursor-pointer ${selectedRows.has(sale.id) ? 'bg-primary/10' : ''}`}
                    onClick={() => setSelectedSaleForDetail(sale)}
                  >
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={selectedRows.has(sale.id)}
                        onChange={() => toggleRowSelection(sale.id)}
                      />
                    </td>
                    <td className="text-center whitespace-nowrap">{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td className="text-center font-medium">{sale.dealNumber || '-'}</td>
                    <td className="text-center max-w-[120px] truncate" title={sale.customerName}>{sale.customerName || '-'}</td>
                    <td className="text-center whitespace-nowrap max-w-[100px] truncate" title={`${sale.vehicleYear || ''} ${sale.vehicleModel || ''}`}>
                      {sale.vehicleYear && sale.vehicleModel ? `${sale.vehicleYear} ${sale.vehicleModel}` : '-'}
                    </td>
                    <td className="text-center">{sale.stockNumber || '-'}</td>
                    <td className="text-center max-w-[110px] truncate" title={getSalespersonName(sale)}>
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate">{getSalespersonName(sale)}</span>
                        {sale.isSplit && <span className="badge badge-xs badge-warning flex-shrink-0">Split</span>}
                      </div>
                    </td>
                    <td className={`text-center font-medium ${(sale.frontEnd || 0) < 0 ? 'text-error' : 'text-success'}`}>{formatCurrency(sale.frontEnd || 0)}</td>
                    <td className={`text-center ${(sale.backEnd || 0) < 0 ? 'text-error' : 'text-success'}`}>{formatCurrency(sale.backEnd || 0)}</td>
                    <td className="text-center">
                      <span className={`font-semibold ${(sale.grossProfit || 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(sale.grossProfit || 0)}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        <span className={`badge badge-xs text-white ${sale.delivered ? 'bg-success' : 'bg-error'}`}>DEL</span>
                        <span className={`badge badge-xs text-white ${sale.serviceComplete ? 'bg-success' : 'bg-error'}`}>SVC</span>
                        {sale.cpo && <span className="badge badge-xs bg-info text-white">CPO</span>}
                        {sale.sslp && <span className="badge badge-xs bg-accent text-white">SSLP</span>}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedSaleForDetail(sale)} className="btn btn-ghost btn-xs btn-square" title="View Details"><Eye size={14} /></button>
                        <button onClick={() => handleEdit(sale)} className="btn btn-ghost btn-xs btn-square" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(sale.id)} className="btn btn-ghost btn-xs btn-square text-error" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MTD & YTD Stats - Using CST calculations */}
      <div className="grid grid-cols-2 gap-3">
        {/* Month to Date */}
        <div className="card bg-base-100 shadow-sm p-3">
          <div className="text-xs font-medium text-base-content/60 mb-2">
            Month to Date ({cstDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{mtdStats.count}</div>
              <div className="text-xs text-base-content/50">Sales</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${mtdStats.frontEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(mtdStats.frontEnd)}</div>
              <div className="text-xs text-base-content/50">Front</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${mtdStats.backEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(mtdStats.backEnd)}</div>
              <div className="text-xs text-base-content/50">Back</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${mtdStats.gross >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(mtdStats.gross)}</div>
              <div className="text-xs text-base-content/50">Gross</div>
            </div>
          </div>
        </div>

        {/* Year to Date */}
        <div className="card bg-base-100 shadow-sm p-3">
          <div className="text-xs font-medium text-base-content/60 mb-2">
            Year to Date ({currentYearStr})
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{ytdStats.count}</div>
              <div className="text-xs text-base-content/50">Sales</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${ytdStats.frontEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(ytdStats.frontEnd)}</div>
              <div className="text-xs text-base-content/50">Front</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${ytdStats.backEnd >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(ytdStats.backEnd)}</div>
              <div className="text-xs text-base-content/50">Back</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${ytdStats.gross >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(ytdStats.gross)}</div>
              <div className="text-xs text-base-content/50">Gross</div>
            </div>
          </div>
        </div>
      </div>

      {filteredSales.length > 0 && filteredSales.length !== sales.length && (
        <div className="card bg-base-100 shadow-sm p-3">
          <div className="text-xs font-medium text-base-content/60 mb-2">Filtered Results</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold">{filteredSales.length}</div>
              <div className="text-xs text-base-content/50">Sales</div>
            </div>
            <div>
              {(() => { const val = filteredSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0); return <div className={`text-lg font-semibold ${val >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(val)}</div>; })()}
              <div className="text-xs text-base-content/50">Front End</div>
            </div>
            <div>
              {(() => { const val = filteredSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0); return <div className={`text-lg font-semibold ${val >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(val)}</div>; })()}
              <div className="text-xs text-base-content/50">Gross</div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4">{editingSale ? 'Edit Sale' : 'New Sale'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Deal # *</span></label>
                  <input type="text" className="input input-bordered" placeholder="e.g., 12345" value={formData.dealNumber} onChange={(e) => setFormData({ ...formData, dealNumber: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Stock #</span></label>
                  <input type="text" className="input input-bordered" placeholder="e.g., STK001" value={formData.stockNumber} onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Front End *</span></label>
                  <input type="number" step="0.01" className="input input-bordered" placeholder="2500" value={formData.frontEnd} onChange={(e) => setFormData({ ...formData, frontEnd: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Back End *</span></label>
                  <input type="number" step="0.01" className="input input-bordered" placeholder="1500" value={formData.backEnd} onChange={(e) => setFormData({ ...formData, backEnd: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Shop Bill</span></label>
                  <input type="number" step="0.01" className="input input-bordered" placeholder="0" value={formData.shopBill} onChange={(e) => setFormData({ ...formData, shopBill: e.target.value })} />
                </div>
                <div className="form-control relative">
                  <label className="label"><span className="label-text">Salesperson *</span></label>
                  <div className="relative">
                    <input
                      ref={salespersonInputRef}
                      type="text"
                      className="input input-bordered w-full pr-8"
                      placeholder="Type or select (use / for splits)"
                      value={salespersonSearch}
                      onChange={(e) => handleSalespersonInputChange(e.target.value)}
                      onFocus={() => setShowSalespersonDropdown(true)}
                      required
                    />
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 cursor-pointer"
                      onClick={() => setShowSalespersonDropdown(!showSalespersonDropdown)}
                    />
                  </div>
                  {showSalespersonDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      {isNewSalesperson && (
                        <div
                          className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-content bg-success/10 text-success flex items-center gap-2"
                          onClick={() => handleSalespersonSelect(salespersonSearch)}
                        >
                          <Plus size={16} />
                          Add new: "{salespersonSearch}"
                        </div>
                      )}
                      {filteredSalespeopleList.map(sp => (
                        <div
                          key={sp.id}
                          className="px-4 py-2 cursor-pointer hover:bg-base-200"
                          onClick={() => handleSalespersonSelect(sp.name)}
                        >
                          {sp.name}
                        </div>
                      ))}
                      {filteredSalespeopleList.length === 0 && !isNewSalesperson && (
                        <div className="px-4 py-2 text-base-content/60">No salespeople found</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Salesperson 2 (Split)</span></label>
                  <select
                    className="select select-bordered"
                    value={formData.salesperson2Name}
                    onChange={(e) => handleSalesperson2Change(e.target.value)}
                  >
                    <option value="">None</option>
                    {salespeople.filter(sp => sp.active).map(sp => (
                      <option key={sp.id} value={sp.name}>{sp.name}</option>
                    ))}
                  </select>
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">Select for split deals (50% credit each)</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Sale Date *</span></label>
                  <input type="date" className="input input-bordered" value={formData.saleDate} onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Customer Name</span></label>
                  <input type="text" className="input input-bordered" placeholder="John Doe" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Status</span></label>
                  <div className="flex flex-wrap gap-4">
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm checkbox-info" checked={formData.serviceComplete} onChange={(e) => setFormData({ ...formData, serviceComplete: e.target.checked })} />
                      <span className="label-text">Service Complete</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={formData.cpo} onChange={(e) => setFormData({ ...formData, cpo: e.target.checked })} />
                      <span className="label-text">CPO</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm checkbox-accent" checked={formData.sslp} onChange={(e) => setFormData({ ...formData, sslp: e.target.checked })} />
                      <span className="label-text">SSLP</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm checkbox-success" checked={formData.delivered} onChange={(e) => setFormData({ ...formData, delivered: e.target.checked })} />
                      <span className="label-text">Delivered</span>
                    </label>
                  </div>
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Notes</span></label>
                  <textarea className="textarea textarea-bordered" placeholder="Additional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSale ? 'Update' : 'Create'} Sale</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowModal(false); resetForm(); }}></div>
        </div>
      )}

      {/* PDF Import Modal */}
      {showImportModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl max-h-[90vh] flex flex-col">
            <button onClick={resetImportModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Upload size={20} className="text-primary" />
              Import Sales from F&I Report PDF
            </h3>

            {/* Step 1: File Upload */}
            {!importPreview && !importResult && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleImportFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <FileText size={48} className="mx-auto text-base-content/30 mb-4" />
                    <p className="text-lg font-medium mb-2">
                      {importFile ? importFile.name : 'Select F&I Management Report PDF'}
                    </p>
                    <p className="text-sm text-base-content/60">Click to browse or drag and drop</p>
                  </label>
                </div>
                {importFile && (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="btn btn-ghost">
                      Clear
                    </button>
                    <button onClick={handleImportUpload} className="btn btn-primary" disabled={importLoading}>
                      {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : 'Parse PDF'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Preview Records */}
            {importPreview && !importResult && (
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="badge badge-lg badge-primary">{importPreview.totalRecords} Records</span>
                    {importPreview.duplicates > 0 && (
                      <span className="badge badge-lg badge-warning flex items-center gap-1">
                        <AlertTriangle size={14} /> {importPreview.duplicates} Duplicates
                      </span>
                    )}
                    {importPreview.newSalespeople > 0 && (
                      <span className="badge badge-lg badge-info">{importPreview.newSalespeople} New Salespeople</span>
                    )}
                  </div>
                </div>

                <div className="overflow-auto flex-1 border border-base-300 rounded-lg">
                  <table className="table table-xs table-pin-rows">
                    <thead>
                      <tr className="bg-base-200">
                        <th>Status</th>
                        <th>Date</th>
                        <th>Deal #</th>
                        <th>Vehicle</th>
                        <th>Customer</th>
                        <th>Salesperson</th>
                        <th className="text-right">Front</th>
                        <th className="text-right">Back</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.records.map((record, idx) => (
                        <tr key={idx} className={record.isDuplicate ? 'bg-warning/10' : ''}>
                          <td>
                            {record.isDuplicate ? (
                              <span className="badge badge-sm badge-warning">Duplicate</span>
                            ) : (
                              <span className="badge badge-sm badge-success">New</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap">{record.saleDate}</td>
                          <td className="font-medium">{record.dealNumber}</td>
                          <td className="max-w-[150px] truncate" title={`${record.vehicleYear} ${record.vehicleMake} ${record.vehicleModel}`}>
                            {record.vehicleYear} {record.vehicleMake} {record.vehicleModel}
                          </td>
                          <td className="max-w-[120px] truncate" title={record.customerName}>{record.customerName}</td>
                          <td className="max-w-[120px] truncate">
                            <div className="flex items-center gap-1">
                              {record.salesperson1?.name || 'Unknown'}
                              {!record.salesperson1Exists && record.salesperson1 && (
                                <span className="badge badge-xs badge-info">New</span>
                              )}
                            </div>
                          </td>
                          <td className={`text-right ${record.frontEnd < 0 ? 'text-error' : ''}`}>
                            {formatCurrency(record.frontEnd)}
                          </td>
                          <td className="text-right">{formatCurrency(record.backEnd)}</td>
                          <td>
                            {record.isDuplicate ? (
                              <select
                                className="select select-xs select-bordered w-24"
                                value={record.duplicateAction}
                                onChange={(e) => handleImportActionChange(idx, e.target.value)}
                              >
                                <option value="skip">Skip</option>
                                <option value="update">Update</option>
                                <option value="create">Create</option>
                              </select>
                            ) : (
                              <span className="text-success text-xs">Will Create</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button onClick={() => { setImportPreview(null); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="btn btn-ghost">
                    ← Back
                  </button>
                  <button onClick={handleConfirmImport} className="btn btn-primary" disabled={importLoading}>
                    {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Check size={16} /> Confirm Import</>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Import Results */}
            {importResult && (
              <div className="space-y-6 text-center py-8">
                <div className="text-success">
                  <Check size={64} className="mx-auto mb-4" />
                  <h4 className="text-2xl font-bold">Import Complete!</h4>
                </div>
                <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                  <div className="card bg-success/10 p-4">
                    <div className="text-2xl font-bold text-success">{importResult.created}</div>
                    <div className="text-xs text-base-content/60">Created</div>
                  </div>
                  <div className="card bg-info/10 p-4">
                    <div className="text-2xl font-bold text-info">{importResult.updated}</div>
                    <div className="text-xs text-base-content/60">Updated</div>
                  </div>
                  <div className="card bg-base-200 p-4">
                    <div className="text-2xl font-bold">{importResult.skipped}</div>
                    <div className="text-xs text-base-content/60">Skipped</div>
                  </div>
                  <div className="card bg-primary/10 p-4">
                    <div className="text-2xl font-bold text-primary">{importResult.salespeopleCreated}</div>
                    <div className="text-xs text-base-content/60">New Salespeople</div>
                  </div>
                </div>
                <button onClick={resetImportModal} className="btn btn-primary">
                  Done
                </button>
              </div>
            )}
          </div>
          <div className="modal-backdrop" onClick={resetImportModal}></div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSaleForDetail && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button onClick={() => setSelectedSaleForDetail(null)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Eye size={20} className="text-primary" />
              Sale Details - #{selectedSaleForDetail.dealNumber}
            </h3>

            <div className="space-y-4">
              {/* Vehicle & Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-base-200 p-4">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Customer</div>
                  <div className="font-semibold text-lg">{selectedSaleForDetail.customerName || 'N/A'}</div>
                </div>
                <div className="card bg-base-200 p-4">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Vehicle</div>
                  <div className="font-semibold text-lg">
                    {selectedSaleForDetail.vehicleYear && selectedSaleForDetail.vehicleMake && selectedSaleForDetail.vehicleModel
                      ? `${selectedSaleForDetail.vehicleYear} ${selectedSaleForDetail.vehicleMake} ${selectedSaleForDetail.vehicleModel}`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Deal Info */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Sale Date</div>
                  <div className="font-medium">{new Date(selectedSaleForDetail.saleDate).toLocaleDateString()}</div>
                </div>
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Deal #</div>
                  <div className="font-medium">{selectedSaleForDetail.dealNumber || '-'}</div>
                </div>
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Stock #</div>
                  <div className="font-medium">{selectedSaleForDetail.stockNumber || '-'}</div>
                </div>
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Deal Type</div>
                  <div className="font-medium">{selectedSaleForDetail.dealType || 'Retail'}</div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Front End</div>
                  <div className={`font-semibold ${(selectedSaleForDetail.frontEnd || 0) < 0 ? 'text-error' : ''}`}>
                    {formatCurrency(selectedSaleForDetail.frontEnd || 0)}
                  </div>
                </div>
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Back End</div>
                  <div className="font-semibold">{formatCurrency(selectedSaleForDetail.backEnd || 0)}</div>
                </div>
                <div className="card bg-base-200 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Shop Bill</div>
                  <div className="font-semibold">{formatCurrency(selectedSaleForDetail.shopBill || 0)}</div>
                </div>
                <div className="card bg-primary/10 p-3 text-center">
                  <div className="text-xs font-medium text-base-content/60 mb-1">Gross Profit</div>
                  <div className={`font-bold text-lg ${(selectedSaleForDetail.grossProfit || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(selectedSaleForDetail.grossProfit || 0)}
                  </div>
                </div>
              </div>

              {/* Salesperson Info */}
              <div className="card bg-base-200 p-4">
                <div className="text-xs font-medium text-base-content/60 mb-2">Salesperson</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getSalespersonName(selectedSaleForDetail)}</span>
                  {selectedSaleForDetail.isSplit && <span className="badge badge-warning badge-sm">Split Deal</span>}
                </div>
                {selectedSaleForDetail.deskManager && (
                  <div className="mt-2 text-sm text-base-content/60">
                    Desk Manager: <span className="font-medium text-base-content">{selectedSaleForDetail.deskManager}</span>
                  </div>
                )}
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`badge badge-lg ${selectedSaleForDetail.delivered ? 'badge-success' : 'badge-error'}`}>
                  {selectedSaleForDetail.delivered ? '✓' : '✗'} Delivered
                </span>
                <span className={`badge badge-lg ${selectedSaleForDetail.serviceComplete ? 'badge-success' : 'badge-error'}`}>
                  {selectedSaleForDetail.serviceComplete ? '✓' : '✗'} Service Complete
                </span>
                {selectedSaleForDetail.cpo && <span className="badge badge-lg badge-info">CPO</span>}
                {selectedSaleForDetail.sslp && <span className="badge badge-lg badge-accent">SSLP</span>}
                {selectedSaleForDetail.certified && <span className="badge badge-lg badge-primary">Certified</span>}
              </div>

              {/* Notes */}
              {selectedSaleForDetail.notes && (
                <div className="card bg-base-200 p-4">
                  <div className="text-xs font-medium text-base-content/60 mb-2">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedSaleForDetail.notes}</div>
                </div>
              )}

              {/* Vehicle Price if available */}
              {selectedSaleForDetail.vehiclePrice > 0 && (
                <div className="text-sm text-base-content/60 text-center">
                  Vehicle Price: {formatCurrency(selectedSaleForDetail.vehiclePrice)}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button onClick={() => { handleEdit(selectedSaleForDetail); setSelectedSaleForDetail(null); }} className="btn btn-outline btn-primary">
                <Edit2 size={16} /> Edit Sale
              </button>
              <button onClick={() => setSelectedSaleForDetail(null)} className="btn">Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setSelectedSaleForDetail(null)}></div>
        </div>
      )}
    </div>
  );
}
