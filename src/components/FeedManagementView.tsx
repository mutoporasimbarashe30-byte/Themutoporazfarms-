import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Plus,
  AlertTriangle,
  Clock,
  Layers,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { FeedType, FeedLog, Species } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const FeedManagementView: React.FC = () => {
  const { isWorker, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'inventory' | 'analytics'>('logs');

  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [reports, setReports] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [restockFeedId, setRestockFeedId] = useState<number | null>(null);
  const [restockKg, setRestockKg] = useState<number>(250);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Feed Log Form
  const [logForm, setLogForm] = useState({
    species: 'pig' as Species,
    pen_location: 'Pen P-1',
    feed_type_id: '',
    quantity_kg: 25,
    log_date: new Date().toISOString().slice(0, 10),
    log_time: new Date().toTimeString().slice(0, 5),
    logged_by: user?.full_name || '',
  });

  // New Feed Type Form
  const [newFeedForm, setNewFeedForm] = useState({
    name: '',
    category: 'starter' as any,
    current_stock_kg: 500,
    reorder_threshold_kg: 100,
    supplier: 'National Foods Harare',
    date_received: new Date().toISOString().slice(0, 10),
    cost_per_kg: 0.85,
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fTypes, fLogs, repRes] = await Promise.all([
        api.get<FeedType[]>('/feed/types'),
        api.get<FeedLog[]>('/feed/logs'),
        api.get('/feed/reports?period=30days'),
      ]);
      setFeedTypes(fTypes);
      setFeedLogs(fLogs);
      setReports(repRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed operations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const selectedFeed = feedTypes.find((f) => f.id === parseInt(logForm.feed_type_id, 10));
    if (selectedFeed && selectedFeed.current_stock_kg < logForm.quantity_kg) {
      setModalError(
        `Insufficient Feed: Only ${selectedFeed.current_stock_kg.toFixed(1)} kg remains in "${selectedFeed.name}". You cannot log ${logForm.quantity_kg} kg.`
      );
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/feed/logs', {
        ...logForm,
        feed_type_id: parseInt(logForm.feed_type_id, 10),
        quantity_kg: parseFloat(String(logForm.quantity_kg)),
      });
      setShowLogModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to log feed intake');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFeedType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/feed/types', newFeedForm);
      setShowAddFeedModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add feed item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockFeed = async (feedId: number) => {
    try {
      await api.put(`/feed/types/${feedId}`, {
        add_kg: restockKg,
      });
      setRestockFeedId(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to restock feed: ' + err.message);
    }
  };

  const openLogModal = () => {
    const defaultFeed = feedTypes.length > 0 ? String(feedTypes[0].id) : '';
    setLogForm({
      species: 'pig',
      pen_location: 'Pen P-1',
      feed_type_id: defaultFeed,
      quantity_kg: 25,
      log_date: new Date().toISOString().slice(0, 10),
      log_time: new Date().toTimeString().slice(0, 5),
      logged_by: user?.full_name || '',
    });
    setModalError(null);
    setShowLogModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar & Quick actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            id="tab-feed-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'logs'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Daily Intake Logs ({feedLogs.length})</span>
          </button>
          <button
            id="tab-feed-inventory-btn"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'inventory'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wheat className="w-4 h-4 text-emerald-600" />
            <span>Feed Silos & Stock ({feedTypes.length})</span>
          </button>
          <button
            id="tab-feed-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Consumption & Cost Analytics</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="open-log-feed-btn"
            onClick={openLogModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log Daily Feed Intake</span>
          </button>

          {!isWorker && (
            <button
              id="open-add-feed-btn"
              onClick={() => {
                setModalError(null);
                setShowAddFeedModal(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Feed Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DAILY INTAKE LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Ration Distribution Logs</h3>
              <p className="text-xs text-slate-500">
                Live intake logs automatically decrement silo inventory in real time
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Species</th>
                  <th className="px-3 py-2.5">Pen Location</th>
                  <th className="px-3 py-2.5">Feed Silo / Formulation</th>
                  <th className="px-3 py-2.5">Quantity Given</th>
                  <th className="px-3 py-2.5">Cost Value</th>
                  <th className="px-3 py-2.5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {feedLogs.map((log) => {
                  const estCost = ((log.cost_per_kg || 0.8) * log.quantity_kg).toFixed(2);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {log.log_date} <span className="text-slate-400 text-[11px]">({log.log_time})</span>
                      </td>
                      <td className="px-3 py-3 capitalize font-bold">{log.species}</td>
                      <td className="px-3 py-3 text-slate-600">{log.pen_location}</td>
                      <td className="px-3 py-3 text-amber-700 font-bold">{log.feed_name}</td>
                      <td className="px-3 py-3 font-extrabold text-slate-900">{log.quantity_kg} kg</td>
                      <td className="px-3 py-3 text-emerald-700 font-semibold">${estCost}</td>
                      <td className="px-3 py-3 text-slate-500">{log.logged_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FEED SILOS & STOCK INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedTypes.map((feed) => (
              <div
                key={feed.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">{feed.name}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {feed.category}
                      </span>
                    </div>

                    {feed.is_low_stock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        Low Stock Alert
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Sufficient
                      </span>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Current Stock:</span>
                      <span className="text-xl font-black text-slate-900">
                        {feed.current_stock_kg.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reorder Threshold:</span>
                      <span className="font-semibold text-slate-800">{feed.reorder_threshold_kg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cost per kg:</span>
                      <span className="font-semibold text-emerald-700">${feed.cost_per_kg?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supplier:</span>
                      <span className="font-medium truncate">{feed.supplier}</span>
                    </div>
                  </div>
                </div>

                {!isWorker && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {restockFeedId === feed.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={restockKg}
                          onChange={(e) => setRestockKg(parseInt(e.target.value, 10) || 1)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                        <button
                          onClick={() => handleRestockFeed(feed.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRestockFeedId(null)}
                          className="px-2 py-1 text-slate-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRestockFeedId(feed.id);
                          setRestockKg(250);
                        }}
                        className="w-full py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200/60"
                      >
                        + Restock Silo
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMPTION & COST ANALYTICS */}
      {activeTab === 'analytics' && reports && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reports.speciesConsumption?.map((sc: any) => (
              <div key={sc.species} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider capitalize">
                  {sc.species} Consumption (30d)
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{sc.total_kg}</span>
                  <span className="text-xs font-medium text-slate-500">kg fed</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-500">Est. Feed Cost:</span>
                  <span className="font-bold text-emerald-700">${sc.estimated_cost}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Consumption by Feed Formulation</h3>
            <p className="text-xs text-slate-500 mb-4">Quantity fed and cost totals for the last 30 days</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Feed Formulation</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Current Silo Stock</th>
                    <th className="px-4 py-2.5">30-Day Consumed</th>
                    <th className="px-4 py-2.5">Total Cost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reports.feedTypeConsumption?.map((fc: any) => (
                    <tr key={fc.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{fc.name}</td>
                      <td className="px-4 py-3 capitalize">{fc.category}</td>
                      <td className="px-4 py-3 font-semibold">{fc.current_stock_kg} kg</td>
                      <td className="px-4 py-3 font-black text-amber-700">{fc.consumed_kg || 0} kg</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">${fc.total_cost || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOG FEED INTAKE MODAL (WITH NEGATIVE USAGE BLOCKING) */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Log Daily Feed Intake</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleLogIntake} className="space-y-4 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <strong>Inventory Guard:</strong> Logging a ration automatically reduces silo stock. Entries will be blocked if requested kg exceeds current stock!
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species Fed *</label>
                  <select
                    value={logForm.species}
                    onChange={(e) => setLogForm({ ...logForm, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="pig">Pigs</option>
                    <option value="hen">Hens</option>
                    <option value="ostrich">Ostriches</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pen / Housing Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pen P-1 or Coop H-1"
                    value={logForm.pen_location}
                    onChange={(e) => setLogForm({ ...logForm, pen_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Feed Silo / Formulation *</label>
                <select
                  required
                  value={logForm.feed_type_id}
                  onChange={(e) => setLogForm({ ...logForm, feed_type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800"
                >
                  <option value="">-- Choose from inventory --</option>
                  {feedTypes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.category}) — Available: {f.current_stock_kg.toFixed(1)} kg
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Given (kg) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={logForm.quantity_kg}
                    onChange={(e) => setLogForm({ ...logForm, quantity_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-extrabold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Log Date *</label>
                  <input
                    type="date"
                    required
                    value={logForm.log_date}
                    onChange={(e) => setLogForm({ ...logForm, log_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Feeding Time *</label>
                  <input
                    type="time"
                    required
                    value={logForm.log_time}
                    onChange={(e) => setLogForm({ ...logForm, log_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Logged By *</label>
                  <input
                    type="text"
                    required
                    value={logForm.logged_by}
                    onChange={(e) => setLogForm({ ...logForm, logged_by: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {submitting ? 'Verifying & Deducting...' : 'Record Intake & Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW FEED SILO STOCK MODAL */}
      {showAddFeedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Feed Stock to Silo</h3>
              <button
                onClick={() => setShowAddFeedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateFeedType} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Feed Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ostrich Pre-Breeder Pellets"
                  value={newFeedForm.name}
                  onChange={(e) => setNewFeedForm({ ...newFeedForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newFeedForm.category}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="starter">Starter</option>
                    <option value="grower">Grower</option>
                    <option value="layer">Layer</option>
                    <option value="finisher">Finisher</option>
                    <option value="breeder">Breeder</option>
                    <option value="forage">Forage / Lucerne</option>
                    <option value="supplement">Supplement</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost per kg ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newFeedForm.cost_per_kg}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, cost_per_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock (kg) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newFeedForm.current_stock_kg}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, current_stock_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Alert (kg) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newFeedForm.reorder_threshold_kg}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, reorder_threshold_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    required
                    value={newFeedForm.supplier}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Received *</label>
                  <input
                    type="date"
                    required
                    value={newFeedForm.date_received}
                    onChange={(e) => setNewFeedForm({ ...newFeedForm, date_received: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFeedModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Add Feed Silo Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
