import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { User, ActivityLog, Role } from '../types/index.ts';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedLogModule, setSelectedLogModule] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New user form
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'worker' as Role,
    contact_number: '+263 77 ',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [uRes, logRes] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<ActivityLog[]>(`/users/activity-logs?module=${selectedLogModule}`),
      ]);
      setUsers(uRes);
      setActivityLogs(logRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load user management');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLogModule]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/users', userForm);
      setShowAddUserModal(false);
      setUserForm({
        email: '',
        password: '',
        full_name: '',
        role: 'worker',
        contact_number: '+263 77 ',
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: Role) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      await loadData();
    } catch (err: any) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus });
      await loadData();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase mb-1">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            SIMBA Admin Access Only
          </div>
          <h2 className="text-lg font-bold text-slate-900">Personnel & Farm Security Console</h2>
          <p className="text-xs text-slate-500">
            Manage worker accounts, veterinarian access levels, and examine timestamped audit logs
          </p>
        </div>

        <button
          id="open-add-user-btn"
          onClick={() => {
            setModalError(null);
            setShowAddUserModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">Active Farm Staff Directory</h3>
        <p className="text-xs text-slate-500 mb-4">Roles determine permitted access and data-entry scopes</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Staff Member</th>
                <th className="px-4 py-2.5">Contact Number</th>
                <th className="px-4 py-2.5">Role Permission</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date Added</th>
                <th className="px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{u.full_name}</div>
                    <div className="text-slate-500 text-[11px]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    {u.contact_number || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      disabled={u.id === 1} // Protect default SIMBA root account
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold capitalize focus:border-emerald-500 disabled:bg-slate-100"
                    >
                      <option value="admin">Admin</option>
                      <option value="worker">Farm Worker</option>
                      <option value="vet">Veterinarian</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {u.date_added ? new Date(u.date_added).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== 1 && (
                      <button
                        onClick={() => handleStatusToggle(u.id, u.status)}
                        className={`text-xs font-semibold hover:underline ${
                          u.status === 'active' ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log / Full Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">System Activity Audit Trail</h3>
            <p className="text-xs text-slate-500">
              Tamper-evident logs of all births, treatments, feed deductions, and user updates
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'animals', 'births', 'deaths', 'health', 'feed', 'breeding', 'users'] as const).map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedLogModule(mod)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] whitespace-nowrap transition-colors ${
                  selectedLogModule === mod
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {activityLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.user_name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {log.module}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">[{log.action}]</span>
                </div>
                <p className="text-slate-600 mt-1">{log.details}</p>
              </div>

              <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Farm Staff Member</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
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

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tendai Moyo"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email / Username *</label>
                <input
                  type="email"
                  required
                  placeholder="moyo@mutoporaz.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Permission *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 capitalize font-bold"
                  >
                    <option value="worker">Farm Worker</option>
                    <option value="vet">Veterinarian</option>
                    <option value="admin">Farm Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="+263 77 000 0000"
                  value={userForm.contact_number}
                  onChange={(e) => setUserForm({ ...userForm, contact_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
