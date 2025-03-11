const express = require('express');
const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Users');
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
});
const usersController = require('../controllers/users');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.post('/signup', handleErrorAsync(usersController.postSignup));
router.post('/login', handleErrorAsync(usersController.postLogin));
router.get('/profile', auth, handleErrorAsync(usersController.getUserProfile));
router.put('/profile', auth, handleErrorAsync(usersController.putUserProfile));
router.get('/credit-package', auth, handleErrorAsync(usersController.getCreditPackage));
router.get('/courses', auth, handleErrorAsync(usersController.getCoursesBooking));
router.put('/password', auth, handleErrorAsync(usersController.putPassword));

module.exports = router;