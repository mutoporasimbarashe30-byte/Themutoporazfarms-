import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Pill,
  BookOpen,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  X,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { HealthRecord, Treatment, Medicine, Disease, Animal, Species } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const HealthManagementView: React.FC = () => {
  const { isWorker, isVet, isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sick' | 'treatments' | 'medicines' | 'diseases'>('sick');

  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showReportSickModal, setShowReportSickModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddDiseaseModal, setShowAddDiseaseModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Selected Health Record for Treatment
  const [selectedRecordForTreatment, setSelectedRecordForTreatment] = useState<HealthRecord | null>(null);

  // Sick animal form
  const [sickForm, setSickForm] = useState({
    species: 'pig' as Species,
    animal_id: '',
    batch_tag: '',
    date_reported: new Date().toISOString().slice(0, 10),
    symptoms: '',
    disease_id: '',
    diagnosed_condition: '',
    notes: '',
  });

  // Treatment form
  const [treatmentForm, setTreatmentForm] = useState({
    medicine_id: '',
    dosage_given: 1,
    date_administered: new Date().toISOString().slice(0, 10),
    administered_by: user?.full_name || '',
    recovery_status: 'recovering' as 'recovering' | 'recovered' | 'deceased',
    notes: '',
  });

  // Medicine form
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    category: 'Antibiotic',
    stock_quantity: 100,
    unit: 'ml' as 'ml' | 'tablets' | 'doses',
    reorder_threshold: 25,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    supplier: 'Harare Vet Supplies',
    date_received: new Date().toISOString().slice(0, 10),
  });

  // Restock state
  const [restockMedId, setRestockMedId] = useState<number | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(50);

  // Disease form
  const [diseaseForm, setDiseaseForm] = useState({
    name: '',
    species_affected: 'all',
    symptoms: '',
    recommended_medicines: '',
    dosage_info: '',
    treatment_duration: '3 to 5 days',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [hRes, tRes, mRes, dRes, aRes] = await Promise.all([
        api.get<HealthRecord[]>('/health/records'),
        api.get<Treatment[]>('/health/treatments'),
        api.get<Medicine[]>('/health/medicines'),
        api.get<Disease[]>('/health/diseases'),
        api.get<Animal[]>('/animals?status=alive'),
      ]);
      setHealthRecords(hRes);
      setTreatments(tRes);
      setMedicines(mRes);
      setDiseases(dRes);
      setAnimals(aRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load health records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle logging sick animal
  const handleReportSick = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/health/records', {
        species: sickForm.species,
        animal_id: sickForm.animal_id ? parseInt(sickForm.animal_id, 10) : undefined,
        batch_tag: sickForm.batch_tag || undefined,
        date_reported: sickForm.date_reported,
        symptoms: sickForm.symptoms,
        disease_id: sickForm.disease_id ? parseInt(sickForm.disease_id, 10) : undefined,
        diagnosed_condition: sickForm.diagnosed_condition,
        notes: sickForm.notes,
      });
      setShowReportSickModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to report sick animal');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle administering treatment (Live stock deduction & negative stock block)
  const handleAdministerTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (!selectedRecordForTreatment) return;

      await api.post('/health/treatments', {
        health_record_id: selectedRecordForTreatment.id,
        animal_id: selectedRecordForTreatment.animal_id,
        batch_tag: selectedRecordForTreatment.batch_tag,
        species: selectedRecordForTreatment.species,
        medicine_id: parseInt(treatmentForm.medicine_id, 10),
        dosage_given: parseFloat(String(treatmentForm.dosage_given)),
        date_administered: treatmentForm.date_administered,
        administered_by: treatmentForm.administered_by || user?.full_name,
        recovery_status: treatmentForm.recovery_status,
        notes: treatmentForm.notes,
      });

      setShowTreatmentModal(false);
      setSelectedRecordForTreatment(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to administer treatment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add new medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/health/medicines', medicineForm);
      setShowAddMedicineModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add medicine');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle restock medicine
  const handleRestock = async (medicineId: number) => {
    try {
      await api.put(`/health/medicines/${medicineId}`, {
        add_quantity: restockAmount,
      });
      setRestockMedId(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to restock: ' + err.message);
    }
  };

  // Handle add disease
  const handleAddDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/health/diseases', diseaseForm);
      setShowAddDiseaseModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add disease reference');
    } finally {
      setSubmitting(false);
    }
  };

  const openTreatmentForRecord = (rec: HealthRecord) => {
    setSelectedRecordForTreatment(rec);
    const defaultMed = medicines.length > 0 ? String(medicines[0].id) : '';
    setTreatmentForm({
      medicine_id: defaultMed,
      dosage_given: 5,
      date_administered: new Date().toISOString().slice(0, 10),
      administered_by: user?.full_name || '',
      recovery_status: 'recovering',
      notes: '',
    });
    setModalError(null);
    setShowTreatmentModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar & Quick actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            id="tab-sick-animals-btn"
            onClick={() => setActiveTab('sick')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'sick'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-rose-600" />
            <span>Sick Animals ({healthRecords.filter(r => r.status !== 'recovered').length})</span>
          </button>
          <button
            id="tab-treatments-btn"
            onClick={() => setActiveTab('treatments')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'treatments'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-emerald-600" />
            <span>Treatment History ({treatments.length})</span>
          </button>
          <button
            id="tab-medicines-btn"
            onClick={() => setActiveTab('medicines')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'medicines'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 text-teal-600" />
            <span>Pharmacy Stock ({medicines.length})</span>
          </button>
          <button
            id="tab-diseases-btn"
            onClick={() => setActiveTab('diseases')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'diseases'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Disease Reference</span>
          </button>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="open-report-sick-btn"
            onClick={() => {
              setSickForm({
                species: 'pig',
                animal_id: animals.find(a => a.species === 'pig')?.id ? String(animals.find(a => a.species === 'pig')?.id) : '',
                batch_tag: '',
                date_reported: new Date().toISOString().slice(0, 10),
                symptoms: '',
                disease_id: '',
                diagnosed_condition: '',
                notes: '',
              });
              setModalError(null);
              setShowReportSickModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Report Sick Animal</span>
          </button>

          {!isWorker && (
            <button
              id="open-add-med-btn"
              onClick={() => {
                setModalError(null);
                setShowAddMedicineModal(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Medicine</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SICK ANIMALS UNDER SURVEILLANCE */}
      {activeTab === 'sick' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {rec.species}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {rec.animal_tag || rec.batch_tag || 'Patient'}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rec.status === 'sick'
                          ? 'bg-rose-100 text-rose-700'
                          : rec.status === 'under_treatment'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'recovered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">Condition / Diagnosis: </span>
                      <span className="font-bold text-slate-900">{rec.diagnosed_condition}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Symptoms: </span>
                      <span>{rec.symptoms}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 flex justify-between">
                      <span>Reported: {rec.date_reported}</span>
                      <span>By: {rec.reported_by_name || 'Staff'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Record #{rec.id}</span>
                  {rec.status !== 'recovered' && rec.status !== 'deceased' && (
                    <button
                      id={`treat-record-${rec.id}`}
                      onClick={() => openTreatmentForRecord(rec)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>Administer Treatment</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TREATMENTS LOG */}
      {activeTab === 'treatments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Treatment Administration Log</h3>
              <p className="text-xs text-slate-500">
                All medications administered with automatic live stock deductions
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Patient Tag</th>
                  <th className="px-3 py-2.5">Species</th>
                  <th className="px-3 py-2.5">Medicine</th>
                  <th className="px-3 py-2.5">Dosage Given</th>
                  <th className="px-3 py-2.5">Administered By</th>
                  <th className="px-3 py-2.5">Recovery Status</th>
                  <th className="px-3 py-2.5">Clinical Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {treatments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 font-semibold text-slate-900">{t.date_administered}</td>
                    <td className="px-3 py-3 font-bold">{t.animal_tag || t.batch_tag}</td>
                    <td className="px-3 py-3 capitalize">{t.species}</td>
                    <td className="px-3 py-3 font-semibold text-teal-700">{t.medicine_name}</td>
                    <td className="px-3 py-3 font-bold">
                      {t.dosage_given} {t.medicine_unit}
                    </td>
                    <td className="px-3 py-3">{t.administered_by}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.recovery_status === 'recovered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.recovery_status === 'deceased'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.recovery_status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 italic max-w-xs truncate">
                      {t.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEDICINE PHARMACY INVENTORY */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{med.name}</h4>
                      <p className="text-xs font-medium text-slate-500">{med.category}</p>
                    </div>

                    {med.is_low_stock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                        Low Stock
                      </span>
                    ) : med.expiry_status === 'expired' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase">
                        Expired
                      </span>
                    ) : med.expiry_status === 'expiring_soon' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        Expiring Soon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Adequate
                      </span>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Stock on Hand:</span>
                      <span className="text-lg font-black text-slate-900">
                        {med.stock_quantity} <span className="text-xs font-medium text-slate-500">{med.unit}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reorder Alert Level:</span>
                      <span className="font-semibold">{med.reorder_threshold} {med.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiration Date:</span>
                      <span className="font-semibold">{med.expiry_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supplier:</span>
                      <span className="font-medium truncate">{med.supplier}</span>
                    </div>
                  </div>
                </div>

                {!isWorker && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {restockMedId === med.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={restockAmount}
                          onChange={(e) => setRestockAmount(parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                        <button
                          onClick={() => handleRestock(med.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRestockMedId(null)}
                          className="px-2 py-1 text-slate-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRestockMedId(med.id);
                          setRestockAmount(50);
                        }}
                        className="w-full py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-xl transition-colors border border-teal-200/60"
                      >
                        + Restock Medicine
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DISEASE REFERENCE GUIDE */}
      {activeTab === 'diseases' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Veterinary Disease Reference Manual</h3>
              <p className="text-xs text-slate-500">Standard clinical protocols for pigs, hens, and ostriches</p>
            </div>
            {!isWorker && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowAddDiseaseModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Disease Entry</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diseases.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-extrabold text-base text-slate-900">{d.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                    {d.species_affected}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
                    <span className="font-bold text-rose-900 block mb-0.5">Symptoms & Clinical Signs:</span>
                    <p className="text-rose-800">{d.symptoms}</p>
                  </div>

                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                    <div>
                      <span className="font-bold text-emerald-900">Recommended Drug: </span>
                      <span className="text-emerald-800 font-semibold">{d.recommended_medicines}</span>
                    </div>
                    <div>
                      <span className="font-bold text-emerald-900">Dosage per Weight/Age: </span>
                      <span className="text-emerald-800">{d.dosage_info}</span>
                    </div>
                    <div>
                      <span className="font-bold text-emerald-900">Duration: </span>
                      <span className="text-emerald-800">{d.treatment_duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT SICK ANIMAL MODAL */}
      {showReportSickModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Report Sick Animal / Clinical Incident</h3>
              <button
                onClick={() => setShowReportSickModal(false)}
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

            <form onSubmit={handleReportSick} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species *</label>
                  <select
                    value={sickForm.species}
                    onChange={(e) => setSickForm({ ...sickForm, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="pig">Pig</option>
                    <option value="hen">Hen</option>
                    <option value="ostrich">Ostrich</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Reported *</label>
                  <input
                    type="date"
                    required
                    value={sickForm.date_reported}
                    onChange={(e) => setSickForm({ ...sickForm, date_reported: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Animal Tag (or specify batch)</label>
                <select
                  value={sickForm.animal_id}
                  onChange={(e) => setSickForm({ ...sickForm, animal_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                >
                  <option value="">-- Choose individual animal or leave blank for flock --</option>
                  {animals
                    .filter((a) => a.species === sickForm.species)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tag_id} ({a.breed} - {a.pen_location})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Flock / Batch Identifier (if flock)</label>
                <input
                  type="text"
                  placeholder="e.g. HEN-BATCH-2026A"
                  value={sickForm.batch_tag}
                  onChange={(e) => setSickForm({ ...sickForm, batch_tag: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Symptoms Observed *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Lethargy, coughing, diarrhea, limping, fever..."
                  value={sickForm.symptoms}
                  onChange={(e) => setSickForm({ ...sickForm, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnosed Condition / Suspected Disease *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Respiratory Infection, Coccidiosis, Impaction"
                  value={sickForm.diagnosed_condition}
                  onChange={(e) => setSickForm({ ...sickForm, diagnosed_condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportSickModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {submitting ? 'Submitting...' : 'Log Sick Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMINISTER TREATMENT MODAL (WITH LIVE STOCK VALIDATION) */}
      {showTreatmentModal && selectedRecordForTreatment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Administer Treatment</h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedRecordForTreatment.animal_tag || selectedRecordForTreatment.batch_tag} (
                  {selectedRecordForTreatment.diagnosed_condition})
                </p>
              </div>
              <button
                onClick={() => setShowTreatmentModal(false)}
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

            <form onSubmit={handleAdministerTreatment} className="space-y-4 text-xs">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px]">
                <strong>Automatic Pharmacy Link:</strong> Selected medicine inventory will be automatically deducted upon confirmation. Entries will be blocked if requested dosage exceeds current stock.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Medicine *</label>
                <select
                  required
                  value={treatmentForm.medicine_id}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, medicine_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="">-- Select from Pharmacy Inventory --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Stock: {m.stock_quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Given *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={treatmentForm.dosage_given}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage_given: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Administration Date *</label>
                  <input
                    type="date"
                    required
                    value={treatmentForm.date_administered}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, date_administered: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Administered By *</label>
                  <input
                    type="text"
                    required
                    value={treatmentForm.administered_by}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, administered_by: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient Status *</label>
                  <select
                    value={treatmentForm.recovery_status}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, recovery_status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize font-medium"
                  >
                    <option value="recovering">Still Recovering</option>
                    <option value="recovered">Fully Recovered</option>
                    <option value="deceased">Deceased</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Treatment Response Notes</label>
                <textarea
                  rows={2}
                  placeholder="Body temperature reduction, appetite returning, wound healing..."
                  value={treatmentForm.notes}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTreatmentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submitting ? 'Applying...' : 'Log & Deduct Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Medicine to Pharmacy</h3>
              <button
                onClick={() => setShowAddMedicineModal(false)}
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

            <form onSubmit={handleAddMedicine} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxytetracycline 20% LA"
                  value={medicineForm.name}
                  onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Antibiotic, Vaccine"
                    value={medicineForm.category}
                    onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit *</label>
                  <select
                    value={medicineForm.unit}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize"
                  >
                    <option value="ml">ml (Liquid/Injectable)</option>
                    <option value="tablets">tablets (Oral)</option>
                    <option value="doses">doses (Vaccine)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={medicineForm.stock_quantity}
                    onChange={(e) => setMedicineForm({ ...medicineForm, stock_quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Alert Level *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={medicineForm.reorder_threshold}
                    onChange={(e) => setMedicineForm({ ...medicineForm, reorder_threshold: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiration Date *</label>
                  <input
                    type="date"
                    required
                    value={medicineForm.expiry_date}
                    onChange={(e) => setMedicineForm({ ...medicineForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    required
                    value={medicineForm.supplier}
                    onChange={(e) => setMedicineForm({ ...medicineForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DISEASE REFERENCE MODAL */}
      {showAddDiseaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Clinical Disease Reference</h3>
              <button
                onClick={() => setShowAddDiseaseModal(false)}
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

            <form onSubmit={handleAddDisease} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disease Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swine Erysipelas"
                    value={diseaseForm.name}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species Affected *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pig, hen, ostrich, or all"
                    value={diseaseForm.species_affected}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, species_affected: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Symptoms *</label>
                <textarea
                  required
                  rows={2}
                  value={diseaseForm.symptoms}
                  onChange={(e) => setDiseaseForm({ ...diseaseForm, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recommended Drugs *</label>
                <input
                  type="text"
                  required
                  value={diseaseForm.recommended_medicines}
                  onChange={(e) => setDiseaseForm({ ...diseaseForm, recommended_medicines: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Protocol *</label>
                  <input
                    type="text"
                    required
                    value={diseaseForm.dosage_info}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, dosage_info: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration *</label>
                  <input
                    type="text"
                    required
                    value={diseaseForm.treatment_duration}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, treatment_duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDiseaseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Add Protocol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
