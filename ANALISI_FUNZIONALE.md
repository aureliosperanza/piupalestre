# piùpalestre — Analisi Funzionale

> Documento di analisi funzionale della piattaforma **piùpalestre**: CRM SaaS multi-tenant per la gestione di palestre, dei loro iscritti, abbonamenti, corsi e accessi.
> Versione del documento: giugno 2026.

---

## 1. Scopo e visione del sistema

piùpalestre è una piattaforma **SaaS multi-tenant**: un'unica infrastruttura serve molte palestre ("tenant"), ciascuna con i propri dati completamente isolati. La piattaforma copre tre livelli:

1. **Livello SaaS (Superadmin)** — gestione commerciale della piattaforma: raccolta richieste (lead) dalla landing, attivazione delle palestre clienti, sospensione/riattivazione.
2. **Livello Palestra (Gestore)** — CRM operativo della singola palestra: anagrafiche iscritti, listino abbonamenti, contratti venduti, palinsesto corsi, reception/check-in.
3. **Livello Iscritto (Membro)** — area self-service per l'atleta: auto-registrazione, consultazione della propria posizione (abbonamento, certificato, corsi) e auto-prenotazione ai corsi.

---

## 2. Attori

| Attore | Descrizione | Autenticazione |
| :--- | :--- | :--- |
| **Visitatore** | Utente anonimo sulla landing page; potenziale palestra cliente. | Nessuna |
| **Superadmin** | Amministratore della piattaforma SaaS. | Email + password (account `gyms` con `is_admin = true`) |
| **Gestore palestra** | Operatore/titolare della palestra (tenant). | Email + password (account `gyms`) |
| **Iscritto / Atleta** | Cliente finale della palestra. | Email + **Passkey** / Password (OTP via email per onboarding) |

---

## 3. Architettura tecnica

| Livello | Tecnologia |
| :--- | :--- |
| **Frontend** | React 18 + Vite, React Router 7, Tailwind CSS (tema bordeaux) |
| **Backend** | Node.js + Express 4, Knex (query builder) |
| **Database** | SQLite (sviluppo) / MySQL (produzione) |
| **Sicurezza** | JWT, bcrypt (password palestre/iscritti), WebAuthn (Passkeys per iscritti), OTP via email (onboarding) |
| **File** | Upload certificati medici via Multer, serviti staticamente da `/uploads` |
| **Email** | Nodemailer (SMTP in produzione; in sviluppo il codice OTP è mostrato/loggato) |

### 3.1 Multi-tenancy e isolamento
- Ogni entità operativa porta una colonna **`gym_id`**.
- Il middleware **`authenticateGym`** estrae `gym_id` dal JWT del gestore e **tutte** le query del CRM sono filtrate su quel `gym_id`. Una palestra non può mai vedere i dati di un'altra.
- Le aree pubblica e iscritto sono **scoped per slug** (`/:gym_slug/...`): lo slug identifica il tenant.

### 3.2 Modello di autenticazione (token)
| Token | Emesso da | Contenuto | Durata | Storage |
| :--- | :--- | :--- | :--- | :--- |
| **Gestore/Superadmin** | `/api/auth/login`, `/api/auth/login-by-slug` | `gym_id, email, is_admin, slug` | 24h | `localStorage: gym_token` |
| **Verifica registrazione** | `/api/public/.../verify-otp` | `gym_id, email, purpose: public_registration` | 15 min | in memoria (frontend) |
| **Iscritto (membro)** | `/api/public/.../member-login` | `client_id, gym_id, email, purpose: member` | 7 giorni | `localStorage: member_token` + `member_slug` |

---

## 4. Modello dati

### 4.1 Entità principali

- **gyms** — palestre/tenant (incluso l'account superadmin). Campi chiave: `name, email, password_hash, status (active|suspended), is_admin, slug`.
- **clients** — anagrafiche iscritti. Campi: `first_name, last_name, gender, birth_date, birth_place, province, tax_code, email, phone, password_hash, current_challenge, gym_id`.
- **medical_certificates** — storico certificati medici. Campi: `client_id, gym_id, file_path, status (pending|approved|rejected), rejection_reason`.
- **passkeys** — credenziali biometriche/dispositivo. Campi: `credential_id, client_id, public_key, counter, device_type, backed_up, transports`.
- **plans** — listino prezzi della palestra. Campi: `name, type (time|count), duration_months, max_checkins, price, is_promo, gym_id`.
- **client_memberships** — contratti venduti. Campi: `client_id, plan_id, start_date, end_date, remaining_checkins, status (active|expired|cancelled), assigned_price, paid_amount, payment_status (paid|unpaid|partial)`.
- **classes** — palinsesto corsi ricorrenti. Campi: `name, instructor, max_participants, weekday (0=Lun…6=Dom), time_start, time_end, gym_id`.
- **bookings** — prenotazioni ai corsi. Campi: `client_id, class_id, booking_date, gym_id`.
- **checkins** — log accessi in reception. Campi: `client_id, checkin_time, status (allowed|denied), reason, gym_id`.
- **leads** — richieste commerciali dalla landing. Campi: `name, gym_name, city, phone, email, status (new|contacted|converted|archived)`.
- **email_otps** — codici OTP per la verifica email. Campi: `gym_id, email, code, expires_at, attempts`.

### 4.2 Relazioni (ER testuale)

```
gyms 1───N clients
gyms 1───N plans
gyms 1───N classes
gyms 1───N checkins
gyms 1───N bookings
gyms 1───N email_otps

clients 1───N client_memberships        plans 1───N client_memberships
clients 1───N bookings                  classes 1───N bookings
clients 1───N checkins                  clients 1───N medical_certificates
clients 1───N passkeys

leads  (entità isolata: funnel commerciale SaaS)
```

> **Separazione anagrafica ↔ servizi**: il cliente (`clients`) è separato dai servizi acquistati. Un abbonamento è un record in `client_memberships` che collega un `client` a un `plan` del listino. Questo permette listini flessibili, promo e rinnovi senza toccare l'anagrafica.

### 4.3 Colonne "dormienti" (debito tecnico controllato)
Per evitare ricostruzioni rischiose della tabella su SQLite (FK), alcune colonne legacy sono rimaste ma **non più usate**:
- `clients.membership_type`, `clients.membership_start`, `clients.status` (sostituite da `client_memberships`).
- `clients.medical_certificate_expiry`, `clients.certificate_file_name` (sostituite dalla tabella `medical_certificates`).
- `classes.start_time`, `classes.end_time` (sostituite da `weekday` + `time_start/time_end`).

---

## 5. Mappa delle rotte (frontend)

| URL | Pagina | Attore | Accesso |
| :--- | :--- | :--- | :--- |
| `/` | Landing page | Visitatore | Pubblico |
| `/superadmin` | Console SaaS | Superadmin | Email + password |
| `/:slug` | Area Iscritti (login + dashboard) | Iscritto | Email + OTP |
| `/:slug/registrati` | Auto-registrazione | Iscritto | Email + OTP |
| `/:slug/admin` | CRM palestra | Gestore | Email + password |

---

## 6. Flussi funzionali (step-by-step)

### F1 — Lead generation e attivazione palestra (SaaS)
**Attori:** Visitatore, Superadmin · **Obiettivo:** acquisire una nuova palestra cliente.

1. Il visitatore compila il form di contatto sulla **landing** (`/`).
2. `POST /api/leads` crea un record in **`leads`** con `status = new` (endpoint pubblico).
3. Il Superadmin accede a `/superadmin` (`POST /api/auth/login`, `is_admin = true`).
4. Visualizza i lead (`GET /api/admin/leads`) e ne aggiorna lo stato (`PUT /api/admin/leads/:id`: contacted/converted/archived).
5. Crea la palestra cliente (`POST /api/admin/gyms`): genera l'account `gyms` con password hashata e **slug** derivato dal nome.
6. Può sospendere/riattivare una palestra (`PUT /api/admin/gyms/:id/status`) → blocca il login e tutte le API del tenant.

**Collegamenti:** la palestra creata in F1 abilita F2. Lo `status` della palestra è verificato in **ogni** richiesta autenticata (un tenant sospeso non opera).

---

### F2 — Accesso del Gestore al CRM
**Attori:** Gestore · **Precondizione:** palestra attiva (creata in F1).

1. Il gestore apre `/:slug/admin`. La pagina carica il branding via `GET /api/auth/gyms/slug/:slug`.
2. Inserisce email + password → `POST /api/auth/login-by-slug` (verifica email+slug+password, controlla `status = active`).
3. Riceve il **JWT gestore** (24h), salvato in `localStorage`. Redirect a `/:slug/admin` (CRM).
4. Tutte le chiamate CRM passano da `authenticateGym`, che inietta `gym_id` e blocca palestre sospese.

**Collegamenti:** è il gate d'ingresso a F3–F8. Il logout azzera il token.

---

### F3 — Gestione anagrafica iscritti
**Attori:** Gestore · **Precondizione:** F2.

1. **Lista** (`GET /api/clients`): elenco arricchito con l'**abbonamento attivo** di ciascun cliente (join `client_memberships` + `plans`) e con `membership_status` (active/expired/none). Filtri lato server (ricerca testuale `q`, stato) e lato client (certificato, piano/tipo, in scadenza 7gg, solo promo).
2. **Creazione/Modifica** (`POST` / `PUT /api/clients/:id`): dati anagrafici. Email unica per palestra (`UNIQUE(gym_id, email)`).
   - **Calcolo Codice Fiscale**: il frontend calcola il CF dai dati anagrafici + codice catastale del comune (file `comuni.json`, ~7900 comuni, caricato on-demand).
3. **Certificato Medico**: gestito tramite la nuova tabella `medical_certificates` con flusso di approvazione (`pending`, `approved`, `rejected`). L'upload crea un nuovo record in stato `pending` o `approved` (se inserito dal gestore).
4. **Eliminazione** (`DELETE /api/clients/:id`): rimuove anche il file certificato; le entità collegate vanno in cascade.

**Collegamenti:** l'anagrafica è il prerequisito per F5 (vendita abbonamento), F7 (prenotazioni), F8 (check-in) e F10 (l'iscritto stesso). La colonna "Stato Accesso" sintetizza F5+certificato (può entrare?).

---

### F4 — Gestione listino abbonamenti (plans)
**Attori:** Gestore · **Precondizione:** F2.

1. **Lista listino** (`GET /api/plans`), ordinata per prezzo.
2. **CRUD** (`POST` / `PUT /:id` / `DELETE /:id`): nome, **tipo** (`time` = a tempo con `duration_months`, oppure `count` = a ingressi con `max_checkins`), prezzo, flag **promo**.
3. **Vincolo**: un piano già venduto (referenziato in `client_memberships`) **non è eliminabile** (solo modificabile), per integrità dei contratti.

**Collegamenti:** il listino alimenta F5 (vendita) e il filtro "piano" di F3. I piani `is_promo` sono evidenziati ovunque.

---

### F5 — Vendita / assegnazione abbonamento
**Attori:** Gestore · **Precondizione:** cliente (F3) + piano (F4).

1. Dalla scheda cliente, il gestore apre il modale e cerca un piano (autocomplete su `GET /api/plans`).
2. Sceglie la **data di inizio** e conferma → `POST /api/client-memberships` con `client_id, plan_id, start_date`.
3. Il server **calcola in automatico**:
   - piano `time` → `end_date = start_date + duration_months`;
   - piano `count` → `remaining_checkins = max_checkins`.
   - **Prezzo e Pagamento**: viene copiato il `price` del piano in `assigned_price`. Viene inizializzato il `payment_status`.
4. **Rinnovo**: eventuali abbonamenti `active` precedenti dello stesso cliente vengono posti a `cancelled` (resta un solo attivo).

**Collegamenti:** l'abbonamento attivo è valutato in F7 (prenotazioni) e F8 (check-in), e mostrato in F3 e F10.

---

### F6 — Palinsesto corsi (ricorrente settimanale)
**Attori:** Gestore · **Precondizione:** F2.

1. **Vista calendario** (`GET /api/classes`): griglia oraria settimanale (asse orari × 7 giorni); ogni corso riporta i partecipanti correnti (count su `bookings`).
2. **CRUD corso** (`POST` / `PUT /:id` / `DELETE /:id`): nome, istruttore, **giorno della settimana**, fascia oraria, capienza. Validazioni: giorno valido, orario fine > inizio.
3. **Iscritti al corso** (`GET /api/classes/:id/bookings`): elenco dei prenotati.
4. **Eliminazione** corso → rimuove a cascata le sue prenotazioni (con conferma).

**Collegamenti:** i corsi sono il catalogo prenotabile in F7 e F10. La Dashboard del CRM mostra i "corsi di oggi" filtrando per il giorno corrente.

---

### F7 — Prenotazione corsi (lato Gestore)
**Attori:** Gestore · **Precondizione:** cliente + corso.

1. Nel dettaglio corso, il gestore cerca un cliente (autocomplete) e conferma → `POST /api/classes/bookings`.
2. **Regole di ammissione** (in ordine, allineate al check-in):
   1. **Certificato medico** valido;
   2. **Abbonamento** attivo;
   3. **Capienza** non superata;
   4. nessun **duplicato** (cliente già iscritto al corso).
3. Esito positivo → record in `bookings`; il contatore del corso si aggiorna.

**Collegamenti:** condivide le regole con F10 (stesse precondizioni) e con F8 (le stesse condizioni che bloccano l'ingresso bloccano la prenotazione).

---

### F8 — Check-in in reception
**Attori:** Gestore (desk) · **Precondizione:** cliente.

1. Reception cerca il cliente e registra l'ingresso → `POST /api/checkins`.
2. **Logica di valutazione (priorità):**
   1. **Certificato scaduto** → `denied` · "Certificato Medico Scaduto";
   2. **Nessun abbonamento attivo** → `denied` · "Nessun abbonamento attivo";
   3. piano `time` oltre `end_date` → marca l'abbonamento `expired`, `denied` · "Abbonamento Scaduto";
   4. piano `count` con `remaining_checkins = 0` → marca `expired`, `denied` · "Ingressi Esauriti";
   5. altrimenti → `allowed`; se piano `count`, **decrementa** `remaining_checkins` di 1.
3. Ogni tentativo è loggato in `checkins` (con esito e motivo). `GET /api/checkins` mostra lo storico recente.

**Collegamenti:** è il punto in cui il piano `count` consuma gli ingressi (unico decremento). Gli stessi controlli "a monte" sono replicati in F7/F10 per evitare prenotazioni inutili.

---

### F9 — Auto-registrazione pubblica dell'iscritto (OTP e Setup Credenziali)
**Attori:** Iscritto · **Precondizione:** palestra attiva; link `/:slug/registrati`.

1. **Step email** → `POST /api/public/gyms/:slug/request-otp`: genera un OTP a 6 cifre (validità 10 min, max 5 tentativi), lo invia via email (in dev è mostrato a video).
2. **Step verifica** → `POST .../verify-otp`: consuma il codice e rilascia un **token di verifica** (15 min). Restituisce `exists` e `complete`:
   - **non esiste** → form "Nuova iscrizione" (vuoto);
   - **esiste ma incompleto** (stub senza data di nascita) → "Completa la tua iscrizione" (precompilato);
   - **già iscritto e completo** → schermata "Sei già iscritto" con invito ad accedere all'area (F10).
3. **Step registrazione** → `POST .../register` (richiede il token di verifica): crea/aggiorna il record `clients` (upsert per email) impostando una **Password**. È possibile in questa fase registrare anche una **Passkey** biometrica per gli accessi futuri.

**Regole di sicurezza:** l'esistenza dell'email è rivelata **solo dopo** la verifica OTP (anti-enumerazione); la registrazione è impossibile senza token valido.

**Collegamenti:** popola `clients` (F3 lato gestore) e dà accesso a F10. Certificato e abbonamento restano gestiti dalla palestra.

---

### F10 — Area Iscritto (Login Passkey/Password + self-service)
**Attori:** Iscritto · **Precondizione:** essere registrato (F9 o creato dal gestore).

1. **Login** (`/:slug`): L'utente accede utilizzando **Passkey** (WebAuthn) oppure **Password**. L'OTP via email rimane come fallback o per la procedura di recupero. Esito positivo → **token membro** (7gg).
2. **Dashboard** con sidebar:
   - **Panoramica** — abbonamento (`GET /api/member/me`), certificato, riepilogo corsi;
   - **Palinsesto** — griglia settimanale (`GET /api/member/classes`) con flag "prenotato";
   - **I miei corsi** — prenotazioni (`GET /api/member/bookings`);
   - **Profilo** — anagrafica in sola lettura + aggiornamento telefono (`PUT /api/member/phone`).
3. **Self-booking** — l'iscritto prenota (`POST /api/member/bookings`) o annulla (`DELETE /api/member/bookings/:id`) un corso. Le **regole di ammissione sono identiche a F7** (certificato → abbonamento → capienza → no duplicati).

**Collegamenti:** consuma il catalogo di F6, rispetta gli stati di F5 e i vincoli di F8; le prenotazioni create qui sono visibili anche al gestore (F6/F7).

---

## 7. Regole di business trasversali

| Regola | Dettaglio |
| :--- | :--- |
| **Scadenza certificato** | "scaduto" se la data è nel passato; "in scadenza" se entro 7 giorni; "in attesa" se assente. |
| **Abbonamento `time`** | attivo finché `oggi ≤ end_date`. |
| **Abbonamento `count`** | attivo finché `remaining_checkins > 0`; decrementato solo dal check-in. |
| **Stato Accesso** | un iscritto "può entrare" sse certificato valido **E** abbonamento attivo. |
| **Priorità controlli** | certificato → abbonamento → (capienza) → (duplicati), identica in check-in, prenotazione gestore e self-booking. |
| **Rinnovo** | assegnare un nuovo abbonamento annulla i precedenti attivi. |
| **Isolamento tenant** | ogni dato è filtrato per `gym_id`; lo `status` della palestra è verificato a ogni richiesta. |

---

## 8. Mappa endpoint (backend)

| Gruppo | Endpoint | Auth |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/login`, `/login-by-slug`, `/register`, `GET /api/auth/gyms/slug/:slug` | Pubblico |
| **SaaS/Admin** | `POST /api/leads` (pubblico); `GET/PUT /api/admin/leads`, `GET/POST /api/admin/gyms`, `PUT /api/admin/gyms/:id/status` | Superadmin |
| **Clienti** | `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id` | Gestore |
| **Listino** | `GET/POST /api/plans`, `PUT/DELETE /api/plans/:id` | Gestore |
| **Abbonamenti** | `GET/POST /api/client-memberships` | Gestore |
| **Corsi** | `GET/POST /api/classes`, `PUT/DELETE /api/classes/:id`, `GET /api/classes/:id/bookings`, `POST /api/classes/bookings` | Gestore |
| **Check-in** | `GET/POST /api/checkins` | Gestore |
| **Pubblico (iscritto)** | `GET /api/public/gyms/:slug`, `POST .../request-otp`, `/verify-otp`, `/register`, `/member-login` | Pubblico (OTP) |
| **Area Iscritto** | `GET /api/member/me`, `/bookings`, `/classes`; `POST /api/member/bookings`; `DELETE /api/member/bookings/:id`; `PUT /api/member/phone` | Membro |

---

## 9. Diagramma dei collegamenti tra flussi

```
                 ┌─────────────────────────── SaaS ───────────────────────────┐
   Visitatore ──▶ F1 Lead ──▶ Superadmin crea Palestra ──▶ (status active)
                 └───────────────────────────────┬─────────────────────────────┘
                                                  ▼
                                          F2 Login Gestore (CRM)
        ┌───────────────┬───────────────┬───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
   F3 Clienti      F4 Listino      F6 Palinsesto    F8 Check-in     (Dashboard)
        │               │               │               ▲
        │               ▼               │               │
        └────────▶ F5 Vendita ──────────┼───────────────┘
                    abbonamento          │   (abbonamento + certificato
                         │               │    determinano accesso)
                         ▼               ▼
                  (stato accesso)   F7 Prenotazione (gestore)
                         │               ▲
                         │               │ stesse regole
   Iscritto ──▶ F9 Registrazione (OTP) ──┘
        └──────▶ F10 Area Iscritto (OTP) ──▶ self-booking (= F7) + consulta F5/F6
```

---

## 10. Note, limiti ed evoluzioni

**Punti di forza**
- Isolamento multi-tenant rigoroso e coerente.
- Regole d'accesso unificate (un'unica "verità" applicata a check-in, prenotazione gestore e self-booking).
- Autenticazione moderna con **Passkey** (WebAuthn) e fallback su Password.
- Tracciamento dettagliato dei pagamenti abbonamenti e storico dei certificati medici con approvazione.

**Limiti attuali / debiti**
- `JWT_SECRET` con fallback hardcoded; in produzione va impostato via env.
- Token in `localStorage` (esposizione a XSS).
- Prenotazioni legate allo **slot settimanale**, non alla singola data/occorrenza.
- Invio email OTP richiede configurazione SMTP in produzione.
- Colonne legacy "dormienti" su `clients` e `classes` da rimuovere con una migrazione di pulizia.

**Evoluzioni naturali**
- Occorrenze datate dei corsi + gestione presenze.
- Verifica OTP anche per modifiche sensibili dell'anagrafica.
- Notifiche automatiche (scadenze abbonamento/certificato) via email/WhatsApp.
- Fatturazione ufficiale (SDI/PDF) collegata ai pagamenti registrati.
```
