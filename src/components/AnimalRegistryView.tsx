import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Filter,
  Layers,
  MapPin,
  Calendar,
  Tag,
  AlertCircle,
  X,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Animal, Species, Sex, Source, AnimalStatus } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AnimalRegistryView: React.FC = () => {
  const { isAdmin, isVet } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('alive');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tag_id: '',
    species: 'pig' as Species,
    breed: '',
    sex: 'female' as Sex,
    date_of_birth: new Date().toISOString().slice(0, 10),
    source: 'born_on_farm' as Source,
    status: 'alive' as AnimalStatus,
    pen_location: '',
    is_batch: false,
    batch_count: 1,
    notes: '',
  });

  const loadAnimals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Animal[]>(`/animals?species=${selectedSpecies}&status=${selectedStatus}`);
      setAnimals(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load animal registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, [selectedSpecies, selectedStatus]);

  const handleOpenAdd = (defaultSpecies?: Species) => {
    const sp = defaultSpecies || 'pig';
    const tagPrefix = sp === 'pig' ? 'PIG-' : sp === 'hen' ? 'HEN-BATCH-' : 'OST-';
    const randomNum = Math.floor(100 + Math.random() * 900);
    setFormData({
      tag_id: `${tagPrefix}${randomNum}`,
      species: sp,
      breed: sp === 'pig' ? 'Landrace' : sp === 'hen' ? 'Lohmann Brown' : 'African Black',
      sex: sp === 'hen' ? 'batch_mixed' : 'female',
      date_of_birth: new Date().toISOString().slice(0, 10),
      source: 'born_on_farm',
      status: 'alive',
      pen_location: sp === 'pig' ? 'Pen P-1' : sp === 'hen' ? 'Coop H-1' : 'Paddock O-1',
      is_batch: sp === 'hen',
      batch_count: sp === 'hen' ? 100 : 1,
      notes: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingAnimal) {
        // Update animal
        await api.put(`/animals/${editingAnimal.id}`, {
          breed: formData.breed,
          sex: formData.sex,
          pen_location: formData.pen_location,
          status: formData.status,
          batch_count: formData.is_batch ? formData.batch_count : 1,
          notes: formData.notes,
        });
      } else {
        // Register new
        await api.post('/animals', {
          ...formData,
          is_batch: formData.is_batch ? 1 : 0,
          batch_count: formData.is_batch ? Number(formData.batch_count) : 1,
        });
      }
      setShowAddModal(false);
      setEditingAnimal(null);
      await loadAnimals();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const startEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setFormData({
      tag_id: animal.tag_id,
      species: animal.species,
      breed: animal.breed,
      sex: animal.sex,
      date_of_birth: animal.date_of_birth,
      source: animal.source,
      status: animal.status,
      pen_location: animal.pen_location,
      is_batch: animal.is_batch === 1,
      batch_count: animal.batch_count || 1,
      notes: animal.notes || '',
    });
    setShowAddModal(true);
  };

  // Filter in memory for search query
  const filteredAnimals = animals.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      a.tag_id.toLowerCase().includes(q) ||
      a.breed.toLowerCase().includes(q) ||
      a.pen_location.toLowerCase().includes(q) ||
      (a.notes && a.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header controls & stats bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Animal & Flock Master Registry</h2>
          <p className="text-xs text-slate-500">
            {animals.length} records found • Tracking individual breeders and large commercial batches
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="register-pig-btn"
            onClick={() => handleOpenAdd('pig')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Pig</span>
          </button>
          <button
            id="register-hen-btn"
            onClick={() => handleOpenAdd('hen')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Hen Flock</span>
          </button>
          <button
            id="register-ostrich-btn"
            onClick={() => handleOpenAdd('ostrich')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ostrich</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Tag ID, Pen location, breed, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Species selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'pig', 'hen', 'ostrich'] as const).map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSpecies(sp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider capitalize whitespace-nowrap transition-colors ${
                selectedSpecies === sp
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sp === 'all' ? 'All Species' : sp}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          {(['alive', 'sold', 'deceased', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Livestock Records Cards / Table */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">Fetching livestock records...</p>
        </div>
      ) : filteredAnimals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No livestock records match this filter.</p>
          <p className="text-xs text-slate-400 mt-1">Try selecting "All" or registering a new animal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.map((animal) => {
            const isBatch = animal.is_batch === 1;
            return (
              <div
                key={animal.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-base text-slate-900 tracking-tight">
                          {animal.tag_id}
                        </span>
                        {isBatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Layers className="w-3 h-3" />
                            Batch ({animal.batch_count} head)
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-500 capitalize">
                        {animal.species} • {animal.breed}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        animal.status === 'alive'
                          ? 'bg-emerald-100 text-emerald-800'
                          : animal.status === 'sold'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {animal.status}
                    </span>
                  </div>

                  {/* Info points */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{animal.pen_location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 capitalize">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>{animal.sex.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>DOB: {animal.date_of_birth}</span>
                    </div>
                    <div className="flex items-center gap-1.5 capitalize">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{animal.source.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {animal.notes && (
                    <p className="text-xs text-slate-500 italic mt-2.5 line-clamp-2">
                      "{animal.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Added: {animal.created_at?.slice(0, 10)}
                  </span>
                  <button
                    id={`edit-animal-${animal.id}`}
                    onClick={() => startEdit(animal)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 font-semibold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit / Pen</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingAnimal ? `Edit Animal / Pen: ${editingAnimal.tag_id}` : 'Register New Animal or Flock'}
                </h3>
                <p className="text-xs text-slate-500">The Mutoporaz Farms livestock records</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAnimal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tag / Batch ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAnimal}
                    value={formData.tag_id}
                    onChange={(e) => setFormData({ ...formData, tag_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Species *</label>
                  <select
                    disabled={!!editingAnimal}
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value as Species })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 capitalize"
                  >
                    <option value="pig">Pig (Swine)</option>
                    <option value="hen">Hen (Poultry)</option>
                    <option value="ostrich">Ostrich (Ratite)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Breed *</label>
                  <input
                    type="text"
                    required
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g. Duroc, Lohmann, African Black"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sex *</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as Sex })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden capitalize"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="batch_mixed">Batch Mixed (Flock)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pen / Enclosure Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pen P-1, Coop H-2, Paddock O-1"
                    value={formData.pen_location}
                    onChange={(e) => setFormData({ ...formData, pen_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source *</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as Source })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden capitalize"
                  >
                    <option value="born_on_farm">Born on Farm</option>
                    <option value="purchased">Purchased</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AnimalStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden capitalize"
                  >
                    <option value="alive">Alive</option>
                    <option value="sold">Sold</option>
                    <option value="deceased">Deceased</option>
                  </select>
                </div>
              </div>

              {/* Batch / Flock Tracking option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_batch}
                    disabled={!!editingAnimal}
                    onChange={(e) => setFormData({ ...formData, is_batch: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-800">Track as Flock / Batch (e.g. Hens or Nursery chicks)</span>
                </label>

                {formData.is_batch && (
                  <div className="mt-2 pl-6">
                    <label className="block font-medium text-slate-600 mb-1">Current Headcount in Batch:</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.batch_count}
                      onChange={(e) => setFormData({ ...formData, batch_count: parseInt(e.target.value, 10) || 1 })}
                      className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes & Pedigree Details</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Parentage, special markers, lineage or vaccination notes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Saving...' : editingAnimal ? 'Update Record' : 'Register Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
