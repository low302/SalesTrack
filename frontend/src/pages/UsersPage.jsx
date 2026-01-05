import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, Loader2, Shield, User } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', fullName: '', email: '', role: 'user' });
  const { isAdmin, user: currentUser } = useAuth();
  const api = useApi();

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.updateUser(editingUser.id, updateData);
      } else {
        await api.createUser(formData);
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try { await api.deleteUser(id); loadUsers(); } catch (error) { console.error('Failed to delete user:', error); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', fullName: user.fullName, email: user.email, role: user.role });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', fullName: '', email: '', role: 'user' });
  };

  if (!isAdmin) return <div className="alert alert-error">Access denied. Admin privileges required.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-base-content/60">Manage system users and permissions</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="card bg-base-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-base-200">
              <tr><th>User</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                          <span>{user.fullName?.charAt(0) || 'U'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-base-content/60">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
                      {user.role === 'admin' ? <Shield size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(user)} className="btn btn-ghost btn-xs btn-square"><Edit2 size={14} /></button>
                      {user.username !== 'admin' && user.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(user.id)} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4">{editingUser ? 'Edit User' : 'Add User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Full Name *</span></label>
                  <input type="text" className="input input-bordered" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Username *</span></label>
                  <input type="text" className="input input-bordered" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required disabled={editingUser} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Email *</span></label>
                  <input type="email" className="input input-bordered" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</span></label>
                  <input type="password" className="input input-bordered" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Role *</span></label>
                  <select className="select select-bordered" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowModal(false); resetForm(); }}></div>
        </div>
      )}
    </div>
  );
}
