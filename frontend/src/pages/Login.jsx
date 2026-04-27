import { useState } from 'react';
import { auth } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [mode, setMode] = useState('login'); 
  const [form, setForm] = useState({
    email: '', password: '', companyName: '', industry: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        const { data } = await auth.register(form);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        nav('/dashboard');
      } else {
        const { data } = await auth.login({ email: form.email, password: form.password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        nav('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />

      <div className="glass-card w-full max-w-md p-10 rounded-[2.5rem] relative z-10 transition-all duration-500 hover:shadow-indigo-500/10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 animate-float">
            <span className="text-3xl font-bold text-white">N</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
            {mode === 'login' ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {mode === 'login' 
              ? 'Enter your credentials to access the NeuroHire dashboard.' 
              : 'Join the next generation of AI-enabled recruitment.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Company</label>
                <input
                  className="input-premium"
                  placeholder="e.g. Acme Tech"
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Industry</label>
                <input
                  className="input-premium"
                  placeholder="e.g. Software"
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Email Address</label>
            <input
              className="input-premium"
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Password</label>
            <input
              className="input-premium"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button 
            className="premium-btn w-full py-4 rounded-2xl text-white font-bold text-sm mt-4 shadow-lg shadow-indigo-500/20 group" 
            disabled={loading}
          >
            <span className={loading ? 'opacity-0' : 'opacity-100'}>
              {mode === 'login' ? 'Sign In to Workspace' : 'Create Admin Account'}
            </span>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm">
            {mode === 'login' ? "New to NeuroHire?" : "Already have an account?"}
            <button 
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} 
              className="ml-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
