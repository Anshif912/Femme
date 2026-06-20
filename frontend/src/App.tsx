import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { api } from './utils/api';
import { LocationProvider } from './context/LocationContext';
import { AlertTriangle } from 'lucide-react';

// Import Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { JourneySetupPage } from './pages/JourneySetupPage';
import { ActiveJourneyPage } from './pages/ActiveJourneyPage';
import { RouteViewPage } from './pages/RouteViewPage';
import { AnomalyCenterPage } from './pages/AnomalyCenterPage';
import { SOSCenterPage } from './pages/SOSCenterPage';
import { TrustedContactsPage } from './pages/TrustedContactsPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';
import { FIRGeneratorPage } from './pages/FIRGeneratorPage';
import { CommunityReportsPage } from './pages/CommunityReportsPage';
import { SafeZoneMapPage } from './pages/SafeZoneMapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

// Route guards
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const PublicOnlyRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  const [isBackendReachable, setIsBackendReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkReachability = async () => {
      try {
        await api.checkHealth();
        if (isMounted) setIsBackendReachable(true);
      } catch (err) {
        console.error('[App] Startup reachability check failed:', err);
        if (isMounted) setIsBackendReachable(false);
      }
    };

    checkReachability();

    // Recheck periodically every 10s
    const interval = setInterval(checkReachability, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <LocationProvider>
      <Router>
        {isBackendReachable === false && (
          <div className="bg-red-600 text-white text-center py-2 px-4 flex items-center justify-center gap-2 font-bold text-sm z-50 relative">
            <AlertTriangle className="w-4 h-4" />
            <span>Backend unreachable</span>
          </div>
        )}
      <Routes>
        {/* Public Landing */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Route */}
        <Route 
          path="/auth" 
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          } 
        />

        {/* Protected Dashboard Views */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/journey-setup" 
          element={
            <ProtectedRoute>
              <Layout>
                <JourneySetupPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/active-journey" 
          element={
            <ProtectedRoute>
              <Layout>
                <ActiveJourneyPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/route-view" 
          element={
            <ProtectedRoute>
              <Layout>
                <RouteViewPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/track/:journeyId" 
          element={
            <Layout>
              <RouteViewPage />
            </Layout>
          } 
        />
        <Route 
          path="/anomaly-center" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnomalyCenterPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sos" 
          element={
            <ProtectedRoute>
              <Layout>
                <SOSCenterPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute>
              <Layout>
                <TrustedContactsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/evidence" 
          element={
            <ProtectedRoute>
              <Layout>
                <EvidenceVaultPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fir" 
          element={
            <ProtectedRoute>
              <Layout>
                <FIRGeneratorPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cab-reports" 
          element={
            <ProtectedRoute>
              <Layout>
                <CommunityReportsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/safe-zones" 
          element={
            <ProtectedRoute>
              <Layout>
                <SafeZoneMapPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnalyticsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </Router>
    </LocationProvider>
  );
};
export default App;
