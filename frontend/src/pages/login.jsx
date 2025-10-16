import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import FieldHint from '../components/FieldHint';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000') + '/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signin failed');
      // store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-400 to-blue-500">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-6 6m0 0l-6-6m6 6V7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">EcoTrack</h1>
          <p className="text-gray-500 text-sm">Smart Waste Management</p>
        </div>

        <h2 className="text-xl font-semibold text-center mb-6">Welcome Back</h2>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="Enter your email"
                className="w-full pl-10 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
              <FieldHint>Valid email address (e.g., user@example.com)</FieldHint>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="Enter your password"
                className="w-full pl-10 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
              <FieldHint>Use your account password</FieldHint>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="accent-green-500" />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-green-500 hover:underline">Forgot Password?</a>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm mt-4">Don’t have an account?
            <Link to="/signup" className="text-green-500 font-medium hover:underline ml-1">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
