const express = require('express');

const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Admin');
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
});
const isCoach = require('../middlewares/isCoach');
const adminController = require('../controllers/admin');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.post('/coaches/courses', auth, isCoach, handleErrorAsync(adminController.postCoachCourse));
router.get('/coaches/revenue', auth, isCoach, handleErrorAsync(adminController.getCoachRevenue));
router.get('/coaches/courses/', auth, isCoach, handleErrorAsync(adminController.getCoachCourses));
router.get('/coaches/courses/:courseId', auth, handleErrorAsync(adminController.getCoachCourseDetail));
router.put('/coaches/courses/:courseId', auth, handleErrorAsync(adminController.putCoachCourseDetail));
router.post('/coaches/:userId', handleErrorAsync(adminController.postCoach));
router.get('/coaches', auth, isCoach, handleErrorAsync(adminController.getCoachProfile));
router.put('/coaches', auth, isCoach, handleErrorAsync(adminController.putCoachProfile));

module.exports = router;