import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State variables for the inline password reset form
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, currentUser, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      // Friendly messages for common Firebase/Mock errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is badly formatted.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail) {
      setResetError('Please enter your username or email address.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setResetError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetPassword(resetEmail.trim(), newPassword);
      if (response.data && response.data.success) {
        setResetSuccess('Password updated successfully!');
        setEmail(resetEmail.trim());
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowResetForm(false);
          setResetSuccess('');
        }, 2000);
      } else {
        setResetError(response.data?.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to reset password. Please try again.';
      setResetError(errMsg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative background blur blobs */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-text-primary">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to PersonaForge AI to manage your digital workforce
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-secondary/50 p-8 shadow-xl backdrop-blur-xl">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>{error}</div>
            </motion.div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-bg-primary/50 py-3 pl-10 pr-3 text-text-primary placeholder-text-muted transition duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(true);
                    setResetEmail(email);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none"
                >
                  Forgot your password?
                </button>
              </div>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-bg-primary/50 py-3 pl-10 pr-10 text-text-primary placeholder-text-muted transition duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-primary py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition duration-200 hover:bg-primary-hover hover:shadow-primary/35 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          {/* Inline Password Reset Form */}
          {showResetForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-6 border-t border-border pt-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-text-primary">Reset Password</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Enter your username/email and a new password to update it directly.
                </p>
              </div>

              {resetError && (
                <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>{resetError}</div>
                </div>
              )}

              {resetSuccess && (
                <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>{resetSuccess}</div>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-text-secondary">
                    Username / Email Address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="resetEmail"
                      name="resetEmail"
                      type="text"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-bg-primary/50 py-3 pl-10 pr-3 text-text-primary placeholder-text-muted transition duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-bg-primary/50 py-3 pl-10 pr-10 text-text-primary placeholder-text-muted transition duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">
                    Confirm New Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-bg-primary/50 py-3 pl-10 pr-10 text-text-primary placeholder-text-muted transition duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 flex justify-center rounded-xl bg-primary py-3 px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition duration-200 hover:bg-primary-hover hover:shadow-primary/35 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75"
                  >
                    {resetLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="flex-1 flex justify-center rounded-xl border border-border bg-transparent py-3 px-4 text-sm font-bold text-text-secondary transition duration-200 hover:bg-bg-primary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        <p className="text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
            Start free trial
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
