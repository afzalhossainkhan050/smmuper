/**
 * CoolAir Pro - Centralized API Service
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('coolair_token');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    getMe: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
    getUsers: (params = '') => request(`/auth/users${params}`),
  },

  // Services
  services: {
    getAll: (category) => request(`/services${category ? `?category=${category}` : ''}`),
    getBySlug: (slug) => request(`/services/${slug}`),
    adminGetAll: (params = '') => request(`/services/admin/all${params}`),
    create: (data) => request('/services', { method: 'POST', body: data }),
    update: (id, data) => request(`/services/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  },

  // Bookings
  bookings: {
    create: (bookingData) => request('/bookings', { method: 'POST', body: bookingData }),
    getStatus: (referenceCode) => request(`/bookings/status/${referenceCode}`),
    getMy: () => request('/bookings/my'),
    adminGetAll: (params = '') => request(`/bookings${params}`),
    updateStatus: (id, status, admin_notes, total_price) =>
      request(`/bookings/${id}/status`, {
        method: 'PUT',
        body: { status, admin_notes, total_price },
      }),
    assignTechnician: (id, technician_id) =>
      request(`/bookings/${id}/assign`, {
        method: 'PUT',
        body: { technician_id },
      }),
    reschedule: (id, preferred_date, preferred_time) =>
      request(`/bookings/${id}/reschedule`, {
        method: 'PUT',
        body: { preferred_date, preferred_time },
      }),
  },

  // Technicians
  technicians: {
    getAll: (availableOnly = false) =>
      request(`/technicians${availableOnly ? '?available_only=true' : ''}`),
    create: (data) => request('/technicians', { method: 'POST', body: data }),
    update: (id, data) => request(`/technicians/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/technicians/${id}`, { method: 'DELETE' }),
  },

  // Reviews
  reviews: {
    getApproved: (serviceId) =>
      request(`/reviews${serviceId ? `?service_id=${serviceId}` : ''}`),
    submit: (reviewData) => request('/reviews', { method: 'POST', body: reviewData }),
    adminGetAll: (params = '') => request(`/reviews/admin${params}`),
    toggleApproval: (id, approved) =>
      request(`/reviews/${id}/approve`, { method: 'PUT', body: { approved } }),
    delete: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  },

  // Contact
  contact: {
    submit: (messageData) => request('/contact', { method: 'POST', body: messageData }),
    adminGetAll: (params = '') => request(`/contact${params}`),
    markRead: (id) => request(`/contact/${id}/read`, { method: 'PUT' }),
    delete: (id) => request(`/contact/${id}`, { method: 'DELETE' }),
  },

  // Settings
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: data }),
  },

  // Dashboard
  dashboard: {
    getStats: () => request('/dashboard/stats'),
  },
};

export default api;
