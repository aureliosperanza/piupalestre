import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gymBg text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-gymPrimary hover:text-gymPrimaryHover font-bold mb-10 transition-colors">
          <ChevronLeft className="h-5 w-5" /> Torna alla Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none text-lg text-slate-600 space-y-6">
          <p>
            Ai sensi del Regolamento (UE) 2016/679 (di seguito "Regolamento"), questa pagina descrive le modalità di trattamento dei dati personali degli utenti che consultano i siti web di PiùPalestre.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">1. Titolare del Trattamento</h2>
          <p>
            Il Titolare del trattamento è PiùPalestre, con sede in Puglia (IT), P.IVA 04572840710.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">2. Tipologia di Dati Trattati</h2>
          <p>
            <strong>Dati di navigazione:</strong> I sistemi informatici e le procedure software preposte al funzionamento di questo sito acquisiscono, nel corso del loro normale esercizio, alcuni dati personali la cui trasmissione è implicita nell'uso dei protocolli di comunicazione di Internet.
          </p>
          <p>
            <strong>Dati forniti volontariamente dall'utente:</strong> L'invio facoltativo, esplicito e volontario di messaggi agli indirizzi di contatto, nonché la compilazione e l'inoltro dei moduli presenti sul sito, comportano l'acquisizione dei dati di contatto del mittente, necessari a rispondere, nonché di tutti i dati personali inclusi nelle comunicazioni.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">3. Finalità del Trattamento</h2>
          <p>
            I dati personali forniti dagli utenti sono utilizzati al solo fine di eseguire il servizio o la prestazione richiesta e sono comunicati a terzi nel solo caso in cui ciò sia a tal fine necessario.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">4. Diritti degli Interessati</h2>
          <p>
            Gli interessati hanno il diritto di ottenere dal Titolare, nei casi previsti, l'accesso ai propri dati personali e la rettifica o la cancellazione degli stessi o la limitazione del trattamento che li riguarda o di opporsi al trattamento (artt. 15 e ss. del Regolamento).
          </p>
          <p className="mt-8 text-sm opacity-70">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    </div>
  );
}
