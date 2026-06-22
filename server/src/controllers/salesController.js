const db = require('../config/db');

// GET /api/sales - Ottieni lo storico vendite e abbonamenti assegnati
exports.getSales = async (req, res) => {
  try {
    const sales = await db('client_memberships')
      .join('clients', 'client_memberships.client_id', 'clients.id')
      .join('plans', 'client_memberships.plan_id', 'plans.id')
      .where('clients.gym_id', req.gym)
      .select(
        'client_memberships.id',
        'client_memberships.start_date',
        'client_memberships.end_date',
        'client_memberships.assigned_price',
        'client_memberships.paid_amount',
        'client_memberships.payment_status',
        'client_memberships.created_at',
        'clients.id as client_id',
        'clients.first_name',
        'clients.last_name',
        'plans.name as plan_name',
        'plans.price as original_price'
      )
      .orderBy('client_memberships.created_at', 'desc');

    res.json(sales);
  } catch (error) {
    console.error('getSales error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/sales/:id/pay - Registra un incasso parziale o totale
exports.registerPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // l'importo aggiuntivo versato in questo momento

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Importo non valido' });
    }

    const membership = await db('client_memberships')
      .join('clients', 'client_memberships.client_id', 'clients.id')
      .where('client_memberships.id', id)
      .andWhere('clients.gym_id', req.gym)
      .select('client_memberships.*')
      .first();

    if (!membership) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const newPaidAmount = Number(membership.paid_amount) + Number(amount);
    const assignedPrice = Number(membership.assigned_price);
    
    let newStatus = 'partial';
    if (newPaidAmount >= assignedPrice) {
      newStatus = 'paid';
    } else if (newPaidAmount === 0) {
      newStatus = 'unpaid';
    }

    await db('client_memberships')
      .where({ id })
      .update({
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });

    res.json({ success: true, paid_amount: newPaidAmount, payment_status: newStatus });
  } catch (error) {
    console.error('registerPayment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
