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

  // For file uploads (no JSON Content-Type)
  const fetchWithAuthFormData = async (endpoint, options = {}) => {
    const headers = { ...options.headers };

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

  const getNewDashboard = async () => {
    const res = await fetchWithAuth('/analytics/dashboard/new');
    return res.json();
  };

  const getUsedDashboard = async () => {
    const res = await fetchWithAuth('/analytics/dashboard/used');
    return res.json();
  };

  // Teams API
  const getTeams = async () => {
    const res = await fetchWithAuth('/teams');
    return res.json();
  };

  const getTeam = async (id) => {
    const res = await fetchWithAuth(`/teams/${id}`);
    return res.json();
  };

  const createTeam = async (data) => {
    const res = await fetchWithAuth('/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  };

  const updateTeam = async (id, data) => {
    const res = await fetchWithAuth(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.json();
  };

  const deleteTeam = async (id) => {
    const res = await fetchWithAuth(`/teams/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  };

  const getTeamStats = async (id, params = {}) => {
    const queryParams = new URLSearchParams(params);
    const res = await fetchWithAuth(`/teams/${id}/stats?${queryParams}`);
    return res.json();
  };

  // PDF Import API
  const importSalesPDF = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithAuthFormData('/sales/import-pdf', {
      method: 'POST',
      body: formData
    });
    return res.json();
  };

  const confirmSalesImport = async (records) => {
    const res = await fetchWithAuth('/sales/import-pdf/confirm', {
      method: 'POST',
      body: JSON.stringify({ records })
    });
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
    getDashboard,
    getNewDashboard,
    getUsedDashboard,
    getTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeamStats,
    importSalesPDF,
    confirmSalesImport
  };
}

