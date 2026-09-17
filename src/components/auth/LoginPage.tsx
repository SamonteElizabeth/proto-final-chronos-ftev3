import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsRole } = useApp();

  const [email, setEmail] = useState('sarah.chen@enterprise.corp');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError(null);

    setTimeout(() => {
      const res = login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid email or password.');
        setLoading(false);
      }
    }, 200);
  };

  const handleRoleQuickLogin = (role: Role, defaultEmail: string, defaultPw: string) => {
    setEmail(defaultEmail);
    setPassword(defaultPw);
    setError(null);
    setLoading(true);
    setTimeout(() => {
      loginAsRole(role);
      setLoading(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-6">
          Login
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-xs cursor-pointer mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Quick Role Selection */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                handleRoleQuickLogin(
                  'ADMIN',
                  'sarah.chen@enterprise.corp',
                  'admin123'
                )
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() =>
                handleRoleQuickLogin(
                  'MANAGER',
                  'david.miller@enterprise.corp',
                  'manager123'
                )
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              EEM Admin
            </button>
            <button
              type="button"
              onClick={() =>
                handleRoleQuickLogin(
                  'DEPT_MANAGER',
                  'alex.rodriguez@enterprise.corp',
                  'manager123'
                )
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Dept Manager
            </button>
            <button
              type="button"
              onClick={() =>
                handleRoleQuickLogin(
                  'TASK_USER',
                  'emma.watson@enterprise.corp',
                  'employee123'
                )
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
