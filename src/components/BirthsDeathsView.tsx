import React, { useState, useEffect } from 'react';
import {
  Baby,
  Skull,
  TrendingDown,
  TrendingUp,
  Plus,
  AlertCircle,
  Calendar,
  X,
  PieChart,
  Layers,
  MapPin,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { BirthRecord, DeathRecord, Species, Animal } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const BirthsDeathsView: React.FC = () => {
  const { isVet } = useAuth();
  const [activeTab, setActiveTab] = useState<'births' | 'deaths' | 'analytics'>('births');

  const [births, setBirths] = useState<BirthRecord[]>([]);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Birth Form State
  const [birthForm, setBirthForm] = useState({
    birth_date: new Date().toISOString().slice(0, 10),
    species: 'pig' as Species,
    mother_id: '',
    mother_tag: '',
    number_born: 1,
    pen_location: 'Pen P-3 (Farrowing)',
    notes: '',
  });

  // Death Form State
  const [deathForm, setDeathForm] = useState({
    death_date: new Date().toISOString().slice(0, 10),
    species: 'pig' as Species,
    target_type: 'individual' as 'individual' | 'batch',
    animal_id: '',
    batch_tag: '',
    quantity: 1,
    cause_of_death: 'disease' as 'disease' | 'predation' | 'natural' | 'stillbirth' | 'culled' | 'unknown',
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [birthRes, deathRes, statRes, animRes] = await Promise.all([
        api.get<BirthRecord[]>('/births-deaths/births'),
        api.get<DeathRecord[]>('/births-deaths/deaths'),
        api.get('/births-deaths/stats'),
        api.get<Animal[]>('/animals?status=alive'),
      ]);
      setBirths(birthRes);
      setDeaths(deathRes);
      setAnalytics(statRes);
      setAnimals(animRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBirth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/births-deaths/births', {
        ...birthForm,
        mother_id: birthForm.mother_id ? parseInt(birthForm.mother_id, 10) : undefined,
        number_born: parseInt(String(birthForm.number_born), 10),
      });
      setShowBirthModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to log birth');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDeath = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        death_date: deathForm.death_date,
        species: deathForm.species,
        quantity: parseInt(String(deathForm.quantity), 10),
        cause_of_death: deathForm.cause_of_death,
        notes: deathForm.notes,
      };

      if (deathForm.target_type === 'individual') {
        payload.animal_id = parseInt(deathForm.animal_id, 10);
      } else {
        payload.batch_tag = deathForm.batch_tag;
      }

      await api.post('/births-deaths/deaths', payload);
      setShowDeathModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record mortality');
    } finally {
      setSubmitting(false);
    }
  };

  const openBirthModal = () => {
    setBirthForm({
      birth_date: new Date().toISOString().slice(0, 10),
      species: 'pig',
      mother_id: '',
      mother_tag: '',
      number_born: 8,
      pen_location: 'Pen P-3 (Farrowing)',
      notes: '',
    });
    setModalError(null);
    setShowBirthModal(true);
  };

  const openDeathModal = () => {
    setDeathForm({
      death_date: new Date().toISOString().slice(0, 10),
      species: 'pig',
      target_type: 'individual',
      animal_id: animals.find((a) => a.species === 'pig')?.id ? String(animals.find((a) => a.species === 'pig')?.id) : '',
      batch_tag: '',
      quantity: 1,
      cause_of_death: 'disease',
      notes: '',
    });
    setModalError(null);
    setShowDeathModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar & Quick actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            id="tab-births-btn"
            onClick={() => setActiveTab('births')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'births'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Baby className="w-4 h-4 text-blue-600" />
            <span>Births & Hatches ({births.length})</span>
          </button>
          <button
            id="tab-deaths-btn"
            onClick={() => setActiveTab('deaths')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'deaths'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Skull className="w-4 h-4 text-slate-700" />
            <span>Mortality Logs ({deaths.length})</span>
          </button>
          <button
            id="tab-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Survival Analytics</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="open-log-birth-btn"
            onClick={openBirthModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log Birth / Hatch</span>
          </button>
          <button
            id="open-log-death-btn"
            onClick={openDeathModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Death</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BIRTHS & HATCHES */}
      {activeTab === 'births' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {births.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {b.species}
                    </span>
                    <span className="text-xs text-slate-500">{b.birth_date}</span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">{b.number_born}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {b.species === 'pig' ? 'piglets farrowed' : 'chicks hatched'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mother Tag:</span>
                      <span className="font-semibold text-slate-800">{b.mother_tag || 'Unknown / Mixed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pen / Incubator:</span>
                      <span className="font-semibold text-slate-800">{b.pen_location}</span>
                    </div>
                    {b.notes && (
                      <div className="pt-1 text-[11px] text-slate-500 italic border-t border-slate-200/60">
                        "{b.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Logged by: {b.logged_by_name || 'Staff'}</span>
                  <span>ID: #{b.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MORTALITY LOGS */}
      {activeTab === 'deaths' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deaths.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {d.species}
                    </span>
                    <span className="text-xs text-slate-500">{d.death_date}</span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-600">{d.quantity}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      head lost ({d.animal_tag_ref || d.batch_tag || 'Tagged animal'})
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cause of Death:</span>
                      <span className="font-bold text-rose-700 uppercase text-[11px]">
                        {d.cause_of_death}
                      </span>
                    </div>
                    {d.notes && (
                      <div className="pt-1 text-[11px] text-slate-600 italic border-t border-rose-200/60">
                        "{d.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Logged by: {d.logged_by_name || 'Staff'}</span>
                  <span>ID: #{d.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SURVIVAL & MORTALITY ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Rate comparison cards: Weekly, Monthly, Yearly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Past 7 Days */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weekly (Last 7 Days)</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.weekly?.births || 0}</div>
                  <div className="text-xs font-semibold text-blue-700">Births / Hatches</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.weekly?.deaths || 0}</div>
                  <div className="text-xs font-semibold text-rose-700">Mortalities</div>
                </div>
              </div>
            </div>

            {/* Past 30 Days */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly (Last 30 Days)</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.monthly?.births || 0}</div>
                  <div className="text-xs font-semibold text-blue-700">Births / Hatches</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.monthly?.deaths || 0}</div>
                  <div className="text-xs font-semibold text-rose-700">Mortalities</div>
                </div>
              </div>
            </div>

            {/* Past 365 Days */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yearly (Last 365 Days)</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.yearly?.births || 0}</div>
                  <div className="text-xs font-semibold text-blue-700">Births / Hatches</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-900">
                  <div className="text-2xl font-black">{analytics.timeframeSummary?.yearly?.deaths || 0}</div>
                  <div className="text-xs font-semibold text-rose-700">Mortalities</div>
                </div>
              </div>
            </div>
          </div>

          {/* Species Mortality Rates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Mortality & Survival Rate per Species</h3>
            <p className="text-xs text-slate-500 mb-4">Calculated from total historical headcount and recorded losses</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Species</th>
                    <th className="px-4 py-2.5">Current Live Population</th>
                    <th className="px-4 py-2.5">Recorded Deaths</th>
                    <th className="px-4 py-2.5">Recorded Births</th>
                    <th className="px-4 py-2.5">Mortality Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {analytics.speciesStats?.map((s: any) => (
                    <tr key={s.species} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900 capitalize">{s.species}</td>
                      <td className="px-4 py-3 font-semibold">{s.liveAnimals} head</td>
                      <td className="px-4 py-3 text-rose-600 font-semibold">{s.totalDeaths}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">{s.totalBirths}</td>
                      <td className="px-4 py-3">
                        <span className="font-black text-slate-900">{s.mortalityRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Causes of Death Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Diagnosed Causes of Death</h3>
            <p className="text-xs text-slate-500 mb-4">Aggregate causes across all species</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {analytics.causeBreakdown?.map((c: any) => (
                <div key={c.cause_of_death} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    {c.cause_of_death}
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-1">{c.count}</div>
                  <span className="text-[11px] text-slate-400">cases</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOG BIRTH MODAL */}
      {showBirthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Log Birth or Hatch</h3>
              </div>
              <button
                onClick={() => setShowBirthModal(false)}
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

            <form onSubmit={handleCreateBirth} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species *</label>
                  <select
                    value={birthForm.species}
                    onChange={(e) => setBirthForm({ ...birthForm, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="pig">Pig (Farrowing)</option>
                    <option value="hen">Hen (Hatching)</option>
                    <option value="ostrich">Ostrich (Incubator)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Birth / Hatch Date *</label>
                  <input
                    type="date"
                    required
                    value={birthForm.birth_date}
                    onChange={(e) => setBirthForm({ ...birthForm, birth_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Number Born / Hatched *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={birthForm.number_born}
                    onChange={(e) => setBirthForm({ ...birthForm, number_born: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pen / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pen P-3, Nursery O-North"
                    value={birthForm.pen_location}
                    onChange={(e) => setBirthForm({ ...birthForm, pen_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mother Female Tag (if known)</label>
                <input
                  type="text"
                  placeholder="e.g. PIG-001 or OST-001"
                  value={birthForm.mother_tag}
                  onChange={(e) => setBirthForm({ ...birthForm, mother_tag: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Viability</label>
                <textarea
                  rows={2}
                  placeholder="Litter vigor, birth weight, egg clutch number..."
                  value={birthForm.notes}
                  onChange={(e) => setBirthForm({ ...birthForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBirthModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Save Birth Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DEATH MODAL (WITH STRICT VALIDATION) */}
      {showDeathModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Record Animal Mortality</h3>
              </div>
              <button
                onClick={() => setShowDeathModal(false)}
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

            <form onSubmit={handleCreateDeath} className="space-y-4 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-[11px] leading-relaxed">
                <strong>System Safety Rule:</strong> Registering an animal's death automatically marks their status as "deceased" in the registry and prevents double-logging.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species *</label>
                  <select
                    value={deathForm.species}
                    onChange={(e) => setDeathForm({ ...deathForm, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="pig">Pig</option>
                    <option value="hen">Hen</option>
                    <option value="ostrich">Ostrich</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Death *</label>
                  <input
                    type="date"
                    required
                    value={deathForm.death_date}
                    onChange={(e) => setDeathForm({ ...deathForm, death_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Type *</label>
                  <select
                    value={deathForm.target_type}
                    onChange={(e) => setDeathForm({ ...deathForm, target_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="individual">Individual Tag</option>
                    <option value="batch">Flock / Batch Loss</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Lost *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={deathForm.target_type === 'individual'}
                    value={deathForm.quantity}
                    onChange={(e) => setDeathForm({ ...deathForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold disabled:bg-slate-100"
                  />
                </div>
              </div>

              {deathForm.target_type === 'individual' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Living Animal *</label>
                  <select
                    required
                    value={deathForm.animal_id}
                    onChange={(e) => setDeathForm({ ...deathForm, animal_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="">-- Choose active animal --</option>
                    {animals
                      .filter((a) => a.species === deathForm.species && a.is_batch === 0)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.tag_id} ({a.breed} - {a.pen_location})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Flock / Batch Identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HEN-BATCH-2026A or OST-CHICK-B1"
                    value={deathForm.batch_tag}
                    onChange={(e) => setDeathForm({ ...deathForm, batch_tag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cause of Death *</label>
                <select
                  value={deathForm.cause_of_death}
                  onChange={(e) => setDeathForm({ ...deathForm, cause_of_death: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize font-medium"
                >
                  <option value="disease">Disease / Infection</option>
                  <option value="natural">Natural Causes / Old Age</option>
                  <option value="predation">Predation / Attack</option>
                  <option value="stillbirth">Stillbirth / Neonatal Failure</option>
                  <option value="culled">Culled / Welfare Decision</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post-Mortem & Circumstances</label>
                <textarea
                  rows={2}
                  placeholder="Observed symptoms, autopsy findings, immediate pen isolation steps taken..."
                  value={deathForm.notes}
                  onChange={(e) => setDeathForm({ ...deathForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeathModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                >
                  {submitting ? 'Confirming...' : 'Record Mortality'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
