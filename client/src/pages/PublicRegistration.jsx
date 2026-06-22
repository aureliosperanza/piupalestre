import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, User, Phone, Calculator, ArrowRight, CheckCircle, Dumbbell, ArrowLeft, ShieldCheck } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { computeCodiceFiscale, normalize } from '../utils/codiceFiscale';
import { formatDateForInput } from '../utils/dateHelpers';
import logo from '../assets/logo.png';

const UPPERCASE_FIELDS = ['first_name', 'last_name', 'birth_place', 'tax_code', 'province'];

export default function PublicRegistration() {
  const { gym_slug } = useParams();

  const [gymName, setGymName] = useState('');
  const [gymError, setGymError] = useState('');
  const [step, setStep] = useState('email'); // email | otp | form | done
  const [email, setEmail] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [devCode, setDevCode] = useState('');

  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: 'M', birth_date: '',
    tax_code: '', birth_place: '', province: '', phone: '', password: ''
  });

  const [cfError, setCfError] = useState('');
  const [cfLoading, setCfLoading] = useState(false);
  const comuniRef = useRef(null);

  // Verifica la palestra dallo slug
  useEffect(() => {
    fetch(`/api/public/gyms/${gym_slug}`)
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setGymError(d.error || 'Palestra non trovata');
        else setGymName(d.name);
      })
      .catch(() => setGymError('Impossibile contattare il server'));
  }, [gym_slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: UPPERCASE_FIELDS.includes(name) ? value.toUpperCase() : value }));
  };

  // Step 1: richiesta codice OTP all'email
  const handleRequestOtp = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Inserisci la tua email.'); return; }

    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Errore nell\'invio del codice');
        setDevCode(d.devCode || '');
        setOtp('');
        setStep('otp');
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  // Step 2: verifica codice OTP → rilascia token + eventuale precompilazione
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Inserisci il codice ricevuto.'); return; }

    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: otp.trim() })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Codice non valido');
        setToken(d.token);
        setIsExisting(d.exists);
        if (d.exists && d.client) {
          setForm({
            first_name: d.client.first_name || '',
            last_name: d.client.last_name || '',
            gender: d.client.gender || 'M',
            birth_date: formatDateForInput(d.client.birth_date),
            tax_code: d.client.tax_code || '',
            birth_place: d.client.birth_place || '',
            province: d.client.province || '',
            phone: d.client.phone || ''
          });
        }
        // Iscritto già completo → schermata "Sei già iscritto" (solo recapito); altrimenti form
        setStep(d.exists && d.complete ? 'already' : 'form');
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  // Calcolo codice fiscale
  const handleCalcolaCF = async () => {
    setCfError('');
    const { first_name, last_name, birth_date, birth_place, gender, province } = form;
    if (!first_name || !last_name || !birth_date || !birth_place) {
      setCfError('Servono Nome, Cognome, Data e Città di nascita.');
      return;
    }
    try {
      setCfLoading(true);
      if (!comuniRef.current) {
        const mod = await import('../data/comuni.json');
        comuniRef.current = mod.default;
      }
      const target = normalize(birth_place);
      let matches = comuniRef.current.filter((c) => normalize(c.nome) === target);
      if (matches.length === 0) { setCfError('Comune di nascita non trovato.'); return; }
      if (province) {
        const narrowed = matches.filter((c) => c.provincia.toUpperCase() === province.toUpperCase());
        if (narrowed.length) matches = narrowed;
      }
      if (matches.length > 1) { setCfError('Più comuni con questo nome: specifica la Provincia.'); return; }
      const comune = matches[0];
      const cf = computeCodiceFiscale({ first_name, last_name, gender, birth_date, catastale: comune.codice_catastale });
      setForm((prev) => ({ ...prev, tax_code: cf, province: prev.province || comune.provincia }));
    } catch (err) {
      console.error(err);
      setCfError('Impossibile calcolare il codice fiscale.');
    } finally {
      setCfLoading(false);
    }
  };

  // Step 2: invio registrazione
  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (!form.first_name || !form.last_name || !form.phone || !form.password) {
      setError('Nome, Cognome, Telefono e Password sono obbligatori.');
      return;
    }
    if (form.password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }
    setLoading(true);
    fetch(`/api/public/gyms/${gym_slug}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: email.trim(), verificationToken: token })
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Errore nella registrazione');
        setStep('done');
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const inputClass =
    'w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors';
  const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen bg-gymBg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo + palestra */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="piùpalestre" className="h-12 w-auto mb-3" />
          {gymName && <p className="text-sm text-slate-500">Iscrizione a <span className="font-bold text-gymPrimary">{gymName}</span></p>}
        </div>

        <div className="bg-gymCard border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {gymError ? (
            <div className="p-10 text-center">
              <p className="text-rose-600 font-semibold text-sm">{gymError}</p>
              <p className="text-xs text-slate-400 mt-2">Verifica il link ricevuto dalla tua palestra.</p>
            </div>
          ) : step === 'done' ? (
            <div className="p-10 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{isExisting ? 'Dati aggiornati!' : 'Iscrizione completata!'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Grazie {form.first_name}. {isExisting ? 'I tuoi dati sono stati aggiornati' : 'I tuoi dati sono stati inviati'} a {gymName}. Ti aspettiamo in reception!
                </p>
              </div>
            </div>
          ) : step === 'email' ? (
            /* STEP 1: EMAIL */
            <form onSubmit={handleRequestOtp} className="p-6 sm:p-8 space-y-5">
              <div className="text-center">
                <Dumbbell className="h-8 w-8 text-gymPrimary mx-auto mb-2" />
                <h1 className="text-xl font-extrabold text-slate-800">Registrati come iscritto</h1>
                <p className="text-sm text-slate-500 mt-1">Inserisci la tua email: ti invieremo un codice di verifica.</p>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

              <div>
                <label className={labelClass}><Mail size={12} className="inline mr-1" /> Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario.rossi@email.com" className={inputClass} required autoFocus />
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer">
                {loading ? 'Invio...' : <>Invia codice <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          ) : step === 'otp' ? (
            /* STEP 2: VERIFICA OTP */
            <form onSubmit={handleVerifyOtp} className="p-6 sm:p-8 space-y-5">
              <div className="text-center">
                <ShieldCheck className="h-8 w-8 text-gymPrimary mx-auto mb-2" />
                <h1 className="text-xl font-extrabold text-slate-800">Verifica la tua email</h1>
                <p className="text-sm text-slate-500 mt-1">Abbiamo inviato un codice a <span className="font-semibold text-slate-700">{email}</span>.</p>
              </div>

              {devCode && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-center">
                  <strong>Modalità sviluppo:</strong> il codice è <span className="font-mono font-bold">{devCode}</span>
                </div>
              )}

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

              <div>
                <label className={labelClass}>Codice di verifica</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={`${inputClass} text-center text-2xl font-mono tracking-[0.5em]`}
                  autoFocus
                />
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer">
                {loading ? 'Verifica...' : 'Verifica codice'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => { setStep('email'); setError(''); setOtp(''); }} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                  <ArrowLeft className="h-3.5 w-3.5" /> Cambia email
                </button>
                <button type="button" onClick={handleRequestOtp} className="text-gymPrimary hover:text-gymPrimaryHover font-semibold cursor-pointer">
                  Invia di nuovo
                </button>
              </div>
            </form>
          ) : step === 'already' ? (
            /* GIÀ ISCRITTO: stop, nessuna modifica — il cliente deve accedere */
            <div className="p-6 sm:p-8 space-y-5">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-2">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-800">Sei già iscritto!</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Ciao <span className="font-semibold text-slate-700">{form.first_name} {form.last_name}</span>, risulti già iscritto a <span className="font-bold text-gymPrimary">{gymName}</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 text-center">
                Accedi alla tua area personale per vedere abbonamento, corsi e dati. Per modifiche all'anagrafica contatta la reception.
              </div>

              <Link
                to={`/${gym_slug}`}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
              >
                Accedi alla tua area <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            /* STEP 3: FORM ANAGRAFICA */
            <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-5">
              <div>
                <button type="button" onClick={() => { setStep('email'); setError(''); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Cambia email
                </button>
                <h1 className="text-xl font-extrabold text-slate-800">
                  {isExisting ? 'Completa la tua iscrizione' : 'Nuova iscrizione'}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {isExisting ? 'Ti abbiamo trovato! Controlla e completa i tuoi dati.' : 'Compila i tuoi dati anagrafici.'}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{email}</p>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

              {/* Dati anagrafici */}
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-gymPrimary font-bold text-sm">
                <User size={15} /> <h3>Dati Anagrafici</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome *</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Cognome *</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className={inputClass} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sesso</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                    <option value="" disabled>Seleziona</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data di Nascita</label>
                  <input type="date" name="birth_date" value={form.birth_date} onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={labelClass}>Città di Nascita</label>
                  <input type="text" name="birth_place" value={form.birth_place} onChange={handleChange} placeholder="Es: Roma" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Prov.</label>
                  <input type="text" name="province" maxLength={2} value={form.province} onChange={handleChange} placeholder="RM" className={`${inputClass} text-center uppercase`} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Codice Fiscale</label>
                <div className="flex gap-2">
                  <input type="text" name="tax_code" maxLength={16} value={form.tax_code} onChange={handleChange} placeholder="RSSMRA80A01F205X" className={`${inputClass} font-mono uppercase`} />
                  <button type="button" onClick={handleCalcolaCF} disabled={cfLoading} className="shrink-0 flex items-center gap-1 px-4 rounded-xl bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover border border-gymPrimary/20 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">
                    <Calculator size={14} /> {cfLoading ? '...' : 'Calcola'}
                  </button>
                </div>
                {cfError && <p className="text-[10px] text-rose-600 mt-1">{cfError}</p>}
              </div>

              {/* Contatti e Accesso */}
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-gymPrimary font-bold text-sm pt-2">
                <Phone size={15} /> <h3>Contatto e Accesso</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Telefono / WhatsApp *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="3331234567" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Scegli una Password *</label>
                  <PasswordInput name="password" value={form.password} onChange={handleChange} placeholder="••••••••" className={inputClass} required minLength={6} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer">
                {loading ? 'Invio...' : isExisting ? 'Completa Iscrizione' : 'Invia Iscrizione'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">Powered by piùpalestre</p>
      </div>
    </div>
  );
}
