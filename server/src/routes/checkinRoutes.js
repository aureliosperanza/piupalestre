const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');

router.get('/', checkinController.getCheckins);
router.post('/', checkinController.createCheckin);
router.post('/scan', checkinController.scanCheckin);

module.exports = router;
