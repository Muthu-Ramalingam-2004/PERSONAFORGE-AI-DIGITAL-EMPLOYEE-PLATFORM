import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          {/* Custom premium animated pulse spinner */}
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute h-full w-full animate-ping rounded-full bg-primary/20 opacity-75"></div>
            <div className="absolute h-12 w-12 animate-pulse rounded-full bg-primary/40"></div>
            <div className="h-8 w-8 rounded-full bg-primary shadow-lg shadow-primary/50"></div>
          </div>
          <p className="animate-pulse text-sm font-medium text-text-secondary">
            Securing Connection...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
