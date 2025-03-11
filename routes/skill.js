const express = require('express');

const router = express.Router();
const { dataSource } = require('../db/data-source');
const skillController = require('../controllers/skill');
const logger = require('../utils/logger')('Skill');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(skillController.get));
router.post('/', handleErrorAsync(skillController.post));
router.delete('/:skillId', handleErrorAsync(skillController.deleteSkill));

module.exports = router;