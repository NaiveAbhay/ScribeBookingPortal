import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { ToastProvider } from './context/ToastContext'; // <--- NEW IMPORT
import GlobalCallListener from './components/GlobalCallListener'; // <--- NEW IMPORT
import Layout from './components/Layout';

// --- Page Imports ---
import Login from './pages/Login';
import RegisterSelect from './pages/RegisterSelect';
import StudentRegister from './pages/StudentRegister';
import ScribeRegister from './pages/ScribeRegister';
import AcceptRequest from './pages/scribe/AcceptRequest';

// Student Pages
import StudentRequests from './pages/student/StudentRequests';
import CreateRequest from './pages/student/CreateRequest';
import SubmitFeedback from './pages/student/SubmitFeedback';

// Scribe Pages
import ScribeDashboard from './pages/scribe/ScribeDashboard';
import ScribeAvailability from './pages/scribe/ScribeAvailability';

// Shared Pages
import ChatPage from './pages/shared/ChatPage';
import VideoCall from './pages/shared/VideoCall';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Helper component to protect routes
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  
  return <Layout userRole={user.role}>{children}</Layout>;
};

function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        {/* Wrap app in ToastProvider to enable notifications */}
        <ToastProvider>
          {/* Global Listener detects incoming calls anywhere in the app */}
          <GlobalCallListener />

          <Routes>
            {/* --- Public Routes (Now wrapped in Layout) --- */}
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register-select" element={<Layout><RegisterSelect /></Layout>} />
            <Route path="/register/student" element={<Layout><StudentRegister /></Layout>} />
            <Route path="/register/scribe" element={<Layout><ScribeRegister /></Layout>} />
            <Route path="/accept-request" element={<Layout><AcceptRequest /></Layout>} />
            
            {/* --- Protected Student Routes --- */}
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <StudentRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/create-request" 
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <CreateRequest />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/requests" 
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <StudentRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/feedback/:requestId" 
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <SubmitFeedback />
                </ProtectedRoute>
              } 
            />

            {/* --- Protected Scribe Routes --- */}
            <Route 
              path="/scribe/dashboard" 
              element={
                <ProtectedRoute allowedRole="SCRIBE">
                  <ScribeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/scribe/availability" 
              element={
                <ProtectedRoute allowedRole="SCRIBE">
                  <ScribeAvailability />
                </ProtectedRoute>
              } 
            />

            {/* --- Shared Routes --- */}
            <Route path="/chat/:requestId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/video/:requestId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />

            {/* --- Admin Routes --- */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* --- Redirects --- */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;