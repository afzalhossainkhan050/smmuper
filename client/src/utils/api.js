const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const { method = 'GET', body, headers: customHeaders = {}, auth = true } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (auth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error', 0, null);
  }
}

const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),

  auth: {
    login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
    register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
    getGoogleConfig: () => request('/auth/google/config', { auth: false }),
    googleLogin: (data) => request('/auth/google', { method: 'POST', body: data, auth: false }),
    getProfile: () => request('/auth/profile'),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
    changePassword: (data) => request('/auth/change-password', { method: 'PUT', body: data }),
    // 2FA methods
    generate2FA: () => request('/auth/2fa/generate', { method: 'POST' }),
    enable2FA: (data) => request('/auth/2fa/enable', { method: 'POST', body: data }),
    disable2FA: (data) => request('/auth/2fa/disable', { method: 'POST', body: data }),
    verify2FALogin: (data) => request('/auth/2fa/verify-login', { method: 'POST', body: data, auth: false }),
    // API Key methods
    getApiKey: () => request('/user-api/key'),
    regenerateApiKey: () => request('/user-api/key/regenerate', { method: 'POST' }),
  },

  system: {
    getConfig: () => request('/system/config', { auth: false }),
    getCurrencies: () => request('/system/currencies', { auth: false }),
    getNotice: () => request('/system/notice', { auth: false }),
  },

  services: {
    getAll: () => request('/services', { auth: false }),
    getCategories: () => request('/services/categories', { auth: false }),
  },

  orders: {
    create: (data) => request('/orders', { method: 'POST', body: data }),
    createMass: (data) => request('/orders/mass', { method: 'POST', body: data }),
    getAll: (params = '') => request(`/orders${params ? '?' + params : ''}`),
    getById: (id) => request(`/orders/${id}`),
    refill: (id) => request(`/orders/${id}/refill`, { method: 'POST' }),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  },

  payments: {
    getMethods: () => request('/payments/methods'),
    deposit: (data) => request('/payments/deposit', { method: 'POST', body: data }),
    addFunds: (data) => request('/payments/add-funds', { method: 'POST', body: data }),
    getHistory: (params = '') => request(`/payments/history${params ? '?' + params : ''}`),
    getTransactions: (params = '') => request(`/payments/transactions${params ? '?' + params : ''}`),
    getReceipt: (id) => request(`/payments/${id}/receipt`),
    getBalance: () => request('/payments/balance'),
  },

  tickets: {
    create: (data) => request('/tickets', { method: 'POST', body: data }),
    getAll: (params = '') => request(`/tickets${params ? '?' + params : ''}`),
    getById: (id) => request(`/tickets/${id}`),
    reply: (id, data) => request(`/tickets/${id}/reply`, { method: 'POST', body: data }),
    close: (id) => request(`/tickets/${id}/close`, { method: 'POST' }),
  },

  referrals: {
    getDashboard: () => request('/referrals'),
  },

  childPanels: {
    getPanels: () => request('/child-panels'),
    order: (data) => request('/child-panels/order', { method: 'POST', body: data }),
    renew: (id) => request(`/child-panels/${id}/renew`, { method: 'POST' }),
  },

  kyc: {
    getStatus: () => request('/kyc'),
    submit: (data) => request('/kyc/submit', { method: 'POST', body: data }),
  },

  cms: {
    getSection: (name) => request(`/cms/sections/${name}`),
    getPages: () => request('/cms/pages'),
    getPage: (slug) => request(`/cms/pages/${slug}`),
    getMenus: () => request('/cms/menus'),
    getBlogs: (params = '') => request(`/cms/blogs${params ? '?' + params : ''}`),
    getBlog: (slug) => request(`/cms/blogs/${slug}`),
    getAuthors: () => request('/cms/authors'),
    getNotices: () => request('/cms/notices'),
    subscribe: (email) => request('/cms/subscribe', { method: 'POST', body: { email } }),
    getSeo: () => request('/cms/seo'),
  },

  admin: {
    getDashboard: () => request('/admin/dashboard'),
    getAnalytics: (period = '30d') => request(`/admin/analytics?period=${period}`),
    
    // Users
    getUsers: (params = '') => request(`/admin/users${params ? '?' + params : ''}`),
    getUserById: (id) => request(`/admin/users/${id}`),
    createUser: (data) => request('/admin/users', { method: 'POST', body: data }),
    updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
    adjustBalance: (id, data) => request(`/admin/users/${id}/balance`, { method: 'POST', body: data }),
    loginAsUser: (id) => request(`/admin/users/${id}/login-as`, { method: 'POST' }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    bulkActionUsers: (data) => request('/admin/users/bulk-action', { method: 'POST', body: data }),
    sendMail: (data) => request('/admin/users/mail', { method: 'POST', body: data }),

    // Staff
    getStaff: () => request('/admin/staff'),
    createStaff: (data) => request('/admin/staff', { method: 'POST', body: data }),
    updateStaff: (id, data) => request(`/admin/staff/${id}`, { method: 'PUT', body: data }),
    deleteStaff: (id) => request(`/admin/staff/${id}`, { method: 'DELETE' }),

    // Roles & Permissions
    getRoles: () => request('/admin/roles'),
    getPermissionsList: () => request('/admin/roles/permissions-list'),
    createRole: (data) => request('/admin/roles', { method: 'POST', body: data }),
    updateRole: (id, data) => request(`/admin/roles/${id}`, { method: 'PUT', body: data }),
    deleteRole: (id) => request(`/admin/roles/${id}`, { method: 'DELETE' }),

    // Activity Logs
    getActivityLogs: (params = '') => request(`/admin/activity-logs${params ? '?' + params : ''}`),
    clearActivityLogs: () => request('/admin/activity-logs/clear', { method: 'DELETE' }),

    // Currencies
    getCurrencies: () => request('/admin/currencies'),
    createCurrency: (data) => request('/admin/currencies', { method: 'POST', body: data }),
    updateCurrency: (id, data) => request(`/admin/currencies/${id}`, { method: 'PUT', body: data }),
    setDefaultCurrency: (id) => request(`/admin/currencies/${id}/set-default`, { method: 'PUT' }),
    deleteCurrency: (id) => request(`/admin/currencies/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => request('/admin/settings'),
    updateSettings: (settings) => request('/admin/settings', { method: 'PUT', body: { settings } }),

    // Google login
    getGoogleSettings: () => request('/admin/google-login-settings'),
    updateGoogleSettings: (data) => request('/admin/google-login-settings', { method: 'PUT', body: data }),

    // Email
    getEmailSettings: () => request('/admin/email-settings'),
    updateEmailSettings: (data) => request('/admin/email-settings', { method: 'PUT', body: data }),
    sendTestEmail: (email) => request('/admin/email-settings/test', { method: 'POST', body: { email } }),
    getEmailTemplates: () => request('/admin/email-templates'),
    updateEmailTemplate: (id, data) => request(`/admin/email-templates/${id}`, { method: 'PUT', body: data }),

    // Notifications
    getNotificationSettings: () => request('/admin/notification-settings'),
    updateNotificationSettings: (data) => request('/admin/notification-settings', { method: 'PUT', body: data }),
    getNotificationTemplates: () => request('/admin/notification-templates'),
    updateNotificationTemplate: (id, data) => request(`/admin/notification-templates/${id}`, { method: 'PUT', body: data }),

    // API Providers (Phase 3)
    getProviders: () => request('/admin/providers'),
    getProviderById: (id) => request(`/admin/providers/${id}`),
    createProvider: (data) => request('/admin/providers', { method: 'POST', body: data }),
    updateProvider: (id, data) => request(`/admin/providers/${id}`, { method: 'PUT', body: data }),
    deleteProvider: (id) => request(`/admin/providers/${id}`, { method: 'DELETE' }),
    testProviderConnection: (id) => request(`/admin/providers/${id}/test-connection`, { method: 'POST' }),
    checkProviderBalance: (id) => request(`/admin/providers/${id}/check-balance`, { method: 'POST' }),
    getProviderRemoteServices: (id) => request(`/admin/providers/${id}/remote-services`),
    importProviderServices: (id, data) => request(`/admin/providers/${id}/import-services`, { method: 'POST', body: data }),
    syncProviderServices: (id, data) => request(`/admin/providers/${id}/sync-services`, { method: 'POST', body: data }),
    getProviderLogs: (id, params = '') => request(`/admin/providers/${id}/logs${params ? '?' + params : ''}`),
    clearProviderLogs: (id) => request(`/admin/providers/${id}/logs`, { method: 'DELETE' }),

    // Addons
    getAddons: () => request('/admin/addons'),
    toggleAddon: (id) => request(`/admin/addons/${id}/toggle`, { method: 'PUT' }),

    // Notices
    getNotices: (params = '') => request(`/admin/notices${params ? '?' + params : ''}`),
    getNoticeById: (id) => request(`/admin/notices/${id}`),
    createNotice: (data) => request('/admin/notices', { method: 'POST', body: data }),
    updateNotice: (id, data) => request(`/admin/notices/${id}`, { method: 'PUT', body: data }),
    deleteNotice: (id) => request(`/admin/notices/${id}`, { method: 'DELETE' }),

    // Blog Authors
    getBlogAuthors: (params = '') => request(`/admin/blog-authors${params ? '?' + params : ''}`),
    getBlogAuthorById: (id) => request(`/admin/blog-authors/${id}`),
    createBlogAuthor: (data) => request('/admin/blog-authors', { method: 'POST', body: data }),
    updateBlogAuthor: (id, data) => request(`/admin/blog-authors/${id}`, { method: 'PUT', body: data }),
    deleteBlogAuthor: (id) => request(`/admin/blog-authors/${id}`, { method: 'DELETE' }),

    // Orders & Services
    getOrders: (params = '') => request(`/admin/orders${params ? '?' + params : ''}`),
    getOrderById: (id) => request(`/admin/orders/${id}`),
    updateOrder: (id, data) => request(`/admin/orders/${id}`, { method: 'PUT', body: data }),
    resendOrder: (id) => request(`/admin/orders/${id}/resend`, { method: 'POST' }),
    cancelOrder: (id) => request(`/admin/orders/${id}/cancel`, { method: 'POST' }),
    refillOrder: (id) => request(`/admin/orders/${id}/refill`, { method: 'POST' }),
    syncOrdersStatus: () => request('/admin/orders/sync-status', { method: 'POST' }),

    // Services
    getServices: (params = '') => request(`/admin/services${params ? '?' + params : ''}`),
    createService: (data) => request('/admin/services', { method: 'POST', body: data }),
    updateService: (id, data) => request(`/admin/services/${id}`, { method: 'PUT', body: data }),
    deleteService: (id) => request(`/admin/services/${id}`, { method: 'DELETE' }),
    toggleServiceStatus: (id) => request(`/admin/services/${id}/toggle-status`, { method: 'PUT' }),
    bulkActionServices: (data) => request('/admin/services/bulk-action', { method: 'POST', body: data }),

    // Categories
    getCategories: (params = '') => request(`/admin/categories${params ? '?' + params : ''}`),
    createCategory: (data) => request('/admin/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PUT', body: data }),
    deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
    sortCategories: (items) => request('/admin/categories/sort', { method: 'PUT', body: { items } }),

    // Social Media Platforms
    getSocialMedia: () => request('/admin/social-media'),
    createSocialMedia: (data) => request('/admin/social-media', { method: 'POST', body: data }),
    updateSocialMedia: (id, data) => request(`/admin/social-media/${id}`, { method: 'PUT', body: data }),
    deleteSocialMedia: (id) => request(`/admin/social-media/${id}`, { method: 'DELETE' }),
    sortSocialMedia: (items) => request('/admin/social-media/sort', { method: 'PUT', body: { items } }),

    // Payment Gateways & Management (Phase 5)
    getPaymentMethods: () => request('/admin/payment-methods'),
    getPaymentMethodById: (id) => request(`/admin/payment-methods/${id}`),
    createPaymentMethod: (data) => request('/admin/payment-methods', { method: 'POST', body: data }),
    updatePaymentMethod: (id, data) => request(`/admin/payment-methods/${id}`, { method: 'PUT', body: data }),
    togglePaymentMethod: (id) => request(`/admin/payment-methods/${id}/toggle`, { method: 'PUT' }),
    deletePaymentMethod: (id) => request(`/admin/payment-methods/${id}`, { method: 'DELETE' }),

    // Payments & Approvals
    getPayments: (params = '') => request(`/admin/payments${params ? '?' + params : ''}`),
    getPendingPayments: () => request('/admin/payments/pending'),
    getPaymentById: (id) => request(`/admin/payments/${id}`),
    approvePayment: (id, data = {}) => request(`/admin/payments/${id}/approve`, { method: 'POST', body: data }),
    rejectPayment: (id, data = {}) => request(`/admin/payments/${id}/reject`, { method: 'POST', body: data }),

    // Financial Ledger & Reports
    getTransactions: (params = '') => request(`/admin/transactions${params ? '?' + params : ''}`),
    getFinancialReports: (params = '') => request(`/admin/financial-reports${params ? '?' + params : ''}`),

    // Tickets (Admin)
    getTickets: (params = '') => request(`/admin/tickets${params ? '?' + params : ''}`),
    getTicketById: (id) => request(`/admin/tickets/${id}`),
    replyTicket: (id, data) => request(`/admin/tickets/${id}/reply`, { method: 'POST', body: data }),
    updateTicket: (id, data) => request(`/admin/tickets/${id}`, { method: 'PUT', body: data }),

    // Referrals (Admin)
    getReferrals: (params = '') => request(`/admin/referrals${params ? '?' + params : ''}`),
    updateReferralSettings: (data) => request('/admin/referrals/settings', { method: 'PUT', body: data }),

    // Child Panels (Admin - Phase 7)
    getChildPanelsDashboard: () => request('/admin/child-panels/dashboard'),
    getChildPanels: (params = '') => request(`/admin/child-panels${params ? '?' + params : ''}`),
    updateChildPanelSettings: (data) => request('/admin/child-panels/settings', { method: 'PUT', body: data }),
    updateChildPanel: (id, data) => request(`/admin/child-panels/${id}`, { method: 'PUT', body: data }),
    deleteChildPanel: (id) => request(`/admin/child-panels/${id}`, { method: 'DELETE' }),

    // KYC Verification (Admin - Phase 7)
    getKycSettings: () => request('/admin/kyc/settings'),
    createKycSetting: (data) => request('/admin/kyc/settings', { method: 'POST', body: data }),
    updateKycSetting: (id, data) => request(`/admin/kyc/settings/${id}`, { method: 'PUT', body: data }),
    deleteKycSetting: (id) => request(`/admin/kyc/settings/${id}`, { method: 'DELETE' }),
    getKycSubmissions: (params = '') => request(`/admin/kyc/submissions${params ? '?' + params : ''}`),
    getKycSubmissionById: (id) => request(`/admin/kyc/submissions/${id}`),
    approveKycSubmission: (id) => request(`/admin/kyc/submissions/${id}/approve`, { method: 'POST' }),
    rejectKycSubmission: (id, data) => request(`/admin/kyc/submissions/${id}/reject`, { method: 'POST', body: data }),

    // CMS Content Sections (Admin - Phase 7)
    getCmsSections: () => request('/admin/cms/sections'),
    getCmsSection: (section) => request(`/admin/cms/sections/${section}`),
    updateCmsSection: (section, data) => request(`/admin/cms/sections/${section}`, { method: 'PUT', body: data }),

    // Pages (Admin - Phase 7)
    getPages: (params = '') => request(`/admin/pages${params ? '?' + params : ''}`),
    getPageById: (id) => request(`/admin/pages/${id}`),
    createPage: (data) => request('/admin/pages', { method: 'POST', body: data }),
    updatePage: (id, data) => request(`/admin/pages/${id}`, { method: 'PUT', body: data }),
    deletePage: (id) => request(`/admin/pages/${id}`, { method: 'DELETE' }),

    // Menus (Admin - Phase 7)
    getMenus: (params = '') => request(`/admin/menus${params ? '?' + params : ''}`),
    createMenu: (data) => request('/admin/menus', { method: 'POST', body: data }),
    updateMenu: (id, data) => request(`/admin/menus/${id}`, { method: 'PUT', body: data }),
    deleteMenu: (id) => request(`/admin/menus/${id}`, { method: 'DELETE' }),

    // Blog Categories & Blogs (Admin - Phase 7)
    getBlogCategories: () => request('/admin/blog-categories'),
    createBlogCategory: (data) => request('/admin/blog-categories', { method: 'POST', body: data }),
    updateBlogCategory: (id, data) => request(`/admin/blog-categories/${id}`, { method: 'PUT', body: data }),
    deleteBlogCategory: (id) => request(`/admin/blog-categories/${id}`, { method: 'DELETE' }),
    getBlogs: (params = '') => request(`/admin/blogs${params ? '?' + params : ''}`),
    getBlogById: (id) => request(`/admin/blogs/${id}`),
    createBlog: (data) => request('/admin/blogs', { method: 'POST', body: data }),
    updateBlog: (id, data) => request(`/admin/blogs/${id}`, { method: 'PUT', body: data }),
    deleteBlog: (id) => request(`/admin/blogs/${id}`, { method: 'DELETE' }),

    // Subscribers (Admin - Phase 7)
    getSubscribers: (params = '') => request(`/admin/subscribers${params ? '?' + params : ''}`),
    deleteSubscriber: (id) => request(`/admin/subscribers/${id}`, { method: 'DELETE' }),

    // System Maintenance (Admin - Phase 7)
    getMaintenanceStatus: () => request('/admin/system/maintenance'),
    toggleMaintenance: (enabled) => request('/admin/system/maintenance', { method: 'PUT', body: { enabled } }),
  },
};

export { api, ApiError };
export default api;
