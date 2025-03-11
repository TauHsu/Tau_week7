const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('SkillController');
const { isUndefined, isValidString } = require('../utils/validUtils');
const appError = require('../utils/appError');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function get(req,res,next){
    const skill = await dataSource.getRepository('Skill').find({
        select: ['id', 'name']
    });
    res.status(200).json({
        status: 'success',
        data: skill
    });
};
async function post(req,res,next){
    const { name } = req.body;
    if(isUndefined(name) || !isValidString(name)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    const skillRepo = await dataSource.getRepository('Skill');
    const existSkill = await skillRepo.findOneBy({ name });
    if(existSkill){
        return next(appError(409, ERROR_MESSAGES.DATA_REPEAT));
    };

    const newSkill = await skillRepo.create({ name });
    const result = await skillRepo.save(newSkill);
    res.status(200).json({
        status: 'success',
        data: result
    });
};
async function deleteSkill(req,res,next){
    const { skillId } = req.params;
    if(isUndefined(skillId) || !isValidString(skillId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const result = await dataSource.getRepository('Skill').delete(skillId);
    if(result.affected === 0){
        return next(appError(400, ERROR_MESSAGES.ID_ERROR));
    };

    res.status(200).json({
        status: 'success'
    });
};

module.exports = {
    get,
    post,
    deleteSkill
};