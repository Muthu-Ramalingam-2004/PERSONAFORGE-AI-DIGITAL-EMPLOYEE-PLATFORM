// Deprecated: Password reset flow has been moved inline inside Login.jsx.
// This page is no longer used and its route has been removed.
import React from 'react';
import { Navigate } from 'react-router-dom';

const ForgotPassword = () => {
  return <Navigate to="/login" replace />;
};

export default ForgotPassword;
