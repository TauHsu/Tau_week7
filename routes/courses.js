const express = require('express');
const { IsNull } = require('typeorm')

const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Course');
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
});
const coursesController = require('../controllers/courses');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(coursesController.getCourses));
router.post('/:courseId', auth, handleErrorAsync(coursesController.postCoursesBooking));
router.delete('/:courseId', auth, handleErrorAsync(coursesController.deleteCoursesBooking));

module.exports = router;