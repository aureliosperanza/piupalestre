import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Login({ isSuperadminLogin = false }) {
  const { login } = useAuth();
  const { gym_slug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  // Fetch gym branding dynamically by slug if in a tenant URL path
  useEffect(() => {
    if (gym_slug) {
      setError(null);
      fetch(`/api/auth/gyms/slug/${gym_slug}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Palestra non registrata o link non valido');
          }
          return res.json();
        })
        .then((data) => {
          if (data.status === 'suspended') {
            setError("L'account di questa palestra è sospeso. Contatta l'amministratore SaaS.");
          } else {
            setGymName(data.name);
          }
        })
        .catch((err) => {
          setError(err.message);
        });
    }
  }, [gym_slug]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Inserisci sia l\'email che la password.');
      return;
    }

    setLoading(true);
    setError(null);

    const url = gym_slug ? '/api/auth/login-by-slug' : '/api/auth/login';
    const bodyPayload = gym_slug ? { email, password, slug: gym_slug } : { email, password };

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Credenziali non valide');
        }
        return data;
      })
      .then((data) => {
        setLoading(false);

        // Block non-admin accounts on the superadmin login route
        if (!gym_slug && !data.gym.is_admin) {
          throw new Error('Accesso riservato agli amministratori di sistema. Le palestre accedono dal proprio link dedicato.');
        }

        // Login to AuthContext
        login(data.token, data.gym);

        // Redirect appropriately
        if (data.gym.is_admin) {
          navigate('/superadmin');
        } else {
          navigate(`/${data.gym.slug}/admin`);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-gymBg flex items-center justify-center p-4 selection:bg-gymPrimary/30 selection:text-gymPrimary select-none">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-gymPrimary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-gymAccent/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-gymCard text-slate-800 border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300">
        


        {/* Brand Logo header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center">
            <img src={logo} alt="PiùPalestre" className="h-12 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 font-sans">
              {gym_slug && gymName ? `Area Gestore · ${gymName}` : isSuperadminLogin ? 'Console Superadmin' : 'Accedi a piùpalestre'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {gym_slug && gymName
                ? 'Accesso riservato al gestore: inserisci email e password del CRM.'
                : isSuperadminLogin
                ? 'Inserisci le credenziali di amministratore di sistema SaaS.'
                : 'Inserisci le credenziali della tua palestra per accedere al CRM.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-medium animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Indirizzo Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                placeholder="palestra@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl pl-11 pr-11 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-gymPrimary hover:bg-gymPrimaryHover disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Accedi al CRM'
            )}
          </button>
        </form>


        {/* Demo Credentials Alert Helper */}
        <div className="mt-8 pt-6 border-t border-slate-150 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credenziali Demo Seed</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div>
              <p className="font-semibold text-slate-700">Iron Gym (slug: iron-gym)</p>
              <p className="font-mono mt-0.5">iron@gym.com</p>
              <p className="font-mono text-[9px] text-slate-400">pass: password123</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Super Admin (SaaS)</p>
              <p className="font-mono mt-0.5">admin@piupalestre.it</p>
              <p className="font-mono text-[9px] text-slate-400">pass: password123</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
