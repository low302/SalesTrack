import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Loader2, Save, Settings, DollarSign, Target, Upload, X, AlertTriangle, Check, Merge, Users, Monitor } from 'lucide-react';

// Helper to get current date in CST
const getCSTDate = () => {
  const now = new Date();
  const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  return new Date(cstString);
};

const formatDateCST = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Import CSV state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Merge duplicates state
  const [salespeople, setSalespeople] = useState([]);
  const [sales, setSales] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);

  const { isAdmin } = useAuth();
  const api = useApi();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [settingsData, spData, salesData] = await Promise.all([
        api.getSettings(),
        api.getSalespeople(),
        api.getSales()
      ]);
      if (!settingsData.monthlyTargets) {
        settingsData.monthlyTargets = {};
      }
      setSettings(settingsData);
      setSalespeople(spData);
      setSales(salesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleMonthlyTargetChange = (field, value) => {
    const updatedTargets = {
      ...settings.monthlyTargets,
      [selectedMonth]: {
        ...settings.monthlyTargets[selectedMonth],
        [field]: value === '' ? '' : parseInt(value) || 0
      }
    };
    setSettings({ ...settings, monthlyTargets: updatedTargets });
  };

  const getCurrentMonthTargets = () => {
    return settings?.monthlyTargets?.[selectedMonth] || { workingDays: 22, newCars: 0, usedCars: 0, cpo: 0 };
  };

  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  };

  // CSV Import functions
  const parseCSVValue = (value) => {
    if (!value) return '';
    return value.trim().replace(/^"/, '').replace(/"$/, '');
  };

  const parseCurrency = (value) => {
    if (!value) return 0;
    const cleaned = value.replace(/[$,"]/g, '').trim();
    return parseFloat(cleaned) || 0;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return formatDateCST(getCSTDate());
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${month}-${day}`;
    }
    return formatDateCST(getCSTDate());
  };

  const parseYesNo = (value) => {
    if (!value) return false;
    return value.trim().toUpperCase() === 'Y';
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        setImportResult({ success: false, message: 'CSV file is empty or has no data rows' });
        return;
      }

      // Parse header to find column indices
      const header = lines[0].split(',').map(h => h.trim().toUpperCase());
      const colIndex = {
        date: header.findIndex(h => h === 'DATE'),
        deal: header.findIndex(h => h === 'DEAL'),
        customer: header.findIndex(h => h === 'CUSTOMER'),
        salesman: header.findIndex(h => h === 'SALESMAN'),
        stock: header.findIndex(h => h === 'STOCK'),
        front: header.findIndex(h => h === 'FRONT'),
        back: header.findIndex(h => h === 'BACK'),
        serviceComplete: header.findIndex(h => h.includes('SERVICE')),
        delivered: header.findIndex(h => h === 'DELIVERED'),
        cpo: header.findIndex(h => h === 'CPO'),
        sslp: header.findIndex(h => h === 'SSLP')
      };

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line handling quoted values with commas
        const row = [];
        let current = '';
        let inQuotes = false;
        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current);

        const getValue = (idx) => idx >= 0 && idx < row.length ? parseCSVValue(row[idx]) : '';

        try {
          const saleData = {
            saleDate: parseDate(getValue(colIndex.date)),
            dealNumber: getValue(colIndex.deal),
            customerName: getValue(colIndex.customer),
            salespersonName: getValue(colIndex.salesman),
            stockNumber: getValue(colIndex.stock),
            frontEnd: parseCurrency(getValue(colIndex.front)),
            backEnd: parseCurrency(getValue(colIndex.back)),
            serviceComplete: parseYesNo(getValue(colIndex.serviceComplete)),
            delivered: parseYesNo(getValue(colIndex.delivered)),
            cpo: parseYesNo(getValue(colIndex.cpo)),
            sslp: parseYesNo(getValue(colIndex.sslp)),
            notes: ''
          };

          if (saleData.dealNumber) {
            await api.createSale(saleData);
            successCount++;
          }
        } catch (err) {
          console.error(`Error importing row ${i}:`, err);
          errorCount++;
        }
      }

      setImportResult({
        success: true,
        message: `Imported ${successCount} sales${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });
      loadData();
    } catch (error) {
      console.error('Failed to import CSV:', error);
      setImportResult({ success: false, message: 'Failed to parse CSV file' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Find potential duplicates (similar names)
  const findPotentialDuplicates = () => {
    const duplicates = [];
    for (let i = 0; i < salespeople.length; i++) {
      for (let j = i + 1; j < salespeople.length; j++) {
        const name1 = salespeople[i].name.toLowerCase();
        const name2 = salespeople[j].name.toLowerCase();
        const parts1 = name1.split(' ');
        const parts2 = name2.split(' ');
        if (parts1[0] === parts2[0] || name1.includes(name2) || name2.includes(name1)) {
          duplicates.push({ person1: salespeople[i], person2: salespeople[j] });
        }
      }
    }
    return duplicates;
  };

  const potentialDuplicates = useMemo(() => findPotentialDuplicates(), [salespeople]);

  const getSalesCount = (id) => {
    let count = 0;
    sales.forEach(s => {
      if (s.salespersonId === id) count += s.isSplit ? 0.5 : 1;
      if (s.secondSalespersonId === id) count += 0.5;
    });
    return count;
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;

    try {
      const salesToUpdate = sales.filter(s =>
        s.salespersonId === mergeSource.id || s.secondSalespersonId === mergeSource.id
      );

      for (const sale of salesToUpdate) {
        const updates = {};
        if (sale.salespersonId === mergeSource.id) {
          updates.salespersonId = mergeTarget.id;
        }
        if (sale.secondSalespersonId === mergeSource.id) {
          updates.secondSalespersonId = mergeTarget.id;
        }
        await api.updateSale(sale.id, updates);
      }

      await api.deleteSalesperson(mergeSource.id);

      setShowMergeModal(false);
      setMergeSource(null);
      setMergeTarget(null);
      loadData();
    } catch (error) {
      console.error('Failed to merge salespeople:', error);
    }
  };

  if (!isAdmin) return <div className="alert alert-error">Access denied. Admin privileges required.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!settings) return <div className="alert alert-error">Failed to load settings.</div>;

  const currentTargets = getCurrentMonthTargets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-base-content/60">Configure dealership parameters and data management</p>
      </div>

      {success && (
        <div className="alert alert-success">
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Settings */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <DollarSign size={20} className="text-success" />
                Financial Settings
              </h2>
              <div className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Pack Amount ($)</span>
                    <span className="label-text-alt text-base-content/60">Deducted from each sale</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered"
                    value={settings.packAmount ?? ''}
                    onChange={(e) => handleChange('packAmount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                        handleChange('packAmount', 0);
                      }
                    }}
                  />
                  <label className="label">
                    <span className="label-text-alt">This amount is subtracted from gross profit for each vehicle sold</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Goals */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Target size={20} className="text-accent" />
                Monthly Goals
              </h2>
              <div className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Select Month</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {getMonthOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Working Days</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-bordered"
                    value={currentTargets.workingDays ?? ''}
                    onChange={(e) => handleMonthlyTargetChange('workingDays', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        handleMonthlyTargetChange('workingDays', 22);
                      }
                    }}
                  />
                  <label className="label">
                    <span className="label-text-alt">Business days for this month</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">New Cars Target</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered"
                    value={currentTargets.newCars ?? ''}
                    onChange={(e) => handleMonthlyTargetChange('newCars', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        handleMonthlyTargetChange('newCars', 0);
                      }
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Used Cars Target</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered"
                    value={currentTargets.usedCars ?? ''}
                    onChange={(e) => handleMonthlyTargetChange('usedCars', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        handleMonthlyTargetChange('usedCars', 0);
                      }
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">CPO Target</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered"
                    value={currentTargets.cpo ?? ''}
                    onChange={(e) => handleMonthlyTargetChange('cpo', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        handleMonthlyTargetChange('cpo', 0);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="card bg-base-100 shadow-md md:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Monitor size={20} className="text-info" />
                Display Settings
              </h2>
              <div className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Quote of the Day</span>
                    <span className="label-text-alt text-base-content/60">Visible on Team Tracker</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    value={settings.quoteOfTheDay ?? ''}
                    onChange={(e) => handleChange('quoteOfTheDay', e.target.value)}
                    placeholder="Enter an inspiring quote..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form >

      {/* Data Management Section */}
      < div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >
        {/* Import Sales CSV */}
        < div className="card bg-base-100 shadow-md" >
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Upload size={20} className="text-primary" />
              Import Sales Data
            </h2>
            <p className="text-base-content/60 text-sm mt-2">
              Import sales records from a CSV file. The CSV should have columns: DATE, DEAL, CUSTOMER, SALESMAN, STOCK, FRONT, BACK, DELIVERED, CPO, SSLP
            </p>

            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleCSVImport}
              className="hidden"
            />

            {importResult && (
              <div className={`alert mt-4 ${importResult.success ? 'alert-success' : 'alert-error'}`}>
                <span>{importResult.message}</span>
                <button onClick={() => setImportResult(null)} className="btn btn-ghost btn-sm"><X size={16} /></button>
              </div>
            )}

            <div className="card-actions mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Select CSV File
                  </>
                )}
              </button>
            </div>
          </div>
        </div >

        {/* Review Duplicate Salespeople */}
        < div className="card bg-base-100 shadow-md" >
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Users size={20} className="text-warning" />
              Duplicate Salespeople
            </h2>
            <p className="text-base-content/60 text-sm mt-2">
              Review and merge salespeople with similar names. This helps clean up duplicate entries created during imports.
            </p>

            {potentialDuplicates.length > 0 ? (
              <div className="alert alert-warning mt-4">
                <AlertTriangle size={20} />
                <span>{potentialDuplicates.length} potential duplicate(s) found</span>
              </div>
            ) : (
              <div className="alert alert-success mt-4">
                <Check size={20} />
                <span>No duplicate salespeople detected</span>
              </div>
            )}

            <div className="card-actions mt-4">
              <button
                onClick={() => setShowMergeModal(true)}
                className="btn btn-warning"
                disabled={potentialDuplicates.length === 0}
              >
                <Merge size={18} />
                Review Duplicates
              </button>
            </div>
          </div>
        </div >
      </div >

      {/* Settings Info */}
      < div className="card bg-base-100 shadow-md" >
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Settings size={20} />
            About Settings
          </h2>
          <div className="prose max-w-none mt-2">
            <p className="text-base-content/70">
              These settings affect how sales data is calculated and displayed:
            </p>
            <ul className="text-base-content/70 text-sm">
              <li><strong>Pack Amount:</strong> Fixed cost deducted from each sale's gross profit</li>
              <li><strong>Monthly Goals:</strong> Set working days and sales targets per month for accurate productivity tracking</li>
              <li><strong>Import Sales:</strong> Bulk import sales from CSV files exported from your DMS</li>
              <li><strong>Duplicate Review:</strong> Clean up duplicate salesperson entries to maintain accurate records</li>
            </ul>
          </div>
        </div>
      </div >

      {/* Merge Duplicates Modal */}
      {
        showMergeModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <button onClick={() => { setShowMergeModal(false); setMergeSource(null); setMergeTarget(null); }} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Merge size={20} />
                Review Potential Duplicates
              </h3>

              <p className="text-base-content/60 mb-4">
                The following salespeople have similar names. You can merge duplicates to combine their sales records.
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {potentialDuplicates.map((dup, idx) => (
                  <div key={idx} className="card bg-base-200">
                    <div className="card-body py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium">{dup.person1.name}</div>
                          <div className="text-xs text-base-content/60">
                            {getSalesCount(dup.person1.id)} sales | {dup.person1.active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="text-base-content/40">vs</div>
                        <div className="flex-1 text-right">
                          <div className="font-medium">{dup.person2.name}</div>
                          <div className="text-xs text-base-content/60">
                            {getSalesCount(dup.person2.id)} sales | {dup.person2.active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => { setMergeSource(dup.person1); setMergeTarget(dup.person2); }}
                          >
                            Merge {dup.person1.name.split(' ')[0]} → {dup.person2.name.split(' ')[0]}
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => { setMergeSource(dup.person2); setMergeTarget(dup.person1); }}
                          >
                            Merge {dup.person2.name.split(' ')[0]} → {dup.person1.name.split(' ')[0]}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {mergeSource && mergeTarget && (
                <div className="alert alert-warning mt-4">
                  <AlertTriangle size={20} />
                  <div>
                    <div className="font-medium">Ready to merge</div>
                    <div className="text-sm">
                      All {getSalesCount(mergeSource.id)} sales from <strong>{mergeSource.name}</strong> will be transferred to <strong>{mergeTarget.name}</strong>,
                      and {mergeSource.name} will be deleted.
                    </div>
                  </div>
                  <button className="btn btn-sm btn-warning" onClick={handleMerge}>
                    <Check size={16} /> Confirm Merge
                  </button>
                </div>
              )}

              {potentialDuplicates.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  <Check size={48} className="mx-auto mb-2 text-success" />
                  <p>No potential duplicates found!</p>
                </div>
              )}

              <div className="modal-action">
                <button onClick={() => { setShowMergeModal(false); setMergeSource(null); setMergeTarget(null); }} className="btn">Close</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => { setShowMergeModal(false); setMergeSource(null); setMergeTarget(null); }}></div>
          </div>
        )
      }
    </div >
  );
}
