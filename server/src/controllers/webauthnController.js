const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');

const rpName = 'PiùPalestre';
const rpID = process.env.NODE_ENV === 'production' ? 'piupalestre.it' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? 'https://app.piupalestre.it' : 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_piupalestre';

// ----- REGISTRAZIONE PASSKEY -----

exports.generateRegistrationOptions = async (req, res) => {
  try {
    const client = await db('clients').where({ id: req.member.id }).first();
    if (!client) return res.status(404).json({ error: 'Utente non trovato' });

    const passkeys = await db('passkeys').where({ client_id: client.id });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: String(client.id),
      userName: client.email,
      attestationType: 'none',
      excludeCredentials: passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64url'),
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Salva challenge nel database
    await db('clients').where({ id: client.id }).update({ current_challenge: options.challenge });

    res.json(options);
  } catch (error) {
    console.error('generateRegistrationOptions error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
    const body = req.body;
    const client = await db('clients').where({ id: req.member.id }).first();
    if (!client || !client.current_challenge) return res.status(400).json({ error: 'Nessuna challenge trovata' });

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: client.current_challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Reset challenge e salva passkey
      await db('clients').where({ id: client.id }).update({ current_challenge: null });
      
      const newPasskey = {
        credential_id: Buffer.from(credentialID).toString('base64url'),
        client_id: client.id,
        public_key: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: body.response.transports ? JSON.stringify(body.response.transports) : '[]'
      };

      await db('passkeys').insert(newPasskey);
      res.json({ success: true, message: 'Passkey registrata con successo' });
    } else {
      res.status(400).json({ error: 'Verifica fallita' });
    }
  } catch (error) {
    console.error('verifyRegistration error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ----- AUTENTICAZIONE PASSKEY -----

exports.generateAuthenticationOptions = async (req, res) => {
  try {
    const { slug } = req.params;
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email richiesta per l'accesso con passkey" });

    const gym = await db('gyms').where({ slug }).first();
    if (!gym || gym.status !== 'active') return res.status(404).json({ error: 'Palestra non trovata o inattiva' });

    const client = await db('clients').where({ email, gym_id: gym.id }).first();
    if (!client) return res.status(404).json({ error: 'Utente non trovato' });

    const passkeys = await db('passkeys').where({ client_id: client.id });
    if (!passkeys.length) return res.status(400).json({ error: 'Nessuna passkey registrata per questo account' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64url'),
        type: 'public-key',
        transports: JSON.parse(pk.transports || '[]')
      })),
      userVerification: 'preferred',
    });

    await db('clients').where({ id: client.id }).update({ current_challenge: options.challenge });

    res.json(options);
  } catch (error) {
    console.error('generateAuthenticationOptions error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyAuthentication = async (req, res) => {
  try {
    const { slug } = req.params;
    const body = req.body; // Questo include email e la risposta WebAuthn
    const email = body.email;
    const response = body.response;

    const gym = await db('gyms').where({ slug }).first();
    if (!gym) return res.status(404).json({ error: 'Palestra non trovata' });

    const client = await db('clients').where({ email, gym_id: gym.id }).first();
    if (!client || !client.current_challenge) return res.status(400).json({ error: 'Utente non valido o challenge scaduta' });

    const passkey = await db('passkeys').where({ 
      credential_id: response.id, 
      client_id: client.id 
    }).first();

    if (!passkey) return res.status(400).json({ error: 'Passkey non valida' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: client.current_challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
        transports: JSON.parse(passkey.transports || '[]')
      }
    });

    if (verification.verified) {
      const { authenticationInfo } = verification;
      // Aggiorna contatore
      await db('passkeys')
        .where({ credential_id: passkey.credential_id })
        .update({ counter: authenticationInfo.newCounter });
      
      // Rimuovi challenge
      await db('clients').where({ id: client.id }).update({ current_challenge: null });

      // Genera JWT
      const token = jwt.sign(
        { client_id: client.id, gym_id: gym.id, email: client.email, purpose: 'member' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token, 
        name: `${client.first_name} ${client.last_name}`, 
        gym: { name: gym.name, slug: gym.slug } 
      });
    } else {
      res.status(400).json({ error: 'Autenticazione passata ma verifica fallita' });
    }
  } catch (error) {
    console.error('verifyAuthentication error:', error);
    res.status(500).json({ error: error.message });
  }
};
