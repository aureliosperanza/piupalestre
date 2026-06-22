const nodemailer = require('nodemailer');

// Se sono configurate le variabili SMTP usiamo un transport reale, altrimenti
// in sviluppo logghiamo il codice in console (nessun invio reale).
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

/**
 * Invia il codice OTP via email. In assenza di configurazione SMTP, lo stampa in console.
 * @returns {Promise<boolean>} true se inviato via SMTP, false se loggato in dev
 */
const sendOtpEmail = async (to, code, gymName) => {
  const subject = `Codice di verifica - ${gymName}`;
  const text = `Il tuo codice di verifica per l'iscrizione a ${gymName} è: ${code}\n\nIl codice è valido per 10 minuti. Se non hai richiesto tu l'iscrizione, ignora questa email.`;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@piupalestre.it',
      to,
      subject,
      text
    });
    return true;
  }

  console.log(`\n========== [OTP DEV] ==========\nA: ${to}\nPalestra: ${gymName}\nCodice: ${code}\n===============================\n`);
  return false;
};

module.exports = { sendOtpEmail };
