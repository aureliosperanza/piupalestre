import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, ShieldAlert, X, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

export default function CheckinKiosk() {
  const { isAuthenticated, gym } = useAuth();
  const { gym_slug } = useParams();
  const navigate = useNavigate();

  const [activeCheckin, setActiveCheckin] = useState(null); // { status, reason, name }
  const overlayTimer = useRef(null);
  const scannerRef = useRef(null);

  // Auth Guard
  useEffect(() => {
    if (!isAuthenticated || gym?.slug !== gym_slug) {
      navigate(`/${gym_slug}/admin`);
    }
  }, [isAuthenticated, gym, gym_slug, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize scanner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false
    };

    scannerRef.current = new Html5QrcodeScanner('qr-reader', config, false);

    const onScanSuccess = (decodedText, decodedResult) => {
      // Pause scanner while processing
      scannerRef.current.pause();

      fetch('/api/checkins/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: decodedText })
      })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            setActiveCheckin({
              status: 'denied',
              reason: data.reason || 'Errore sconosciuto',
              name: 'Ingresso Rifiutato'
            });
          } else {
            setActiveCheckin({
              status: data.status,
              reason: data.reason,
              name: `${data.client.first_name} ${data.client.last_name}`
            });
          }
          
          if (overlayTimer.current) clearTimeout(overlayTimer.current);
          overlayTimer.current = setTimeout(() => {
            setActiveCheckin(null);
            scannerRef.current.resume();
          }, 3500);
        })
        .catch(err => {
          setActiveCheckin({ status: 'denied', reason: 'Errore di connessione', name: 'Errore' });
          if (overlayTimer.current) clearTimeout(overlayTimer.current);
          overlayTimer.current = setTimeout(() => {
            setActiveCheckin(null);
            scannerRef.current.resume();
          }, 3500);
        });
    };

    scannerRef.current.render(onScanSuccess, (err) => {
      // Ignore scan errors (happens constantly when no QR is in sight)
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error('Failed to clear scanner', err));
      }
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gymBg flex flex-col items-center justify-center relative p-4">
      {/* Header Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate(`/${gym_slug}/admin`)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-slate-600 hover:text-gymPrimary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Torna al CRM
        </button>
      </div>

      <div className="w-full max-w-lg bg-gymCard rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 text-center border-b border-slate-100 bg-slate-50">
          <img src={logo} alt="piùpalestre" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-1">Check-in Veloce</h1>
          <p className="text-sm text-slate-500 font-medium">Mostra il tuo QR Code alla fotocamera per entrare.</p>
        </div>
        
        <div className="p-8">
          {/* Scanner Container */}
          <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-gymPrimary/30"></div>
        </div>
      </div>

      {/* FULLSCREEN RESPONSE OVERLAY BANNER */}
      {activeCheckin && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-6 transition-all duration-300 ${
          activeCheckin.status === 'allowed' 
            ? 'bg-emerald-500 text-white animate-in fade-in zoom-in duration-200' 
            : 'bg-rose-500 text-white animate-in fade-in zoom-in duration-200'
        }`}>
          <div className="space-y-6 max-w-2xl mx-auto">
            {activeCheckin.status === 'allowed' ? (
              <>
                <div className="h-32 w-32 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-black/15">
                  <CheckCircle className="h-20 w-20" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-6xl sm:text-7xl font-black uppercase tracking-widest text-white drop-shadow-lg">
                    Accesso Consentito
                  </h2>
                  <p className="text-4xl font-bold text-white/90">
                    Benvenuto, {activeCheckin.name}!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-32 w-32 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-black/15">
                  <ShieldAlert className="h-20 w-20" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-6xl sm:text-7xl font-black uppercase tracking-widest text-white drop-shadow-lg">
                    Accesso Negato
                  </h2>
                  <p className="text-4xl font-bold text-white/90">
                    {activeCheckin.name}
                  </p>
                </div>
                <div className="mt-8 text-2xl font-bold bg-black/25 text-rose-100 border border-white/10 px-8 py-5 rounded-3xl inline-block tracking-wide shadow-xl">
                  Motivo: {activeCheckin.reason}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
