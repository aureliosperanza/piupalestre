const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getSales);
router.put('/:id/pay', salesController.registerPayment);

module.exports = router;
