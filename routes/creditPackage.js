const express = require('express');

const router = express.Router();
const config = require('../config/index')
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackage');
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
});
const creditPackageController = require('../controllers/creditPackage');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(creditPackageController.get));
router.post('/', handleErrorAsync(creditPackageController.post));
router.post('/:creditPackageId', auth, handleErrorAsync(creditPackageController.postUserBuy));
router.delete('/:creditPackageId', handleErrorAsync(creditPackageController.deletePackage));

module.exports = router;