const db = require('../config/db');

exports.getPending = async (req, res) => {
  try {
    const certs = await db('medical_certificates')
      .join('clients', 'medical_certificates.client_id', 'clients.id')
      .where('medical_certificates.gym_id', req.gym)
      .andWhere('medical_certificates.status', 'pending')
      .select('medical_certificates.*', 'clients.first_name', 'clients.last_name', 'clients.email')
      .orderBy('medical_certificates.created_at', 'asc');
      
    res.json(certs);
  } catch (error) {
    console.error('getPending error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiry_date } = req.body;
    
    if (!expiry_date) return res.status(400).json({ error: 'Data scadenza richiesta' });

    const cert = await db('medical_certificates').where({ id, gym_id: req.gym }).first();
    if (!cert) return res.status(404).json({ error: 'Certificato non trovato' });

    await db.transaction(async (trx) => {
      await trx('medical_certificates').where({ id }).update({ status: 'approved', updated_at: db.fn.now() });
      await trx('clients').where({ id: cert.client_id }).update({ medical_certificate_expiry: expiry_date, updated_at: db.fn.now() });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('approve error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cert = await db('medical_certificates').where({ id, gym_id: req.gym }).first();
    if (!cert) return res.status(404).json({ error: 'Certificato non trovato' });

    await db('medical_certificates').where({ id }).update({ status: 'rejected', rejection_reason: reason || 'Non specificato', updated_at: db.fn.now() });
    
    res.json({ success: true });
  } catch (error) {
    console.error('reject error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
