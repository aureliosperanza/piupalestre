const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

router.get('/', classController.getClasses);
router.get('/:id/bookings', classController.getClassBookings);
router.post('/', classController.createClass);
router.post('/bookings', classController.createBooking);
router.put('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);

module.exports = router;
