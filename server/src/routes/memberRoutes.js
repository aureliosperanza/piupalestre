const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Usa JPG, PNG o PDF.'));
    }
  }
});

router.get('/me', memberController.getMe);
router.get('/bookings', memberController.getBookings);
router.get('/classes', memberController.getClasses);
router.post('/bookings', memberController.createBooking);
router.delete('/bookings/:id', memberController.cancelBooking);
router.put('/phone', memberController.updatePhone);
router.put('/profile', memberController.updateProfile);
router.put('/password', memberController.updatePassword);

// WebAuthn Passkeys Registration
const webauthnController = require('../controllers/webauthnController');
router.get('/webauthn/generate-registration-options', webauthnController.generateRegistrationOptions);
router.post('/webauthn/verify-registration', webauthnController.verifyRegistration);

router.get('/qr-token', memberController.getQrToken);
router.post('/certificate', upload.single('certificate'), memberController.uploadCertificate);

module.exports = router;
