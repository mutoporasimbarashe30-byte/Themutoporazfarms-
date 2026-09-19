import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  RefreshCw,
  FileText,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { exportToCSV, exportToPDF } from '../lib/exportUtils.ts';

export const ReportsView: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('animals');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const modules = [
    { id: 'animals', label: 'Animal & Flock Master Registry' },
    { id: 'births', label: 'Births & Hatching Records' },
    { id: 'deaths', label: 'Mortality & Causes of Death' },
    { id: 'health', label: 'Veterinary Treatments & Clinic' },
    { id: 'feed', label: 'Feed Intake & Nutritional Costs' },
    { id: 'breeding', label: 'Breeding & Gestation Schedules' },
    { id: 'inventory', label: 'Silo & Pharmacy Combined Inventory' },
  ];

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let url = `/dashboard/export-data?module=${selectedModule}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await api.get(url);
      setReportData(res.data || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedModule, startDate, endDate]);

  const handleExportCSV = () => {
    exportToCSV(`TheMutoporazFarms_${selectedModule}_${new Date().toISOString().slice(0, 10)}`, reportData);
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) {
      alert('No records to print.');
      return;
    }
    const headers = Object.keys(reportData[0]);
    const dataRows = reportData.map((row) => headers.map((h) => row[h] !== null && row[h] !== undefined ? String(row[h]) : ''));
    const modTitle = modules.find((m) => m.id === selectedModule)?.label || 'Farm Operations Report';

    exportToPDF(
      modTitle,
      `Official Farm Record | Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`,
      headers.map((h) => h.replace(/_/g, ' ').toUpperCase()),
      dataRows,
      `TheMutoporazFarms_${selectedModule}_Report`
    );
  };

  const setPreset = (days: number) => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Farm Audit Reports & Data Export</h2>
            <p className="text-xs text-slate-500">
              Filter records across livestock, healthcare, feed intake, and finances
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="export-csv-btn"
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Official PDF</span>
            </button>
          </div>
        </div>

        {/* Module selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedModule === m.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Date range picker */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreset(7)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset(30)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPreset(365)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              Past Year
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 text-[11px]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Live Data Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Preview: {modules.find((m) => m.id === selectedModule)?.label}
            </h3>
            <p className="text-xs text-slate-500">
              {reportData.length} records matching current criteria
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Preparing dataset...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No records found for the selected module and dates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] sticky top-0 border-b border-slate-200">
                <tr>
                  {Object.keys(reportData[0]).map((key) => (
                    <th key={key} className="px-3.5 py-2.5 whitespace-nowrap">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    {Object.keys(row).map((key) => (
                      <td key={key} className="px-3.5 py-2.5 whitespace-nowrap">
                        {row[key] !== null && row[key] !== undefined ? String(row[key]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
