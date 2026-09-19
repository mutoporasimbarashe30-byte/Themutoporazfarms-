import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Baby,
  Skull,
  HeartPulse,
  Wheat,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { DashboardOverview, Species } from '../types/index.ts';
import { NavModule } from './Sidebar.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<DashboardOverview>('/dashboard/overview');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">Loading The Mutoporaz Farms live operations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <div className="flex items-center gap-2 font-bold mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Dashboard Error</span>
        </div>
        <p className="text-sm">{error || 'Could not load data'}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const speciesConfig: Record<Species, { label: string; bg: string; text: string; border: string }> = {
    pig: { label: 'Pigs (Swine)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    hen: { label: 'Hens (Poultry)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    ostrich: { label: 'Ostriches (Ratites)', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Farm Greeting */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Official Operations Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            The Mutoporaz Farms
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1.5 leading-relaxed">
            Welcome, farm supervisor. Managing livestock welfare, nutritional silage, and breeding for 
            <span className="font-semibold text-white"> Pigs, Hens & Ostriches</span>.
          </p>

          {/* Quick Action Pills */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <button
              id="dash-quick-reg-animal"
              onClick={() => onNavigate('animals')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
              Register Animal / Flock
            </button>
            <button
              id="dash-quick-feed-intake"
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors border border-emerald-600/40"
            >
              <Wheat className="w-3.5 h-3.5 text-emerald-200" />
              Log Feed Intake
            </button>
            <button
              id="dash-quick-report-sick"
              onClick={() => onNavigate('health')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors border border-emerald-600/40"
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-200" />
              Log Sick Animal
            </button>
            <button
              id="dash-quick-log-mating"
              onClick={() => onNavigate('breeding')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors border border-emerald-600/40"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-200" />
              Record Service / Mating
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Banners (if any low stock or upcoming urgent due dates) */}
      {(data.lowFeedAlerts.length > 0 || data.lowMedicineAlerts.length > 0 || data.expiringMedicineAlerts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {data.lowFeedAlerts.map(feed => (
            <div
              key={`feed-alert-${feed.id}`}
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Wheat className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 truncate">Low Feed Stock: {feed.name}</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-800">
                    Below Threshold
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-0.5">
                  Remaining: <span className="font-semibold">{feed.current_stock_kg.toFixed(1)} kg</span> (Reorder at {feed.reorder_threshold_kg} kg)
                </p>
                <button
                  onClick={() => onNavigate('feed')}
                  className="mt-1.5 text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  Manage Feed Silos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {data.lowMedicineAlerts.map(med => (
            <div
              key={`med-alert-${med.id}`}
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900 truncate">Low Medicine: {med.name}</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-200 text-rose-800">
                    Restock Needed
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  Remaining: <span className="font-semibold">{med.stock_quantity} {med.unit}</span> (Threshold: {med.reorder_threshold} {med.unit})
                </p>
                <button
                  onClick={() => onNavigate('health')}
                  className="mt-1.5 text-xs font-bold text-rose-800 hover:underline flex items-center gap-1"
                >
                  Pharmacy Restock <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {data.expiringMedicineAlerts.map(med => (
            <div
              key={`med-exp-${med.id}`}
              className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-orange-100 text-orange-700 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-900 truncate">{med.name}</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-200 text-orange-800 uppercase">
                    {med.expiry_status === 'expired' ? 'Expired' : 'Expiring Soon'}
                  </span>
                </div>
                <p className="text-xs text-orange-700 mt-0.5">
                  Expiry date: <span className="font-semibold">{med.expiry_date}</span>
                </p>
                <button
                  onClick={() => onNavigate('health')}
                  className="mt-1.5 text-xs font-bold text-orange-800 hover:underline flex items-center gap-1"
                >
                  Review Pharmacy <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Stats 4-Column Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Live Animals */}
        <div
          onClick={() => onNavigate('animals')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live Livestock</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{data.totalLiveAnimals}</span>
            <span className="text-xs font-medium text-slate-500">total head</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span>View all registered tags</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Today's Births */}
        <div
          onClick={() => onNavigate('births_deaths')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Births</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Baby className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{data.todayBirths}</span>
            <span className="text-xs font-medium text-slate-500">born today</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
            <span>Births & Hatch log</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Today's Deaths */}
        <div
          onClick={() => onNavigate('births_deaths')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Deaths</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Skull className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{data.todayDeaths}</span>
            <span className="text-xs font-medium text-slate-500">losses today</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-medium flex items-center gap-1">
            <span>Mortality analysis</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Sick Animals Under Care */}
        <div
          onClick={() => onNavigate('health')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Sick</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{data.sickCount}</span>
            <span className="text-xs font-medium text-slate-500">under treatment</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
            <span>Clinic & Treatments</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Species Census Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Species Census & Housing Breakdown</h3>
            <p className="text-xs text-slate-500">Current live headcount across Pigs, Hens, and Ostriches</p>
          </div>
          <button
            onClick={() => onNavigate('animals')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Manage Registry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.speciesBreakdown.map(item => {
            const conf = speciesConfig[item.species];
            const pct = data.totalLiveAnimals > 0 ? Math.round((item.totalHead / data.totalLiveAnimals) * 100) : 0;
            return (
              <div
                key={item.species}
                className={`p-4 rounded-xl border ${conf.border} ${conf.bg} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${conf.text}`}>
                      {conf.label}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{pct}% of farm</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">{item.totalHead}</span>
                    <span className="text-xs text-slate-600">head / birds</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 flex justify-between">
                  <span>{item.recordCount} registered tags/flocks</span>
                  <span className="font-semibold text-emerald-700 hover:underline cursor-pointer" onClick={() => onNavigate('animals')}>
                    View records
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Section: Upcoming Gestation Due Dates & Current Feed Silo Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gestation & Incubation Milestones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upcoming Gestation & Due Dates</h3>
                  <p className="text-xs text-slate-500">114d Pigs • 21d Hens • 42d Ostriches</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('breeding')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800"
              >
                View All
              </button>
            </div>

            {data.upcomingDue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                No deliveries or hatches expected in the next 14 days.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.upcomingDue.map(rec => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{rec.female_tag}</span>
                        <span className="capitalize px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {rec.species}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{rec.female_pen}</span>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-slate-800">{rec.expected_due_date}</div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.urgency === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : rec.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rec.urgency === 'overdue' ? 'Overdue!' : rec.urgency === 'urgent' ? 'Due This Week' : 'Expected Soon'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>Automated based on species gestation length</span>
            <button
              onClick={() => onNavigate('breeding')}
              className="text-purple-700 font-bold hover:underline"
            >
              Log Mating
            </button>
          </div>
        </div>

        {/* Current Feed Stock Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Wheat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Current Feed Silo Stock</h3>
                  <p className="text-xs text-slate-500">Live quantities remaining with automatic intake deduction</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('feed')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Feed Silos
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {data.feedStockSummary.map(feed => (
                <div key={feed.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{feed.name}</div>
                    <span className="text-[11px] text-slate-500 capitalize">{feed.category} Feed</span>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900">{feed.current_stock_kg.toFixed(1)} kg</div>
                    {feed.is_low_stock ? (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Low Stock (≤{feed.reorder_threshold_kg}kg)
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-medium">Adequate</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>Negative feed usage blocked by database</span>
            <button
              onClick={() => onNavigate('feed')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Log Daily Ration
            </button>
          </div>
        </div>
      </div>

      {/* Pharmacy / Medicine Stock Full Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Veterinary Medicine Inventory</h3>
              <p className="text-xs text-slate-500">Live pharmaceutical inventory automatically deducted on treatment logging</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('health')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            Pharmacy Management <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Medicine Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Available Stock</th>
                <th className="px-3 py-2.5">Reorder Alert Level</th>
                <th className="px-3 py-2.5">Expiry Date</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.medicineStockSummary.map(med => (
                <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-slate-900">{med.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{med.category}</td>
                  <td className="px-3 py-2.5 font-semibold">
                    {med.stock_quantity} {med.unit}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {med.reorder_threshold} {med.unit}
                  </td>
                  <td className="px-3 py-2.5">{med.expiry_date}</td>
                  <td className="px-3 py-2.5">
                    {med.is_low_stock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        Low Stock
                      </span>
                    ) : med.expiry_status === 'expired' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        Expired
                      </span>
                    ) : med.expiry_status === 'expiring_soon' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Expiring Soon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity Audit Highlights */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Farm Activity Stream</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => onNavigate('users')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Full Audit Trail
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {data.recentActivity.map(item => (
            <div key={item.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{item.user_name}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {item.module}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{item.details}</p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
