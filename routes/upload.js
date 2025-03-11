const express = require('express');
const router = express.Router();

const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Upload');
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
});
const uploadImage = require('../middlewares/uploadImage');
const uploadController = require('../controllers/upload');

router.post('/', auth, uploadImage, uploadController.postUploadImage);

module.exports = router;