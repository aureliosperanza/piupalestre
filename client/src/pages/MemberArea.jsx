import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Dumbbell, CreditCard, CalendarDays, KeyRound, Smartphone, LogOut, CheckCircle, Clock, AlertCircle, X, ChevronRight, Fingerprint, Lock, FileText, Upload, Mail, ArrowRight, ArrowLeft, User, Award, Check, QrCode, ChevronDown, ChevronUp, Settings, ShieldAlert, LayoutDashboard, ClipboardList, Users, Plus, Phone } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { QRCodeSVG } from 'qrcode.react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { formatDate } from '../utils/dateHelpers';
import logo from '../assets/logo.png';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const TOKEN_KEY = 'member_token';
const SLUG_KEY = 'member_slug';

const MEMBER_MENU_GROUPS = [
  {
    label: 'Generale',
    items: [
      { id: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
      { id: 'badge', label: 'Il mio Badge', icon: QrCode },
    ]
  },
  {
    label: 'Palestra',
    items: [
      { id: 'palinsesto', label: 'Palinsesto', icon: CalendarDays },
      { id: 'corsi', label: 'I miei corsi', icon: ClipboardList },
    ]
  },
  {
    label: 'Impostazioni',
    hideOnMobile: true,
    items: [
      { id: 'profilo', label: 'Profilo', icon: User }
    ]
  }
];

export default function MemberArea() {
  const { gym_slug } = useParams();

  const [gymName, setGymName] = useState('');
  const [gymError, setGymError] = useState('');

  // Token valido solo se appartiene alla palestra corrente
  const initialToken = localStorage.getItem(SLUG_KEY) === gym_slug ? localStorage.getItem(TOKEN_KEY) : null;
  const [token, setToken] = useState(initialToken);

  // login: 'email' | 'otp'
  const [loginStep, setLoginStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // dashboard data
  const [me, setMe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [activePage, setActivePage] = useState('panoramica');
  const [openProfileSection, setOpenProfileSection] = useState(null);

  // dati modificabili profilo
  const [profileData, setProfileData] = useState({});
  const [profileMsg, setProfileMsg] = useState(null);
  
  // password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  // passkeys
  const [passkeyMsg, setPasskeyMsg] = useState(null);

  // Palinsesto + self-booking
  const [memberClasses, setMemberClasses] = useState([]);
  const [detailClassId, setDetailClassId] = useState(null);
  const [bookMsg, setBookMsg] = useState(null); // { type, message }
  const [bookLoading, setBookLoading] = useState(false);

  const [qrToken, setQrToken] = useState('');
  const [qrError, setQrError] = useState('');

  const [uploadingCert, setUploadingCert] = useState(false);
  const fileInputRef = useRef(null);

  const memberFetch = useCallback((path, options = {}) => {
    return fetch(`/api/member${path}`, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
    });
  }, [token]);

  // Info palestra (branding)
  useEffect(() => {
    fetch(`/api/public/gyms/${gym_slug}`)
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => { if (!ok) setGymError(d.error || 'Palestra non trovata'); else setGymName(d.name); })
      .catch(() => setGymError('Impossibile contattare il server'));
  }, [gym_slug]);

  // Carica i dati dell'iscritto quando c'è un token
  const loadMember = useCallback(() => {
    setLoading(true);
    Promise.all([
      memberFetch('/me').then((res) => res.json().then((d) => ({ ok: res.ok, d }))),
      memberFetch('/bookings').then((res) => (res.ok ? res.json() : [])),
      memberFetch('/classes').then((res) => (res.ok ? res.json() : []))
    ])
      .then(([meRes, bk, cls]) => {
        if (!meRes.ok) { // token scaduto/non valido
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(SLUG_KEY);
          setToken(null);
          setLoading(false);
          return;
        }
        setMe(meRes.d);
        setProfileData({
          first_name: meRes.d.client.first_name || '',
          last_name: meRes.d.client.last_name || '',
          email: meRes.d.client.email || '',
          gender: meRes.d.client.gender || 'M',
          birth_date: meRes.d.client.birth_date ? meRes.d.client.birth_date.substring(0, 10) : '',
          tax_code: meRes.d.client.tax_code || '',
          birth_place: meRes.d.client.birth_place || '',
          province: meRes.d.client.province || '',
          phone: meRes.d.client.phone || ''
        });
        setBookings(Array.isArray(bk) ? bk : []);
        setMemberClasses(Array.isArray(cls) ? cls : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [memberFetch]);

  // Aggiorna corsi e prenotazioni senza spinner globale (dopo book/cancel)
  const refreshData = useCallback(() => {
    Promise.all([
      memberFetch('/bookings').then((res) => (res.ok ? res.json() : [])),
      memberFetch('/classes').then((res) => (res.ok ? res.json() : []))
    ]).then(([bk, cls]) => {
      setBookings(Array.isArray(bk) ? bk : []);
      setMemberClasses(Array.isArray(cls) ? cls : []);
    }).catch(() => {});
  }, [memberFetch]);

  const handleBook = (classId) => {
    setBookLoading(true);
    setBookMsg(null);
    memberFetch('/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classId }) })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Prenotazione non riuscita');
        setBookMsg({ type: 'success', message: d.message || 'Prenotazione effettuata!' });
        refreshData();
      })
      .catch((err) => setBookMsg({ type: 'error', message: err.message }))
      .finally(() => setBookLoading(false));
  };

  const handleCancel = (bookingId) => {
    setBookLoading(true);
    setBookMsg(null);
    memberFetch(`/bookings/${bookingId}`, { method: 'DELETE' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Annullamento non riuscito');
        setBookMsg({ type: 'success', message: d.message || 'Prenotazione annullata' });
        refreshData();
      })
      .catch((err) => setBookMsg({ type: 'error', message: err.message }))
      .finally(() => setBookLoading(false));
  };

  useEffect(() => {
    if (token) loadMember();
  }, [token, loadMember]);

  // Fetch QR Token every 8 seconds when activePage is 'badge'
  useEffect(() => {
    let intervalId;
    if (activePage === 'badge' && token) {
      const fetchToken = () => {
        memberFetch('/qr-token')
          .then(res => res.json().then(d => ({ ok: res.ok, d })))
          .then(({ ok, d }) => {
            if (ok) {
              setQrToken(d.token);
              setQrError('');
            } else {
              setQrError(d.error || 'Impossibile generare il QR');
            }
          })
          .catch(() => setQrError('Errore di connessione'));
      };
      
      fetchToken(); // run immediately
      intervalId = setInterval(fetchToken, 8000); // refresh every 8s
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activePage, token, memberFetch]);

  const handleUploadCertificate = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCert(true);
    const formData = new FormData();
    formData.append('certificate', file);

    fetch('/api/member/certificate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
      .then(res => res.json().then(d => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (ok) {
          loadMember();
        } else {
          alert(d.error || 'Errore durante il caricamento');
        }
      })
      .catch(() => alert('Errore di rete'))
      .finally(() => {
        setUploadingCert(false);
        e.target.value = '';
      });
  };

  // --- Login ---
  const handleRequestOtp = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Inserisci la tua email.'); return; }
    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/request-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Errore invio codice');
        setDevCode(d.devCode || ''); setOtp(''); setLoginStep('otp'); setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const handleVerifyLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Inserisci il codice ricevuto.'); return; }
    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/member-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code: otp.trim() })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Accesso non riuscito');
        localStorage.setItem(TOKEN_KEY, d.token);
        localStorage.setItem(SLUG_KEY, gym_slug);
        setToken(d.token);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SLUG_KEY);
    setToken(null); setMe(null); setBookings([]); setEmail(''); setPassword(''); setOtp(''); setLoginStep('email');
  };

  const handlePasswordLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Inserisci email e password.'); return; }
    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/member-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Accesso non riuscito');
        localStorage.setItem(TOKEN_KEY, d.token);
        localStorage.setItem(SLUG_KEY, gym_slug);
        setToken(d.token);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setProfileMsg(null);
    memberFetch('/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileData) })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => { 
        if (!ok) throw new Error(d.error || 'Errore'); 
        setProfileMsg({ type: 'success', text: 'Profilo aggiornato con successo!' }); 
        loadMember();
      })
      .catch((err) => setProfileMsg({ type: 'error', text: err.message }));
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Le password non coincidono' });
      return;
    }
    memberFetch('/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword }) })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => { 
        if (!ok) throw new Error(d.error || 'Errore'); 
        setPasswordMsg({ type: 'success', text: 'Password aggiornata!' }); 
        setNewPassword(''); setConfirmPassword('');
      })
      .catch((err) => setPasswordMsg({ type: 'error', text: err.message }));
  };

  const handleRegisterPasskey = async () => {
    setPasskeyMsg(null);
    try {
      const resp = await memberFetch('/webauthn/generate-registration-options');
      const options = await resp.json();
      if (!resp.ok) throw new Error(options.error || 'Errore');

      const attResp = await startRegistration(options);

      const verificationResp = await memberFetch('/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON.success) {
        setPasskeyMsg({ type: 'success', text: 'Passkey registrata con successo!' });
        loadMember();
      } else {
        setPasskeyMsg({ type: 'error', text: verificationJSON.error || 'Errore di verifica' });
      }
    } catch (err) {
      setPasskeyMsg({ type: 'error', text: err.message || 'Errore durante la registrazione. Assicurati che il tuo browser supporti le Passkeys.' });
    }
  };

  const handleContinua = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Inserisci la tua email.'); return; }
    setLoading(true);

    try {
      const resp = await fetch(`/api/public/gyms/${gym_slug}/webauthn/generate-authentication-options?email=${encodeURIComponent(email.trim())}`);
      const options = await resp.json();

      if (resp.ok && options.challenge) {
        try {
          const asseResp = await startAuthentication(options);
          const verificationResp = await fetch(`/api/public/gyms/${gym_slug}/webauthn/verify-authentication`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), response: asseResp }),
          });

          const verificationJSON = await verificationResp.json();
          if (verificationResp.ok && verificationJSON.token) {
            localStorage.setItem(TOKEN_KEY, verificationJSON.token);
            localStorage.setItem(SLUG_KEY, gym_slug);
            setToken(verificationJSON.token);
            setLoading(false);
            return;
          }
        } catch (authErr) {
          console.warn('Passkey annullata o fallita', authErr);
        }
      }
      setLoginStep('password');
    } catch (err) {
      setLoginStep('password');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors';
  const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  // ===== LOGIN VIEW =====
  if (!token) {
    return (
      <div className="min-h-screen bg-gymBg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="piùpalestre" className="h-12 w-auto mb-3" />
            {gymName && <p className="text-sm text-slate-500">Area Iscritti · <span className="font-bold text-gymPrimary">{gymName}</span></p>}
          </div>

          <div className="bg-gymCard border border-slate-200 rounded-2xl shadow-xl">
            {gymError ? (
              <div className="p-10 text-center text-rose-600 font-semibold text-sm">{gymError}</div>
            ) : loginStep === 'email' ? (
              <form onSubmit={handleContinua} className="p-6 sm:p-8 space-y-5">
                <div className="text-center">
                  <User className="h-8 w-8 text-gymPrimary mx-auto mb-2" />
                  <h1 className="text-xl font-extrabold text-slate-800">Accedi alla tua area</h1>
                  <p className="text-sm text-slate-500 mt-1">Inserisci la tua email per continuare.</p>
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}
                <div>
                  <label className={labelClass}><Mail size={12} className="inline mr-1" /> Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario.rossi@email.com" className={inputClass} required autoFocus />
                </div>
                
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-gymPrimary/25">
                  {loading ? 'Attendi...' : <>Continua <ArrowRight className="h-4 w-4" /></>}
                </button>

                <p className="text-center text-xs text-slate-500 mt-4">
                  Non sei ancora iscritto?{' '}
                  <Link to={`/${gym_slug}/registrati`} className="text-gymPrimary font-semibold hover:text-gymPrimaryHover">Registrati</Link>
                </p>
              </form>
            ) : loginStep === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="p-6 sm:p-8 space-y-5">
                <div className="text-center">
                  <div className="h-12 w-12 bg-gymPrimary/10 text-gymPrimary rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6" />
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-800">Bentornato</h1>
                  <p className="text-sm text-slate-500 mt-1 font-medium">{email}</p>
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}
                
                <div>
                  <label className={labelClass}>Password</label>
                  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} required autoFocus />
                </div>
                
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-slate-900/20">
                  {loading ? 'Accesso...' : 'Accedi'}
                </button>

                <div className="mt-4 text-center space-y-3">
                  <button type="button" onClick={handleRequestOtp} disabled={loading} className="text-xs text-gymPrimary hover:text-gymPrimaryHover font-semibold cursor-pointer">
                    Non ricordi la password? Invia codice via email
                  </button>
                  <div className="pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => { setLoginStep('email'); setError(''); setPassword(''); }} className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer">
                      ← Cambia account
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyLogin} className="p-6 sm:p-8 space-y-5">
                <div className="text-center">
                  <ShieldAlert className="h-8 w-8 text-gymPrimary mx-auto mb-2" />
                  <h1 className="text-xl font-extrabold text-slate-800">Inserisci il codice</h1>
                  <p className="text-sm text-slate-500 mt-1">Inviato a <span className="font-semibold text-slate-700">{email}</span></p>
                </div>
                {devCode && <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-center"><strong>Dev:</strong> codice <span className="font-mono font-bold">{devCode}</span></div>}
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}
                <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" className={`${inputClass} text-center text-2xl font-mono tracking-[0.5em]`} autoFocus />
                <button type="submit" disabled={loading} className="w-full px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer">
                  {loading ? 'Accesso...' : 'Accedi'}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setLoginStep('email'); setError(''); setOtp(''); }} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 cursor-pointer"><ArrowLeft className="h-3.5 w-3.5" /> Cambia email</button>
                  <button type="button" onClick={handleRequestOtp} className="text-gymPrimary hover:text-gymPrimaryHover font-semibold cursor-pointer">Invia di nuovo</button>
                </div>
              </form>
            )}
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-4">Powered by piùpalestre</p>
        </div>
      </div>
    );
  }

  // ===== DASHBOARD VIEW =====
  const m = me && me.membership;
  const isCertExpired = me && me.client.medical_certificate_expiry && new Date(me.client.medical_certificate_expiry) < new Date(new Date().setHours(0, 0, 0, 0));
  const isCertExpiringSoon = me && me.client.medical_certificate_expiry && !isCertExpired && (new Date(me.client.medical_certificate_expiry) < new Date(new Date().setDate(new Date().getDate() + 60)));
  const hasActiveMembership = !!(m && m.status === 'active');

  // Griglia oraria del palinsesto
  const todayWeekday = (new Date().getDay() + 6) % 7;
  const toMinutes = (t) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
  let minHour = 9; let maxHour = 21;
  if (memberClasses.length > 0) {
    minHour = Math.min(...memberClasses.map((c) => Math.floor(toMinutes(c.time_start) / 60)));
    maxHour = Math.max(...memberClasses.map((c) => Math.ceil(toMinutes(c.time_end) / 60)));
  }
  const hours = [];
  for (let h = minHour; h < maxHour; h++) hours.push(h);
  const gridCols = { gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' };

  // class_id -> booking_id (per annullare dal palinsesto)
  const bookingByClass = {};
  bookings.forEach((b) => { bookingByClass[b.class_id] = b.booking_id; });

  const detailClass = memberClasses.find((c) => c.id === detailClassId) || null;
  const openCourse = (id) => { setBookMsg(null); setDetailClassId(id); };
  const closeCourse = () => { setBookMsg(null); setDetailClassId(null); };

  return (
    <div className="min-h-screen bg-gymBg text-slate-800 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 bg-gymCard border-b border-slate-200 px-4 py-3 flex items-center justify-between z-30">
        <img src={logo} alt="piùpalestre" className="h-7 w-auto" />
        <div className="flex items-center gap-1">
          <button onClick={() => setActivePage('profilo')} title="Impostazioni" className={`p-2 rounded-lg transition-colors cursor-pointer ${activePage === 'profilo' ? 'text-gymPrimary bg-gymPrimaryLight/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
            <Settings className="h-5 w-5" />
          </button>
          <button onClick={handleLogout} title="Esci" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Sidebar iscritto (Bottom Nav su mobile, Sidebar su desktop) */}
      <aside className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:w-64 md:h-screen bg-gymCard border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none pb-safe">
        <div className="hidden md:flex p-6 border-b border-slate-100 items-center gap-3">
          <img src={logo} alt="piùpalestre" className="h-9 w-auto" />
        </div>
        <nav className="flex-1 flex flex-row md:flex-col justify-around md:justify-start p-2 md:p-4 md:pt-1 md:space-y-4 overflow-x-auto">
          {MEMBER_MENU_GROUPS.map((group, idx) => (
            <div key={idx} className={`${group.hideOnMobile ? 'hidden md:flex' : 'flex'} flex-row md:flex-col justify-around md:justify-start flex-1 md:flex-none`}>
              <h3 className="hidden md:block px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2 first:mt-0">
                {group.label}
              </h3>
              <div className="flex flex-row md:flex-col justify-around md:justify-start flex-1 md:flex-none md:space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 p-2 md:px-4 md:py-2.5 rounded-xl text-[10px] md:text-sm font-medium transition-all duration-200 flex-1 md:flex-none h-14 md:h-auto ${isActive ? 'text-gymPrimary md:bg-gymPrimaryLight md:font-semibold md:translate-x-1' : 'text-slate-500 hover:bg-gymCardHover hover:text-slate-800'}`}
                    >
                      <Icon className={`h-5 w-5 md:h-5 md:w-5 ${isActive && 'text-gymPrimary'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 bg-slate-50 mt-auto">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gymPrimary/20 flex items-center justify-center text-gymPrimary font-bold text-sm shrink-0">
                {me ? `${me.client.first_name[0] || ''}${me.client.last_name[0] || ''}`.toUpperCase() : '··'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{me ? `${me.client.first_name} ${me.client.last_name}` : 'Iscritto'}</p>
                <span className="text-[10px] text-slate-500 block truncate">{gymName}</span>
              </div>
            </div>
            <button onClick={handleLogout} title="Esci" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0">
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Pannello principale */}
      <main className="flex-1 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {loading || !me ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gymPrimary"></div></div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {activePage === 'panoramica' && `Ciao ${me.client.first_name}! 👋`}
                  {activePage === 'badge' && 'Il tuo Badge'}
                  {activePage === 'palinsesto' && 'Palinsesto Corsi'}
                  {activePage === 'corsi' && 'I miei corsi'}
                  {activePage === 'profilo' && 'Il mio profilo'}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  {activePage === 'panoramica' && `Ecco la tua situazione presso ${me.gym.name}.`}
                  {activePage === 'badge' && 'Usa questo QR Code ai tornelli o al tablet della reception per entrare.'}
                  {activePage === 'palinsesto' && 'Tocca un corso per prenotarti o annullare la prenotazione.'}
                  {activePage === 'corsi' && 'I corsi a cui sei prenotato.'}
                  {activePage === 'profilo' && 'I tuoi dati anagrafici e il recapito.'}
                </p>
              </div>

              {/* PANORAMICA */}
              {activePage === 'panoramica' && (
                <div className="space-y-6">
                  {!me.client.has_passkey && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 p-2 rounded-xl shrink-0"><Fingerprint className="h-6 w-6 text-indigo-600" /></div>
                          <div>
                            <h3 className="text-sm font-bold text-indigo-900">Accedi più velocemente</h3>
                            <p className="text-xs text-indigo-700 mt-0.5">Non hai ancora configurato il FaceID/Impronta. Vuoi attivarlo ora per non dover più usare la password al prossimo accesso?</p>
                          </div>
                        </div>
                        <button onClick={handleRegisterPasskey} className="shrink-0 w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">
                          Attiva ora
                        </button>
                      </div>
                      {passkeyMsg && (
                        <div className={`mt-4 p-3 text-xs font-medium rounded-xl flex items-center gap-2 ${passkeyMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {passkeyMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
                          <span className="leading-tight">{passkeyMsg.text}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Abbonamento */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-gymPrimary font-bold text-sm mb-3"><CreditCard size={16} /> Abbonamento</div>
                    {m ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-slate-800">{m.plan_name}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-rose-50 text-rose-700 border-rose-200/50'}`}>
                            {m.status === 'active' ? 'Attivo' : 'Scaduto'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {m.type === 'time'
                            ? <>Scadenza: <span className="font-mono font-semibold">{formatDate(m.end_date)}</span></>
                            : <>Ingressi residui: <span className="font-mono font-semibold">{m.remaining_checkins}</span></>}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nessun abbonamento attivo. Passa in reception.</p>
                    )}
                  </div>

                  {/* Certificato */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-gymPrimary font-bold text-sm mb-3"><ShieldAlert size={16} /> Certificato Medico</div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" capture="environment" onChange={handleUploadCertificate} />
                    
                    {me.client.pending_certificate ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs text-amber-800 font-medium">⏳ Il tuo nuovo certificato è in fase di revisione da parte della segreteria.</p>
                      </div>
                    ) : (
                      <>
                        {me.client.rejected_certificate && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl mb-3">
                            <p className="text-xs text-rose-800 font-medium mb-2">❌ Certificato rifiutato: {me.client.rejected_certificate}</p>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCert} className="w-full px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                              {uploadingCert ? 'Caricamento...' : 'Ricarica documento'}
                            </button>
                          </div>
                        )}
                        
                        {me.client.medical_certificate_expiry ? (
                          <div className="space-y-3">
                            <p className="text-sm">
                              Scadenza: <span className="font-mono font-semibold">{formatDate(me.client.medical_certificate_expiry)}</span>
                              {isCertExpired && <span className="ml-2 text-rose-600 font-bold text-xs">⚠ Scaduto</span>}
                            </p>
                            
                            {!me.client.rejected_certificate && isCertExpiringSoon && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-xs text-amber-800 font-medium mb-2">Il tuo certificato scadrà entro 60 giorni. Rinnovalo per tempo.</p>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCert} className="w-full px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                                  {uploadingCert ? 'Caricamento...' : 'Carica nuovo certificato'}
                                </button>
                              </div>
                            )}
                            {!me.client.rejected_certificate && isCertExpired && (
                              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCert} className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                                {uploadingCert ? 'Caricamento...' : 'Carica nuovo certificato'}
                              </button>
                            )}
                          </div>
                        ) : (
                          !me.client.rejected_certificate && (
                            <div className="space-y-3">
                              <p className="text-sm text-slate-400 italic">Nessun certificato registrato.</p>
                              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCert} className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                                {uploadingCert ? 'Caricamento...' : 'Scansiona certificato'}
                              </button>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>

                  {/* Riepilogo corsi */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-5 shadow-sm md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gymPrimary font-bold text-sm"><CalendarDays size={16} /> I tuoi corsi</div>
                      {bookings.length > 0 && (
                        <button onClick={() => setActivePage('corsi')} className="text-xs text-gymPrimary hover:text-gymPrimaryHover font-bold cursor-pointer">Vedi tutti</button>
                      )}
                    </div>
                    {bookings.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Non sei iscritto a nessun corso.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {bookings.slice(0, 3).map((b) => (
                          <div key={b.booking_id} className="py-2.5 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800">{b.name}</p>
                            <span className="text-xs font-mono text-slate-600 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />{DAYS[b.weekday]} {b.time_start}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* BADGE */}
              {activePage === 'badge' && (
                <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="h-16 w-16 bg-gymPrimary/10 rounded-full flex items-center justify-center text-gymPrimary mb-6">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Ingresso Palestra</h2>
                  <p className="text-sm text-slate-500 text-center mb-8">
                    Avvicina lo schermo al lettore ottico o mostralo in reception. Il codice cambia automaticamente per la tua sicurezza.
                  </p>
                  
                  {qrError ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl text-center w-full">
                      {qrError}
                    </div>
                  ) : !qrToken ? (
                    <div className="animate-pulse h-[220px] w-[220px] bg-slate-100 rounded-xl"></div>
                  ) : (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                      <QRCodeSVG value={qrToken} size={220} level="H" />
                    </div>
                  )}
                  
                  {qrToken && hasActiveMembership && !isCertExpired && (
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Codice attivo e protetto
                    </div>
                  )}
                  {qrToken && !hasActiveMembership && (
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Abbonamento non attivo
                    </div>
                  )}
                  {qrToken && hasActiveMembership && isCertExpired && (
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Certificato medico scaduto
                    </div>
                  )}
                </div>
              )}

              {/* PALINSESTO */}
              {activePage === 'palinsesto' && (
                <>
                  {!hasActiveMembership && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                      Per prenotare un corso ti serve un abbonamento attivo. Passa in reception per attivarne uno.
                    </div>
                  )}
                  {isCertExpired && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                      Il tuo certificato medico è scaduto: rinnovalo per poterti prenotare ai corsi.
                    </div>
                  )}
                  {memberClasses.length === 0 ? (
                    <div className="bg-gymCard border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                      <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Nessun corso in programma al momento.</p>
                    </div>
                  ) : (
                    <div className="bg-gymCard border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <div className="min-w-[680px]">
                          {/* Header giorni */}
                          <div className="grid border-b border-slate-200" style={gridCols}>
                            <div className="border-r border-slate-100"></div>
                            {SHORT_DAYS.map((d, i) => (
                              <div key={i} className={`px-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-100 last:border-r-0 ${i === todayWeekday ? 'bg-gymPrimaryLight/50 text-gymPrimary' : 'text-slate-600'}`}>{d}</div>
                            ))}
                          </div>
                          {/* Righe orarie */}
                          {hours.map((h) => (
                            <div key={h} className="grid border-b border-slate-100 last:border-b-0" style={gridCols}>
                              <div className="border-r border-slate-100 px-1 py-1.5 text-right"><span className="text-[10px] font-mono font-semibold text-slate-400">{String(h).padStart(2, '0')}:00</span></div>
                              {SHORT_DAYS.map((_, day) => {
                                const cell = memberClasses.filter((c) => c.weekday === day && Math.floor(toMinutes(c.time_start) / 60) === h);
                                return (
                                  <div key={day} className={`border-r border-slate-100 last:border-r-0 p-1 min-h-[56px] space-y-1 ${day === todayWeekday ? 'bg-gymPrimaryLight/20' : ''}`}>
                                    {cell.map((c) => {
                                      const full = c.current_participants >= c.max_participants;
                                      return (
                                        <button
                                          key={c.id}
                                          onClick={() => openCourse(c.id)}
                                          className={`w-full text-left rounded-lg border p-1.5 bg-white hover:shadow-md transition-all ${c.booked ? 'border-emerald-300 ring-1 ring-emerald-200' : full ? 'border-rose-200' : 'border-slate-200 hover:border-gymPrimary/40'}`}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-mono text-[10px] font-bold text-gymPrimary">{c.time_start}</span>
                                            {c.booked
                                              ? <Check className="h-3 w-3 text-emerald-600" />
                                              : <span className={`text-[9px] font-bold ${full ? 'text-rose-600' : 'text-slate-400'}`}>{c.current_participants}/{c.max_participants}</span>}
                                          </div>
                                          <div className="text-[11px] font-bold text-slate-800 truncate leading-tight mt-0.5">{c.name}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* I MIEI CORSI */}
              {activePage === 'corsi' && (
                <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-4 text-center">Non sei iscritto a nessun corso. Chiedi in reception per prenotarti.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {bookings.map((b) => (
                        <div key={b.booking_id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{b.name}</p>
                            <p className="text-xs text-slate-400">{b.instructor || 'N/D'}</p>
                          </div>
                          <span className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {DAYS[b.weekday]} {b.time_start}–{b.time_end}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PROFILO */}
              {activePage === 'profilo' && (
                <div className="space-y-4">
                  {/* Anagrafica (modificabile) */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden transition-all">
                    <button onClick={() => setOpenProfileSection(openProfileSection === 'anagrafica' ? null : 'anagrafica')} className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left">
                      <div className="flex items-center gap-3 text-gymPrimary font-bold text-base"><User size={20} /> Dati Anagrafici</div>
                      <div className="text-slate-400">
                        {openProfileSection === 'anagrafica' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>
                    {openProfileSection === 'anagrafica' && (
                      <div className="p-6 pt-0 border-t border-slate-100">
                        <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Nome</label>
                              <input type="text" value={profileData.first_name || ''} onChange={e => setProfileData({...profileData, first_name: e.target.value})} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Cognome</label>
                              <input type="text" value={profileData.last_name || ''} onChange={e => setProfileData({...profileData, last_name: e.target.value})} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Email</label>
                              <input type="email" value={profileData.email || ''} onChange={e => setProfileData({...profileData, email: e.target.value})} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Telefono</label>
                              <input type="tel" value={profileData.phone || ''} onChange={e => setProfileData({...profileData, phone: e.target.value})} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Data di Nascita</label>
                              <input type="date" value={profileData.birth_date || ''} onChange={e => setProfileData({...profileData, birth_date: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Sesso</label>
                              <select value={profileData.gender || 'M'} onChange={e => setProfileData({...profileData, gender: e.target.value})} className={inputClass}>
                                <option value="" disabled>Seleziona</option>
                                <option value="M">M</option>
                                <option value="F">F</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Codice Fiscale</label>
                              <input type="text" value={profileData.tax_code || ''} onChange={e => setProfileData({...profileData, tax_code: e.target.value})} className={`${inputClass} uppercase`} maxLength={16} />
                            </div>
                            <div>
                              <label className={labelClass}>Città di Nascita</label>
                              <input type="text" value={profileData.birth_place || ''} onChange={e => setProfileData({...profileData, birth_place: e.target.value})} className={inputClass} />
                            </div>
                          </div>
                          
                          {profileMsg && (
                            <div className={`p-3 text-xs font-medium rounded-xl flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {profileMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                              {profileMsg.text}
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button type="submit" className="px-6 py-2.5 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-colors cursor-pointer">
                              Salva Modifiche
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Modifica Password */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden transition-all">
                    <button onClick={() => setOpenProfileSection(openProfileSection === 'password' ? null : 'password')} className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left">
                      <div className="flex items-center gap-3 text-gymPrimary font-bold text-base"><ShieldAlert size={20} /> Modifica Password</div>
                      <div className="text-slate-400">
                        {openProfileSection === 'password' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>
                    {openProfileSection === 'password' && (
                      <div className="p-6 pt-0 border-t border-slate-100">
                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm mt-4">
                          <div>
                            <label className={labelClass}>Nuova Password</label>
                            <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} minLength={6} placeholder="Minimo 6 caratteri" required />
                          </div>
                          <div>
                            <label className={labelClass}>Conferma Password</label>
                            <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                          </div>

                          {passwordMsg && (
                            <div className={`p-3 text-xs font-medium rounded-xl flex items-center gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {passwordMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                              {passwordMsg.text}
                            </div>
                          )}

                          <div className="pt-2">
                            <button type="submit" className="w-full px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer">
                              Aggiorna Password
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Passkeys */}
                  <div className="bg-gymCard border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden transition-all">
                    <button onClick={() => setOpenProfileSection(openProfileSection === 'passkey' ? null : 'passkey')} className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left">
                      <div className="flex items-center gap-3 text-gymPrimary font-bold text-base"><Fingerprint size={20} /> Accesso Biometrico (Passkeys)</div>
                      <div className="text-slate-400">
                        {openProfileSection === 'passkey' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>
                    {openProfileSection === 'passkey' && (
                      <div className="p-6 pt-0 border-t border-slate-100 mt-4">
                        <p className="text-xs text-slate-500 mb-4 max-w-lg">
                          Registra questo dispositivo per accedere più velocemente la prossima volta utilizzando FaceID, TouchID o Windows Hello.
                        </p>
                        <button onClick={handleRegisterPasskey} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer">
                          Registra questo dispositivo
                        </button>
                        {passkeyMsg && (
                          <div className={`mt-4 p-3 text-xs font-medium rounded-xl flex items-center gap-2 max-w-sm ${passkeyMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {passkeyMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
                            <span className="leading-tight">{passkeyMsg.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modale dettaglio corso (prenota / annulla) */}
      {detailClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-gymCard border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{detailClass.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CalendarDays size={13} /> {DAYS[detailClass.weekday]}</span>
                  <span className="flex items-center gap-1 font-mono"><Clock size={13} /> {detailClass.time_start}–{detailClass.time_end}</span>
                </div>
              </div>
              <button onClick={closeCourse} className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium"><Award className="h-3.5 w-3.5 text-gymPrimary" /> Istruttore: {detailClass.instructor || 'N/D'}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium"><Users className="h-3.5 w-3.5 text-gymPrimary" /> Posti: {detailClass.current_participants}/{detailClass.max_participants}</p>

              {detailClass.booked && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Sei prenotato a questo corso
                </div>
              )}

              {bookMsg && (
                <div className={`p-2.5 rounded-xl text-xs font-medium flex items-start gap-1.5 border ${bookMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-rose-50 text-rose-700 border-rose-200/50'}`}>
                  {bookMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
                  {bookMsg.message}
                </div>
              )}

              {/* Azione */}
              {detailClass.booked ? (
                <button
                  onClick={() => handleCancel(bookingByClass[detailClass.id])}
                  disabled={bookLoading}
                  className="w-full px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {bookLoading ? '...' : 'Annulla prenotazione'}
                </button>
              ) : detailClass.current_participants >= detailClass.max_participants ? (
                <button disabled className="w-full px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold cursor-not-allowed">Corso completo</button>
              ) : (
                <button
                  onClick={() => handleBook(detailClass.id)}
                  disabled={bookLoading || !hasActiveMembership || isCertExpired}
                  className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gymPrimary hover:bg-gymPrimaryHover text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" /> {bookLoading ? 'Prenotazione...' : 'Prenotati'}
                </button>
              )}
              {!detailClass.booked && isCertExpired && (
                <p className="text-[11px] text-rose-600 text-center">Certificato medico scaduto: rinnovalo per prenotare.</p>
              )}
              {!detailClass.booked && !isCertExpired && !hasActiveMembership && (
                <p className="text-[11px] text-amber-600 text-center">Ti serve un abbonamento attivo per prenotare.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
