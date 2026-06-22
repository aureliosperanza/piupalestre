const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const webauthnController = require('../controllers/webauthnController');

// Public Gym Info
router.get('/gyms/:slug', publicController.getGym);

// WebAuthn Passkeys Authentication
router.get('/gyms/:slug/webauthn/generate-authentication-options', webauthnController.generateAuthenticationOptions);
router.post('/gyms/:slug/webauthn/verify-authentication', webauthnController.verifyAuthentication);

// Member Registration & Login
router.post('/gyms/:slug/request-otp', publicController.requestOtp);
router.post('/gyms/:slug/verify-otp', publicController.verifyOtp);
router.post('/gyms/:slug/register', publicController.register);
router.post('/gyms/:slug/member-login', publicController.memberLogin);

module.exports = router;
