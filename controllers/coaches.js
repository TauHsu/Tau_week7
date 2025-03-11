const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CoachesController');
const appError = require('../utils/appError');
const { isUndefined, isValidString, isValidInteger } = require('../utils/validUtils');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function getCoaches(req,res,next){
    const { per, page } = req.query;
    if (isUndefined(per) || !isValidString(per) || 
        isUndefined(page) || !isValidString(page)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
        
    const perNumber = parseInt(per, 10);
    const pageNumber = parseInt(page,10);
    const skip = perNumber * ( pageNumber - 1 );
    if(!isValidInteger(perNumber) || !isValidInteger(pageNumber)){
        return next(appError(400,'per 和 page 需為正整數'));
    };
    if(skip < 0){
        return next(appError(400,'skip 不能小於 0'));
    };
    
    const coaches = await dataSource.getRepository('Coach').find({
        select: {
            id: true,
            User: { name: true}
        },
        relations: { User: true },
        take: perNumber,
        skip,
        order: { created_at: 'DESC' }
    });
    res.status(200).json({
        status: 'success',
        data: coaches.map((coaches) => {
            return {
                id: coaches.id,
                name: coaches.User.name
            }
        })
    });
};
async function getCoachDetail(req,res,next){
    const { coachId } = req.params;
    if(isUndefined(coachId) || !isValidString(coachId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const coachRepo = await dataSource.getRepository('Coach');
    const coach = await coachRepo.findOne({
        select: ['id', 'experience_years', 'description', 'profile_image_url', 'created_at', 'updated_at'],
        relations: ['User'],
        where: { id: coachId }
    });
    if(!coach){
        logger.warn(ERROR_MESSAGES.COACH_NOT_FOUND);
        return next(appError(400, ERROR_MESSAGES.COACH_NOT_FOUND));
    };
    res.status(200).json({
        status: 'success',
        data: coach
    });
};
async function getCoachCourses(req,res,next){
    const { coachId } = req.params;
    if(isUndefined(coachId) || !isValidString(coachId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    const coach = await dataSource.getRepository('Coach').findOne({
        select: {
            id: true,
            user_id: true,
            User: {
                name: true
            }
        },
        relations: { User: true },
        where: { id: coachId }
    });
    if(!coach){
        logger.warn(ERROR_MESSAGES.COACH_NOT_FOUND);
        return next(appError(400, ERROR_MESSAGES.COACH_NOT_FOUND));
    };
    logger.info(`Coach: ${JSON.stringify(coach)}`);

    const coachCourses = await dataSource.getRepository('Course').find({
        select: {
            id: true,
            Skill: { name: true },
            name: true,
            description: true,
            start_at: true,
            end_at: true,
            max_participants: true
        },
        relations: {
            Skill: true
        },
        where: { user_id: coach.user_id }
    });

    res.status(200).json({
        status: 'success',
        data: coachCourses.map((coachCourses) => {
            return {
                id: coachCourses.id,
                coach_name: coach.User.name,
                skill_name: coachCourses.Skill.name,
                name: coachCourses.name,
                description: coachCourses.description,
                start_at: coachCourses.start_at,
                end_at: coachCourses.end_at,
                max_participants: coachCourses.max_participants
            }
        })
    });
};

module.exports = {
    getCoaches,
    getCoachDetail,
    getCoachCourses
};