import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, ShieldAlert, Upload, FileText, Calculator } from 'lucide-react';
import { formatDateForInput } from '../utils/dateHelpers';
import { computeCodiceFiscale, normalize } from '../utils/codiceFiscale';

export default function ClientModal({ isOpen, onClose, onSubmit, client }) {
  const initialFormState = {
    first_name: '',
    last_name: '',
    gender: 'M',
    birth_date: '',
    tax_code: '',
    birth_place: '',
    province: '',
    email: '',
    phone: '',
    medical_certificate_expiry: '',
    certificate_file: null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Codice fiscale: stato del calcolo + cache lazy dell'elenco comuni
  const [cfError, setCfError] = useState('');
  const [cfLoading, setCfLoading] = useState(false);
  const comuniRef = useRef(null);

  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        gender: client.gender || 'M',
        birth_date: formatDateForInput(client.birth_date),
        tax_code: client.tax_code || '',
        birth_place: client.birth_place || '',
        province: client.province || '',
        email: client.email || '',
        phone: client.phone || '',
        medical_certificate_expiry: formatDateForInput(client.medical_certificate_expiry),
        certificate_file: client.certificate_file_path ? { name: client.certificate_file_path.split('/').pop() } : null
      });
    } else {
      setFormData(initialFormState);
    }
    setError('');
    setCfError('');
  }, [client, isOpen]);

  if (!isOpen) return null;

  // Campi forzati sempre in MAIUSCOLO nello stato
  const UPPERCASE_FIELDS = ['first_name', 'last_name', 'birth_place', 'tax_code', 'province'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = UPPERCASE_FIELDS.includes(name) ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  // Calcola il codice fiscale dai dati anagrafici + comune di nascita (codice catastale)
  const handleCalcolaCF = async () => {
    setCfError('');
    const { first_name, last_name, birth_date, birth_place, gender, province } = formData;

    if (!first_name || !last_name || !birth_date || !birth_place) {
      setCfError('Servono Nome, Cognome, Data e Città di nascita.');
      return;
    }

    try {
      setCfLoading(true);

      // Carica l'elenco comuni solo al primo utilizzo (chunk separato)
      if (!comuniRef.current) {
        const mod = await import('../data/comuni.json');
        comuniRef.current = mod.default;
      }

      const target = normalize(birth_place);
      let matches = comuniRef.current.filter((c) => normalize(c.nome) === target);

      if (matches.length === 0) {
        setCfError('Comune di nascita non trovato in anagrafica.');
        return;
      }

      // Se è indicata la provincia, restringiamo per disambiguare gli omonimi
      if (province) {
        const narrowed = matches.filter((c) => c.provincia.toUpperCase() === province.toUpperCase());
        if (narrowed.length) matches = narrowed;
      }

      if (matches.length > 1) {
        setCfError('Esistono più comuni con questo nome: specifica la Provincia.');
        return;
      }

      const comune = matches[0];
      const cf = computeCodiceFiscale({
        first_name,
        last_name,
        gender,
        birth_date,
        catastale: comune.codice_catastale
      });

      // Imposta il CF e completa la provincia se mancante
      setFormData((prev) => ({ ...prev, tax_code: cf, province: prev.province || comune.provincia }));
    } catch (err) {
      console.error('Errore calcolo CF:', err);
      setCfError('Impossibile calcolare il codice fiscale.');
    } finally {
      setCfLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, certificate_file: file }));
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, certificate_file: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) {
      setError('Nome, Cognome, Email e Telefono sono campi obbligatori.');
      return;
    }
    onSubmit(formData);
  };

  const inputClass =
    'w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors';
  const labelClass =
    'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5';
  const sectionHeaderClass =
    'flex items-center gap-2 pb-2 border-b border-slate-100 text-gymPrimary font-bold text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gymCard border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {client ? 'Modifica Anagrafica Cliente' : 'Registra Nuovo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* SEZIONE I: DATI ANAGRAFICI */}
            <div className="space-y-4">
              <div className={sectionHeaderClass}>
                <User size={16} />
                <h3>Sezione I: Dati Anagrafici</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Es: Mario" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Cognome *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Es: Rossi" className={inputClass} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sesso</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data di Nascita</label>
                  <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={labelClass}>Città di Nascita</label>
                  <input type="text" name="birth_place" value={formData.birth_place} onChange={handleChange} placeholder="Es: Roma" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Provincia</label>
                  <input type="text" name="province" maxLength={2} value={formData.province} onChange={handleChange} placeholder="RM" className={`${inputClass} text-center uppercase`} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Codice Fiscale</label>
                <div className="flex gap-2">
                  <input type="text" name="tax_code" maxLength={16} value={formData.tax_code} onChange={handleChange} placeholder="RSSMRA80A01F205X" className={`${inputClass} font-mono uppercase`} />
                  <button
                    type="button"
                    onClick={handleCalcolaCF}
                    disabled={cfLoading}
                    title="Calcola dal nome, data e città di nascita"
                    className="shrink-0 flex items-center gap-1 px-4 rounded-xl bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover border border-gymPrimary/20 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Calculator size={14} />
                    {cfLoading ? '...' : 'Calcola'}
                  </button>
                </div>
                {cfError && <p className="text-[10px] text-rose-600 mt-1">{cfError}</p>}
              </div>
            </div>

            {/* SEZIONE II: RECAPITI E CONTATTI */}
            <div className="space-y-4 pt-2">
              <div className={sectionHeaderClass}>
                <Phone size={16} />
                <h3>Sezione II: Recapiti e Contatti</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="mario.rossi@email.com" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Telefono / WhatsApp *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="3331234567" className={inputClass} required />
                </div>
              </div>
            </div>

            {/* SEZIONE III: CERTIFICATO MEDICO INTEGRATO */}
            <div className="space-y-4 pt-2">
              <div className={sectionHeaderClass}>
                <ShieldAlert size={16} />
                <h3>Sezione III: Certificato Medico Integrato</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className={labelClass}>Data di Scadenza</label>
                  <input type="date" name="medical_certificate_expiry" value={formData.medical_certificate_expiry} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-gymPrimary rounded-xl py-2.5 px-4 bg-slate-50 text-slate-600 hover:text-gymPrimary transition-all duration-200 text-xs font-semibold cursor-pointer"
                  >
                    <Upload size={14} />
                    {formData.certificate_file ? 'Sostituisci Documento' : 'Carica PDF / Scansione'}
                  </button>
                </div>
              </div>

              {formData.certificate_file && (
                <div className="flex items-center gap-2 p-2.5 bg-gymPrimaryLight rounded-xl border border-gymPrimary/10 text-xs text-slate-700 animate-in fade-in duration-200">
                  <FileText size={16} className="text-gymPrimary" />
                  <span className="font-medium truncate flex-1">{formData.certificate_file.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-slate-400 hover:text-rose-600 font-bold p-1 rounded transition-colors"
                  >
                    Rimuovi
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
              Annulla
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-gymPrimary hover:bg-gymPrimaryHover text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 cursor-pointer">
              {client ? 'Salva Modifiche' : 'Registra Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
