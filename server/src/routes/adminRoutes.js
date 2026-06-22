const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateGym, requireSuperadmin } = require('../middlewares/auth');

// Public lead submission
router.post('/leads', adminController.createLead);

// Superadmin protected routes
router.get('/admin/leads', authenticateGym, requireSuperadmin, adminController.getLeads);
router.put('/admin/leads/:id', authenticateGym, requireSuperadmin, adminController.updateLeadStatus);
router.get('/admin/gyms', authenticateGym, requireSuperadmin, adminController.getGyms);
router.post('/admin/gyms', authenticateGym, requireSuperadmin, adminController.createGym);
router.put('/admin/gyms/:id/status', authenticateGym, requireSuperadmin, adminController.updateGymStatus);
router.post('/admin/impersonate/:id', authenticateGym, requireSuperadmin, adminController.impersonateGym);

module.exports = router;
