import { useAuth } from '../context/AuthContext';

const API_URL = '/api';

export function useApi() {
  const { token, logout } = useAuth();

  const fetchWithAuth = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired');
    }

    return res;
  };

  // Sales API
  const getSales = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetchWithAuth(`/sales?${params}`);
    return res.json();
  };

  const createSale = async (saleData) => {
    const res = await fetchWithAuth('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
    return res.json();
  };

  const updateSale = async (id, saleData) => {
    const res = await fetchWithAuth(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData)
    });
    return res.json();
  };

  const deleteSale = async (id) => {
    const res = await fetchWithAuth(`/sales/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  };

  // Salespeople API
  const getSalespeople = async () => {
    const res = await fetchWithAuth('/salespeople');
    return res.json();
  };

  const createSalesperson = async (data) => {
    const res = await fetchWithAuth('/salespeople', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  };

  const updateSalesperson = async (id, data) => {
    const res = await fetchWithAuth(`/salespeople/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.json();
  };

  const deleteSalesperson = async (id) => {
    const res = await fetchWithAuth(`/salespeople/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  };

  // Users API
  const getUsers = async () => {
    const res = await fetchWithAuth('/users');
    return res.json();
  };

  const createUser = async (userData) => {
    const res = await fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return res.json();
  };

  const updateUser = async (id, userData) => {
    const res = await fetchWithAuth(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return res.json();
  };

  const deleteUser = async (id) => {
    const res = await fetchWithAuth(`/users/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  };

  // Settings API
  const getSettings = async () => {
    const res = await fetchWithAuth('/settings');
    return res.json();
  };

  const updateSettings = async (settings) => {
    const res = await fetchWithAuth('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    return res.json();
  };

  // Analytics API
  const getDashboard = async () => {
    const res = await fetchWithAuth('/analytics/dashboard');
    return res.json();
  };

  return {
    getSales,
    createSale,
    updateSale,
    deleteSale,
    getSalespeople,
    createSalesperson,
    updateSalesperson,
    deleteSalesperson,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getSettings,
    updateSettings,
    getDashboard
  };
}
