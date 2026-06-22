const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

router.get('/pending', certificateController.getPending);
router.post('/:id/approve', certificateController.approve);
router.post('/:id/reject', certificateController.reject);

module.exports = router;
