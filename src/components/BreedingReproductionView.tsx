import React, { useState, useEffect } from 'react';
import {
  Dna,
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { BreedingRecord, Animal, Species } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const BreedingReproductionView: React.FC = () => {
  const { isWorker, user } = useAuth();
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [showMatingModal, setShowMatingModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BreedingRecord | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form
  const [matingForm, setMatingForm] = useState({
    species: 'pig' as Species,
    female_id: '',
    male_id: 'PIG-003 (Titan)',
    service_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Status update form
  const [statusForm, setStatusForm] = useState({
    status: 'confirmed' as any,
    failed_reason: '',
    reservice_date: '',
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recRes, statRes, animRes] = await Promise.all([
        api.get<BreedingRecord[]>(`/breeding?species=${filterSpecies}&status=${filterStatus}`),
        api.get('/breeding/stats'),
        api.get<Animal[]>('/animals?status=alive'),
      ]);
      setRecords(recRes);
      setStats(statRes);
      setAnimals(animRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load breeding data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterSpecies, filterStatus]);

  const handleRecordMating = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/breeding', {
        female_id: parseInt(matingForm.female_id, 10),
        male_id: matingForm.male_id,
        service_date: matingForm.service_date,
        species: matingForm.species,
        notes: matingForm.notes,
      });
      setShowMatingModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await api.put(`/breeding/${editingRecord.id}`, statusForm);
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update record');
    } finally {
      setSubmitting(false);
    }
  };

  const openMatingModal = () => {
    const defaultFemale = animals.find((a) => a.species === 'pig' && (a.sex === 'female' || a.sex === 'batch_mixed'));
    setMatingForm({
      species: 'pig',
      female_id: defaultFemale ? String(defaultFemale.id) : '',
      male_id: 'PIG-003 (Titan)',
      service_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setModalError(null);
    setShowMatingModal(true);
  };

  const openStatusModal = (rec: BreedingRecord) => {
    setEditingRecord(rec);
    setStatusForm({
      status: rec.status,
      failed_reason: rec.failed_reason || '',
      reservice_date: rec.reservice_date || '',
      notes: rec.notes || '',
    });
    setModalError(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Breeding, AI & Gestation Tracker</h2>
          <p className="text-xs text-slate-500">
            Auto-calculated due dates: Pigs ~114 days • Hens ~21 days • Ostriches ~42 days
          </p>
        </div>

        <button
          id="open-record-mating-btn"
          onClick={openMatingModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Record Service / Mating / AI</span>
        </button>
      </div>

      {/* Reproduction Success Rates Dashboard */}
      {stats?.speciesSuccessRates && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.speciesSuccessRates.map((s: any) => (
            <div key={s.species} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider capitalize">
                  {s.species} Conception Success
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {s.successRate}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{s.successful}</span>
                <span className="text-xs font-medium text-slate-500">delivered / hatched clutches</span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-slate-500">
                <div>
                  <span className="block text-slate-400">Total Serviced</span>
                  <span className="font-bold text-slate-800">{s.totalServices}</span>
                </div>
                <div>
                  <span className="block text-slate-400">In Gestation</span>
                  <span className="font-bold text-purple-700">{s.activePregnant}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Failed</span>
                  <span className="font-bold text-rose-600">{s.failed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Filters:</span>

        <div className="flex items-center gap-1">
          {(['all', 'pig', 'hen', 'ostrich'] as const).map((sp) => (
            <button
              key={sp}
              onClick={() => setFilterSpecies(sp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterSpecies === sp ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sp === 'all' ? 'All Species' : sp}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'pregnant/incubating', 'confirmed', 'failed', 'delivered'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterStatus === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Records Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base text-slate-900">{rec.female_tag}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {rec.species}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{rec.female_breed} • {rec.female_pen}</p>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    rec.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rec.status === 'pregnant/incubating'
                      ? 'bg-purple-100 text-purple-800'
                      : rec.status === 'delivered'
                      ? 'bg-blue-100 text-blue-800'
                      : rec.status === 'failed'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {rec.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3.5 p-3 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service / Sire:</span>
                  <span className="font-bold text-slate-900">{rec.male_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Date:</span>
                  <span className="font-medium">{rec.service_date}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Expected Due Date:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{rec.expected_due_date}</span>
                </div>
                {rec.due_urgency && rec.due_urgency !== 'normal' && (
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        rec.due_urgency === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.due_urgency === 'overdue' ? 'Overdue!' : 'Due in ≤7 Days'}
                    </span>
                  </div>
                )}
              </div>

              {rec.status === 'failed' && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
                  <div className="font-bold mb-0.5">Failed Conception Recorded:</div>
                  <div>Reason: {rec.failed_reason || 'Not specified'}</div>
                  {rec.reservice_date && (
                    <div className="font-semibold mt-1">Scheduled Reservice: {rec.reservice_date}</div>
                  )}
                </div>
              )}

              {rec.notes && (
                <p className="text-xs text-slate-500 italic mt-2">
                  "{rec.notes}"
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">ID #{rec.id}</span>
              <button
                id={`edit-breeding-${rec.id}`}
                onClick={() => openStatusModal(rec)}
                className="px-3 py-1 rounded-lg text-purple-700 hover:bg-purple-50 font-bold text-xs transition-colors"
              >
                Update Status / Reservice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* RECORD MATING MODAL */}
      {showMatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Record Breeding / Insemination</h3>
              </div>
              <button
                onClick={() => setShowMatingModal(false)}
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

            <form onSubmit={handleRecordMating} className="space-y-4 text-xs">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px]">
                <strong>Gestation Rule:</strong> The expected due date or hatching date will be automatically computed upon saving (114 days for sows, 21 days for hens, 42 days for ostriches).
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species *</label>
                  <select
                    value={matingForm.species}
                    onChange={(e) => setMatingForm({ ...matingForm, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize font-medium"
                  >
                    <option value="pig">Pig (114d gestation)</option>
                    <option value="hen">Hen (21d incubation)</option>
                    <option value="ostrich">Ostrich (42d incubation)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Date *</label>
                  <input
                    type="date"
                    required
                    value={matingForm.service_date}
                    onChange={(e) => setMatingForm({ ...matingForm, service_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Female Dam Tag / Batch *</label>
                <select
                  required
                  value={matingForm.female_id}
                  onChange={(e) => setMatingForm({ ...matingForm, female_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="">-- Choose female from registry --</option>
                  {animals
                    .filter((a) => a.species === matingForm.species && (a.sex === 'female' || a.sex === 'batch_mixed'))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tag_id} ({a.breed} - {a.pen_location})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Male Sire Tag or "AI (Artificial Insemination)" *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PIG-003 (Titan) or AI Duroc Semen #44"
                  value={matingForm.male_id}
                  onChange={(e) => setMatingForm({ ...matingForm, male_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Notes</label>
                <textarea
                  rows={2}
                  placeholder="Natural mount observations, heat intensity score, ultrasound notes..."
                  value={matingForm.notes}
                  onChange={(e) => setMatingForm({ ...matingForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMatingModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {submitting ? 'Calculating...' : 'Save & Calculate Due Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS / MARK FAILED CONCEPTION MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Pregnancy Status</h3>
                <p className="text-xs text-slate-500">Female: {editingRecord.female_tag}</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
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

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reproduction Status *</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold capitalize"
                >
                  <option value="pregnant/incubating">Pregnant / Incubating</option>
                  <option value="confirmed">Confirmed (Ultrasound / Candling)</option>
                  <option value="delivered">Delivered / Hatched</option>
                  <option value="failed">Failed Conception / Aborted</option>
                  <option value="not_confirmed">Not Confirmed</option>
                </select>
              </div>

              {statusForm.status === 'failed' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-3">
                  <div>
                    <label className="block font-semibold text-rose-900 mb-1">Reason for Failure *</label>
                    <select
                      value={statusForm.failed_reason}
                      onChange={(e) => setStatusForm({ ...statusForm, failed_reason: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white"
                    >
                      <option value="">-- Select failure cause --</option>
                      <option value="Returned to heat / standing estrus">Returned to heat (cycle resumed)</option>
                      <option value="No eggs laid in cycle">No eggs laid in cycle</option>
                      <option value="Vet confirmed not pregnant (empty uterus)">Vet confirmed not pregnant (empty uterus)</option>
                      <option value="Infertile eggs candled">Infertile eggs candled</option>
                      <option value="Early embryonic death / absorption">Early embryonic death / absorption</option>
                      <option value="Spontaneous abortion">Spontaneous abortion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-rose-900 mb-1">Reservice Scheduling Date</label>
                    <input
                      type="date"
                      value={statusForm.reservice_date}
                      onChange={(e) => setStatusForm({ ...statusForm, reservice_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Update Notes</label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {submitting ? 'Updating...' : 'Save Reproduction Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
