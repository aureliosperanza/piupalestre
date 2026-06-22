const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/gyms/slug/:slug', authController.getGymBySlug);
router.post('/login-by-slug', authController.loginBySlug);

module.exports = router;
