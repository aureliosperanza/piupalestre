import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gymBg text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-gymPrimary hover:text-gymPrimaryHover font-bold mb-10 transition-colors">
          <ChevronLeft className="h-5 w-5" /> Torna alla Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 mb-8">Cookie Policy</h1>
        
        <div className="prose prose-slate max-w-none text-lg text-slate-600 space-y-6">
          <p>
            Questo sito web utilizza i cookie per migliorare l'esperienza dell'utente. Utilizzando il nostro sito web acconsenti a tutti i cookie in conformità con la nostra Cookie Policy.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">Cosa sono i cookie?</h2>
          <p>
            I cookie sono stringhe di testo di piccole dimensioni che i siti visitati dall'utente inviano al suo terminale (solitamente al browser), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla successiva visita del medesimo utente.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">Tipologie di Cookie utilizzati</h2>
          <p>
            <strong>Cookie Tecnici:</strong> Sono i cookie che servono a effettuare la navigazione o a fornire un servizio richiesto dall'utente. Non vengono utilizzati per scopi ulteriori e sono normalmente installati direttamente dal titolare del sito web. Senza il ricorso a tali cookie, alcune operazioni non potrebbero essere compiute o sarebbero più complesse e/o meno sicure.
          </p>
          <p>
            <strong>Cookie di Terze Parti:</strong> Visitando un sito web si possono ricevere cookie sia dal sito visitato ("proprietari"), sia da siti gestiti da altre organizzazioni ("terze parti"). Un esempio è rappresentato dalla presenza di "social plugin" o di servizi di tracciamento statistico come Google Analytics.
          </p>

          <h2 className="text-2xl font-outfit font-bold text-slate-900 mt-10 mb-4">Gestione dei Cookie</h2>
          <p>
            L'utente può decidere se accettare o meno i cookie utilizzando le impostazioni del proprio browser. La disabilitazione totale o parziale dei cookie tecnici può compromettere l'utilizzo delle funzionalità del sito riservate agli utenti registrati. Al contrario, la fruibilità dei contenuti pubblici è possibile anche disabilitando completamente i cookie.
          </p>

          <p className="mt-8 text-sm opacity-70">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    </div>
  );
}
