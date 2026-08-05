import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { EmployeeProvider } from './context/EmployeeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Chat from './pages/Chat';
import Workflows from './pages/Workflows';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import KnowledgeBase from './pages/KnowledgeBase';
import PromptManager from './pages/PromptManager';
import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <EmployeeProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Subroutes wrapped in Dashboard Layout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/knowledge-base/:employeeId" element={<KnowledgeBase />} />
                  <Route path="/prompt-manager" element={<PromptManager />} />
                  <Route path="/prompt-manager/:employeeId" element={<PromptManager />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </EmployeeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
