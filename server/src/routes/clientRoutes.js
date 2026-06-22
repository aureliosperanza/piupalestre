const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const upload = require('../middlewares/upload');

router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientById);
router.post('/', upload.single('certificate_file'), clientController.createClient);
router.put('/:id', upload.single('certificate_file'), clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;
