
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CartProvider } from './components/CartContext';
import { MaintenanceGuard } from './components/MaintenanceGuard';

// Lazy load components for performance optimization
const Dashboard = lazy(() => import('./components/Dashboard'));
const Search = lazy(() => import('./components/Search'));
const Assistant = lazy(() => import('./components/Assistant'));
const Notifications = lazy(() => import('./components/Notifications'));
const Profile = lazy(() => import('./components/Profile'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Login = lazy(() => import('./components/Login'));
const StoreDashboard = lazy(() => import('./components/StoreDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Checkout = lazy(() => import('./components/Checkout'));
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const PrescriptionManager = lazy(() => import('./components/PrescriptionManager'));
const MedicationReminders = lazy(() => import('./components/MedicationReminders'));
const FamilyProfiles = lazy(() => import('./components/FamilyProfiles'));
const Chat = lazy(() => import('./components/Chat'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useFirebase();
  
  if (!isAuthReady) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <CartProvider>
          <Router>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <MaintenanceGuard>
                  <Routes>
                    {/* Landing Page */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    
                    {/* App Routes */}
                    <Route path="/app" element={<AuthGuard><Dashboard /></AuthGuard>} />
                    <Route path="/app/search" element={<AuthGuard><Search /></AuthGuard>} />
                    <Route path="/app/assistant" element={<AuthGuard><Assistant /></AuthGuard>} />
                    <Route path="/app/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                    <Route path="/app/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                    <Route path="/app/pharmacy-panel" element={<AuthGuard><StoreDashboard /></AuthGuard>} />
                    <Route path="/app/admin" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
                    <Route path="/app/checkout" element={<AuthGuard><Checkout /></AuthGuard>} />
                    <Route path="/app/product/:id" element={<AuthGuard><ProductDetail /></AuthGuard>} />
                    <Route path="/app/prescriptions" element={<AuthGuard><PrescriptionManager /></AuthGuard>} />
                    <Route path="/app/reminders" element={<AuthGuard><MedicationReminders /></AuthGuard>} />
                    <Route path="/app/family" element={<AuthGuard><FamilyProfiles /></AuthGuard>} />
                    <Route path="/app/chat" element={<AuthGuard><Chat /></AuthGuard>} />
                    <Route path="/app/bookings" element={<AuthGuard><div className="flex flex-col items-center justify-center py-20">
                      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                        <h2 className="text-2xl font-bold text-[#525252]">Em Breve</h2>
                        <p className="text-slate-500 mt-2">O sistema de agendamento online está sendo preparado.</p>
                      </div>
                    </div></AuthGuard>} />
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </MaintenanceGuard>
              </Suspense>
            </Layout>
          </Router>
        </CartProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

export default App;
