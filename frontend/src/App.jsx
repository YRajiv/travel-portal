import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DestinationsPage from './pages/DestinationsPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import PackagesPage from './pages/PackagesPage';
import PackageDetailPage from './pages/PackageDetailPage';
import ServicesPage from './pages/ServicesPage';
import BookingPage from './pages/BookingPage';
import ItineraryManagementPage from './pages/ItineraryManagementPage';
import CustomerDashboard from './pages/CustomerDashboard';
import TravelAgentDashboard from './pages/TravelAgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServiceProviderDashboard from './pages/ServiceProviderDashboard';
import ReportsPage from './pages/ReportsPage';
import CustomerReportsPage from './pages/CustomerReportsPage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to="/customer-dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/login" element={<Layout><LoginPage /></Layout>} />
      <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
      <Route path="/destinations" element={<Layout><DestinationsPage /></Layout>} />
      <Route path="/destinations/:id" element={<Layout><DestinationDetailPage /></Layout>} />
      <Route path="/packages" element={<Layout><PackagesPage /></Layout>} />
      <Route path="/packages/:id" element={<Layout><PackageDetailPage /></Layout>} />
      <Route path="/services" element={<Layout><ServicesPage /></Layout>} />
      <Route path="/booking" element={<ProtectedRoute><Layout><BookingPage /></Layout></ProtectedRoute>} />
      <Route path="/itineraries" element={<ProtectedRoute><Layout><ItineraryManagementPage /></Layout></ProtectedRoute>} />
      <Route path="/booking-history" element={<ProtectedRoute><Layout><BookingHistoryPage /></Layout></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute allowedRoles={['ADMIN', 'TRAVEL_AGENT', 'CUSTOMER']}><Layout><PaymentHistoryPage /></Layout></ProtectedRoute>} />
      <Route path="/customer-reports" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><Layout><CustomerReportsPage /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'TRAVEL_AGENT']}><Layout><ReportsPage /></Layout></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><Layout><CustomerDashboard /></Layout></ProtectedRoute>} />
      <Route path="/travel-agent-dashboard" element={<ProtectedRoute allowedRoles={['TRAVEL_AGENT']}><Layout><TravelAgentDashboard /></Layout></ProtectedRoute>} />
      <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="/service-provider-dashboard" element={<ProtectedRoute allowedRoles={['SERVICE_PROVIDER']}><Layout><ServiceProviderDashboard /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
