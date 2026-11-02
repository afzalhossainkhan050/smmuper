import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DashboardLayout from './components/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import ServicesListPage from './pages/ServicesListPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomPageView from './pages/CustomPageView';
import BlogsPublicPage from './pages/BlogsPublicPage';
import SingleBlogView from './pages/SingleBlogView';

// Customer Dashboard Pages
import DashboardPage from './pages/DashboardPage';
import NewOrderPage from './pages/NewOrderPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import ServicesPage from './pages/ServicesPage';
import AddFundsPage from './pages/AddFundsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import ProfilePage from './pages/ProfilePage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import ApiDocsPage from './pages/ApiDocsPage';
import ReferralsPage from './pages/ReferralsPage';
import ChildPanelsPage from './pages/ChildPanelsPage';
import KycVerificationPage from './pages/KycVerificationPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminApiProvidersPage from './pages/admin/AdminApiProvidersPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminActivityLogsPage from './pages/admin/AdminActivityLogsPage';
import AdminCurrenciesPage from './pages/admin/AdminCurrenciesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminEmailSettingsPage from './pages/admin/AdminEmailSettingsPage';
import AdminNotificationSettingsPage from './pages/admin/AdminNotificationSettingsPage';
import AdminAddonsPage from './pages/admin/AdminAddonsPage';
import AdminMailUsersPage from './pages/admin/AdminMailUsersPage';
import AdminNoticesPage from './pages/admin/AdminNoticesPage';
import AdminBlogAuthorsPage from './pages/admin/AdminBlogAuthorsPage';
import AdminSocialMediaPage from './pages/admin/AdminSocialMediaPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminPaymentGatewaysPage from './pages/admin/AdminPaymentGatewaysPage';
import AdminPaymentRequestsPage from './pages/admin/AdminPaymentRequestsPage';
import AdminPaymentLogPage from './pages/admin/AdminPaymentLogPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminReferralsPage from './pages/admin/AdminReferralsPage';
import AdminChildPanelsPage from './pages/admin/AdminChildPanelsPage';
import AdminKycSettingsPage from './pages/admin/AdminKycSettingsPage';
import AdminKycRequestsPage from './pages/admin/AdminKycRequestsPage';
import AdminSubscribersPage from './pages/admin/AdminSubscribersPage';
import AdminThemesPage from './pages/admin/AdminThemesPage';
import AdminPagesPage from './pages/admin/AdminPagesPage';
import AdminMenusPage from './pages/admin/AdminMenusPage';
import AdminCmsContentPage from './pages/admin/AdminCmsContentPage';
import AdminBlogsPage from './pages/admin/AdminBlogsPage';
import AdminSystemBackupPage from './pages/admin/AdminSystemBackupPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const { toast } = useAuth();

  return (
    <>
      <ScrollToTop />

      {/* Global Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast-pill toast-${toast.type || 'info'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/page/:slug" element={<CustomPageView />} />
          <Route path="/blogs" element={<BlogsPublicPage />} />
          <Route path="/blog/:slug" element={<SingleBlogView />} />
        </Route>

        {/* Customer Dashboard Routes (Protected) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="new-order" element={<NewOrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="add-funds" element={<AddFundsPage />} />
          <Route path="payments" element={<PaymentHistoryPage />} />
          <Route path="child-panels" element={<ChildPanelsPage />} />
          <Route path="kyc" element={<KycVerificationPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
        </Route>

        {/* Admin Management Routes (Protected, Admin Only) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Dashboard */}
          <Route index element={<AdminDashboardPage />} />

          {/* Child Panel Module */}
          <Route path="child-panels" element={<AdminChildPanelsPage defaultTab="all" />} />
          <Route path="child-panels/pricing" element={<AdminChildPanelsPage defaultTab="all" />} />
          <Route path="child-panels/running" element={<AdminChildPanelsPage defaultTab="active" />} />
          <Route path="child-panels/requests" element={<AdminChildPanelsPage defaultTab="pending" />} />
          <Route path="child-panels/renewals" element={<AdminChildPanelsPage defaultTab="renew_requested" />} />

          {/* API Provider Module (Phase 3) */}
          <Route path="providers" element={<AdminApiProvidersPage />} />

          {/* Currency Management */}
          <Route path="currencies" element={<AdminCurrenciesPage />} />

          {/* Services & Categories (Phase 4) */}
          <Route path="social-media" element={<AdminSocialMediaPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="services" element={<AdminServicesPage />} />

          {/* Order Management (Phase 4) */}
          <Route path="orders" element={<AdminOrdersPage />} />

          {/* Transactions & Financials (Phase 5) */}
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="payments" element={<AdminPaymentLogPage />} />
          <Route path="payment-requests" element={<AdminPaymentRequestsPage />} />

          {/* Support Tickets */}
          <Route path="tickets" element={<AdminTicketsPage />} />

          {/* KYC Management (Phase 7) */}
          <Route path="kyc-settings" element={<AdminKycSettingsPage />} />
          <Route path="kyc-requests" element={<AdminKycRequestsPage />} />

          {/* Subscribers (Phase 7) */}
          <Route path="subscribers" element={<AdminSubscribersPage />} />

          {/* Users & Staff */}
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="mail-users" element={<AdminMailUsersPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="activity-logs" element={<AdminActivityLogsPage />} />

          {/* Commissions & Referrals */}
          <Route path="referrals" element={<AdminReferralsPage />} />

          {/* Settings & Permissions */}
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="email-settings" element={<AdminEmailSettingsPage />} />
          <Route path="notification-settings" element={<AdminNotificationSettingsPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="addons" element={<AdminAddonsPage />} />
          <Route path="payment-gateways" element={<AdminPaymentGatewaysPage />} />

          {/* CMS & Themes (Phase 7) */}
          <Route path="themes" element={<AdminThemesPage mode="theme" />} />
          <Route path="theme-dashboard" element={<AdminThemesPage mode="dashboard" />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="menus" element={<AdminMenusPage />} />
          <Route path="content" element={<AdminCmsContentPage />} />
          <Route path="blogs" element={<AdminBlogsPage />} />
          <Route path="authors" element={<AdminBlogAuthorsPage />} />
          <Route path="notices" element={<AdminNoticesPage />} />
          <Route path="system-backup" element={<AdminSystemBackupPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
