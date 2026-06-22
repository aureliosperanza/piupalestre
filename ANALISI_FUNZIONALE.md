# piùpalestre — Analisi Funzionale

> Documento di analisi funzionale della piattaforma **piùpalestre**: CRM SaaS multi-tenant per la gestione di palestre, dei loro iscritti, abbonamenti, corsi e accessi.
> Versione del documento: giugno 2026.

---

## 1. Scopo e visione del sistema

piùpalestre è una piattaforma **SaaS multi-tenant**: un'unica infrastruttura serve molte palestre ("tenant"), ciascuna con i propri dati completamente isolati. La piattaforma copre tre livelli:

1. **Livello SaaS (Superadmin)** — gestione commerciale della piattaforma: raccolta richieste (lead), attivazione palestre clienti, sospensione/riattivazione e *impersonificazione* per finalità di assistenza.
2. **Livello Palestra (Gestore e Staff)** — CRM operativo della singola palestra: anagrafiche, listino abbonamenti, vendite, palinsesto corsi, reception/check-in, approvazione certificati medici e gestione dei ruoli dello staff.
3. **Livello Iscritto (Membro)** — area self-service per l'atleta: auto-registrazione, consultazione abbonamento, caricamento certificati e auto-prenotazione ai corsi.

---

## 2. Attori

| Attore | Descrizione | Autenticazione |
| :--- | :--- | :--- |
| **Visitatore** | Utente anonimo sulla landing page. | Nessuna |
| **Superadmin** | Amministratore piattaforma SaaS. Può *impersonificare* le palestre. | Email + password (account `gyms` con `is_admin = true`) |
| **Gestore (Owner)** | Titolare della palestra (tenant). Ha permessi illimitati. | Email + password (account `gyms`) |
| **Staff Palestra** | Dipendenti (Admin, Reception, Trainer) con permessi granulari. | Email + password (account `staff_members`) |
| **Iscritto / Atleta** | Cliente finale della palestra. | Email + **Passkey** / Password (OTP via email per onboarding) |

---

## 3. Architettura tecnica

| Livello | Tecnologia |
| :--- | :--- |
| **Frontend** | React 18 + Vite, React Router 7, Tailwind CSS (Design mobile-first/responsive) |
| **Backend** | Node.js + Express 4, Knex (query builder) |
| **Database** | SQLite (sviluppo) / MySQL (produzione) |
| **Sicurezza** | JWT, bcrypt, WebAuthn (Passkeys), OTP via email |
| **Storage** | Integrazione con **Cloudinary** per upload certificati e ricevute |
| **Email** | Nodemailer (SMTP per invio codice OTP e notifiche) |

### 3.1 Multi-tenancy e isolamento
- Ogni entità operativa porta una colonna **`gym_id`**.
- Il middleware **`authenticateGym`** estrae `gym_id` dal JWT (del gestore o dello staff) e **tutte** le query sono filtrate. Una palestra non può mai vedere i dati di un'altra.
- Le aree pubblica e iscritto sono **scoped per slug** (`/:slug/...`).
- **Impersonificazione:** Il Superadmin può generare un token temporaneo per accedere come una specifica palestra saltando la login, senza conoscere la password del cliente, utile per assistenza tecnica.

### 3.2 Modello di autenticazione (token)
| Token | Emesso da | Contenuto | Durata | Storage |
| :--- | :--- | :--- | :--- | :--- |
| **Gestore/Staff/Superadmin** | `/api/auth/login`, `/api/auth/login-by-slug`, `/api/admin/impersonate/:id` | `gym_id, email, is_admin, slug, role` | 24h | `localStorage: gym_token` |
| **Verifica registrazione** | `/api/public/.../verify-otp` | `gym_id, email, purpose: public_registration` | 15 min | in memoria (frontend) |
| **Iscritto (membro)** | `/api/public/.../member-login` | `client_id, gym_id, email, purpose: member` | 7 giorni | `localStorage: member_token` + `member_slug` |

---

## 4. Modello dati

### 4.1 Entità principali

- **gyms** — palestre/tenant. Campi chiave: `name, email, password_hash, status (active|suspended), is_admin, slug`.
- **staff_members** — collaboratori. Campi: `gym_id, first_name, last_name, email, password_hash, role (admin|reception|trainer), status`.
- **clients** — anagrafiche iscritti. Campi: `first_name, last_name, gender, birth_date, birth_place, province, tax_code, email, phone, password_hash, current_challenge, gym_id`.
- **medical_certificates** — certificati medici. Campi: `client_id, gym_id, file_url, public_id, status (pending|approved|rejected), expiry_date`.
- **passkeys** — credenziali biometriche. Campi: `credential_id, client_id, public_key...`.
- **plans** — listino prezzi. Campi: `name, type (time|count), duration_months, max_checkins, price, is_promo, gym_id`.
- **client_memberships** — contratti venduti. Campi: `client_id, plan_id, start_date, end_date, remaining_checkins, status, assigned_price, paid_amount, payment_status`.
- **classes** — palinsesto. Campi: `name, instructor, max_participants, weekday, time_start, time_end, gym_id`.
- **bookings** — prenotazioni. Campi: `client_id, class_id, booking_date, gym_id`.
- **checkins** — accessi. Campi: `client_id, checkin_time, status (allowed|denied), reason, gym_id`.
- **leads** — richieste commerciali SaaS. Campi: `name, gym_name, city, phone, email, status`.
- **email_otps** — OTP per verifica email. Campi: `gym_id, email, code, expires_at, attempts`.

### 4.2 Relazioni (ER testuale)

```
gyms 1───N clients
gyms 1───N plans
gyms 1───N classes
gyms 1───N checkins
gyms 1───N bookings
gyms 1───N staff_members
gyms 1───N email_otps

clients 1───N client_memberships        plans 1───N client_memberships
clients 1───N bookings                  classes 1───N bookings
clients 1───N checkins                  clients 1───N medical_certificates
clients 1───N passkeys

leads  (entità isolata: funnel commerciale SaaS)
```

---

## 5. Mappa delle rotte (frontend)

| URL | Pagina | Attore | Accesso |
| :--- | :--- | :--- | :--- |
| `/` | Landing page | Visitatore | Pubblico |
| `/superadmin` | Console SaaS | Superadmin | Email + password |
| `/:slug` | Area Iscritti (login + dashboard) | Iscritto | Passkey / Password (OTP) |
| `/:slug/registrati` | Auto-registrazione | Iscritto | OTP |
| `/:slug/admin` | CRM palestra | Gestore / Staff | Email + password |
| `/:slug/admin/kiosk` | Kiosk mode per check-in | Iscritto al desk | Pin / QRCode |

---

## 6. Flussi funzionali (step-by-step)

### F1 — Lead generation e attivazione palestra (SaaS)
**Attori:** Visitatore, Superadmin.
1. Form contatti sulla landing (`POST /api/leads`).
2. Il Superadmin accede a `/superadmin` e processa il lead.
3. Crea la palestra cliente (`POST /api/admin/gyms`).
4. **Assistenza:** Il Superadmin può cliccare su "Accedi come" per ottenere un token fittizio ed essere reindirizzato nel CRM della palestra per fare assistenza (Impersonificazione).

### F2 — Accesso al CRM e Ruoli Staff
**Attori:** Owner, Staff.
1. L'utente accede da `/:slug/admin` con email e password.
2. Il backend verifica se l'email appartiene a `gyms` (ruolo `owner`) o a `staff_members` (ruolo `admin`, `reception`, `trainer`).
3. Il **JWT** include il ruolo. Il frontend (nella `Sidebar` protetta e responsive) mostra o nasconde sezioni:
   - *Owner / Admin*: accesso completo (anche a Vendite, Listino, Staff).
   - *Reception*: vede Dashboard, Check-in, Approvazioni, Clienti.
   - *Trainer*: vede Classi e Prenotazioni.

### F3 — Gestione anagrafica iscritti e Documenti
**Attori:** Gestore/Reception.
1. Elenco clienti arricchito con lo stato dell'abbonamento attivo.
2. Calcolo automatico del **Codice Fiscale**.
3. **Approvazione Certificati:** Tabella separata con i documenti `pending` caricati dai clienti via Cloudinary. La segreteria visiona il file, imposta la data di scadenza reale (scritta sul foglio) e approva. Fino ad approvazione il cliente potrebbe non poter accedere ai corsi.

### F4, F5, F6, F7 — Abbonamenti e Corsi
Regole identiche alla versione precedente: Listino flessibile (a tempo o a ingressi). Prezzi e pagamenti parziali tracciati nelle vendite. Calendario ricorrente per i corsi con prenotazioni soggette a severi vincoli d'ingresso.

### F8 — Check-in (Reception e Kiosk Mode)
**Attori:** Reception, Iscritto.
1. **Modalità Operatore:** La reception cerca il cliente per registrarne l'ingresso.
2. **Kiosk Mode:** Il gestore può attivare la rotta `/:slug/admin/kiosk` a schermo intero su un tablet in reception. I clienti digitano il loro PIN o leggono un QRCode (se supportato) in totale autonomia.
3. Controlli eseguiti: Certificato Valido → Abbonamento Attivo → Decremento Ingressi (se a consumo).

### F9 — Auto-registrazione pubblica dell'iscritto
**Attori:** Iscritto.
1. Verifica Email tramite codice OTP (valido 10 min, max 5 tentativi).
2. Solo se verificato, accesso all'anagrafica. Se il cliente non esiste, lo si crea.
3. Creazione **Password** obbligatoria e opzionale associazione **Passkey** (impronta digitale/FaceID) per i login successivi.

### F10 — Area Iscritto Self-service
**Attori:** Iscritto.
1. Accesso primario ultra-rapido tramite **Passkey** WebAuthn.
2. **Dashboard mobile-first:** visualizzazione scadenze (certificato e abbonamento), upload diretto su Cloudinary del nuovo certificato medico.
3. **Self-booking:** prenota/disdice corsi nel rispetto della capienza e dei propri limiti commerciali e medici.

---

## 7. Regole di business trasversali

| Regola | Dettaglio |
| :--- | :--- |
| **Scadenza certificato** | "scaduto" se la data è nel passato; "in scadenza" se entro 7 giorni; "in attesa" se assente o `pending`. |
| **Abbonamento `time`** | attivo finché `oggi ≤ end_date`. |
| **Abbonamento `count`** | attivo finché `remaining_checkins > 0`; decrementato solo dal check-in o dal kiosk. |
| **Stato Accesso** | un iscritto "può entrare" sse certificato `approved` **E** abbonamento attivo. |
| **Isolamento tenant** | ogni dato è filtrato per `gym_id`; lo `status` della palestra è verificato a ogni richiesta. |

---

## 8. Note, limiti ed evoluzioni

**Punti di forza**
- Architettura SaaS reale: isolamento, impersonificazione e gestione cloud-native degli asset (Cloudinary).
- UX 100% Mobile Responsive sia lato Iscritto (app-like experience) che lato CRM Amministrativo.
- Autenticazione Passwordless all'avanguardia con WebAuthn/Passkeys.
- Struttura dello staff modulare con autorizzazioni granulari per la sicurezza.

**Limiti attuali / debiti**
- Prenotazioni legate allo **slot settimanale**, non alla singola data/occorrenza (calendario master ricorrente).
- Invio email OTP richiede configurazione SMTP in produzione (attualmente loggata/visibile in dev).
- Assenza di integrazione pagamenti diretti lato cliente finale (Stripe).

**Evoluzioni naturali**
- Occorrenze singole per corsi ed eventi speciali.
- Pagamento dell'abbonamento o delle singole "drop-in class" direttamente dall'app membro.
- Notifiche Push o WhatsApp per reminder rinnovi e scadenze certificati.
