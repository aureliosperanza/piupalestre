const express = require('express');
const router = express.Router();
const clientMembershipController = require('../controllers/clientMembershipController');

router.get('/', clientMembershipController.getMemberships);
router.post('/', clientMembershipController.createMembership);

module.exports = router;
