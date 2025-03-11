const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('AdminController')

dayjs.extend(utc)
const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
};
const appError = require('../utils/appError');
const { isUndefined, isValidString, isValidInteger, isValidUrl} = require('../utils/validUtils');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function postCoachCourse(req,res,next){
    const { id } = req.user;
    const { 
        skill_id: skillId, name, description, start_at: startAt, end_at: endAt, 
        max_participants: maxParticipants, meeting_url: meetingUrl = null
    } = req.body;
    if (isUndefined(skillId) || !isValidString(skillId) ||
        isUndefined(name) || !isValidString(name) ||
        isUndefined(description) || !isValidString(description) ||
        isUndefined(startAt) || !isValidString(startAt) ||
        isUndefined(endAt) || !isValidString(endAt) ||
        isUndefined(maxParticipants) || !isValidInteger(maxParticipants)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    if(meetingUrl && isValidString(meetingUrl) && !isValidUrl(meetingUrl)){
        logger.warn(ERROR_MESSAGES.URL_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.URL_INCORRECT));
    };

    const courseRepo = await dataSource.getRepository('Course');
    const newCourse = await courseRepo.create({
        user_id: id,
        skill_id: skillId,
        name,
        description,
        start_at: startAt,
        end_at: endAt, 
        max_participants: maxParticipants,
        meeting_url: meetingUrl
    });
    const savedCourse = await courseRepo.save(newCourse);
    const course = await courseRepo.findOneBy({ id: savedCourse.id })
    res.status(201).json({
        status: 'success',
        data: {
            course
        }
    });
};
async function getCoachRevenue(req,res,next){
    const { id } = req.user;
    const { month } = req.query;
    if(isUndefined(month) || !Object.prototype.hasOwnProperty.call(monthMap, month)){
        logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    const courseRepo = await dataSource.getRepository('Course');
    const courses = await courseRepo.find({
        select: ['id'],
        where: { user_id: id }
    });
    const courseIds = courses.map(course => course.id);
    if(courseIds.length === 0){
        res.status(200).json({
            status: 'success',
            data: {
                total: {
                    participants: 0,
                    revenue: 0,
                    course_count: 0
		        }
            }
        });
        return;
    };

    const courseBookingRepo = await dataSource.getRepository('CourseBooking');
    const year = new Date().getFullYear();
    const calculateStartAt = dayjs(`${year}-${month}-01`).startOf('month').toISOString();
    const calculateEndAt = dayjs(`${year}-${month}-01`).endOf('month').toISOString();
    const courseCount = await courseBookingRepo.createQueryBuilder('course_booking')
        .select('COUNT(*)', 'count')
        .where('course_id IN (:...ids)', { ids: courseIds })
        .andWhere('cancelled_at IS NULL')
        .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
        .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
        .getRawOne()
    const participants = await courseBookingRepo.createQueryBuilder('course_booking')
        .select('COUNT(DISTINCT(user_id))', 'count')
        .where('course_id IN (:...ids)', { ids: courseIds })
        .andWhere('cancelled_at IS NULL')
        .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
        .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
        .getRawOne()
    const totalCreditPackage = await dataSource.getRepository('CreditPackage').createQueryBuilder('credit_package')
        .select('SUM(credit_amount)', 'total_credit_amount')
        .addSelect('SUM(price)', 'total_price')
        .getRawOne()
    const perCreditPrice = totalCreditPackage.total_price / totalCreditPackage.total_credit_amount;
    const totalRevenue = courseCount.count * perCreditPrice;
    res.status(200).json({
        status: 'success',
        data: {
            total: {
			    participants: parseInt(participants.count, 10),
			    revenue: Math.floor(totalRevenue),
			    course_count: parseInt(courseCount.count, 10)
		    }
        }
    });
};
async function getCoachCourses(req,res,next){
    const { id } = req.user;
    const courses = await dataSource.getRepository('Course').find({
        select: {
            id: true,
            user_id: true,
            name: true,
            start_at: true,
            end_at: true,
            meeting_url: true
        },
        where: { user_id: id }
    });
    const courseIds = courses.map((course) => course.id);
    const coursesParticipant= await dataSource.getRepository('CourseBooking')
        .createQueryBuilder('course_booking')
        .select('course_id')
        .addSelect('COUNT(course_id)','count')
        .where('course_id IN (:...courseIds)', { courseIds })
        .andWhere('cancelled_at is null')
        .groupBy('course_id')
        .getRawMany()
    logger.info(`coursesParticipant: ${JSON.stringify(coursesParticipant, null, 1)}`);

    let now = new Date();
    res.status(200).json({
        status: 'success',
        data: courses.map((course) => {
            const startAt = new Date(course.start_at);
            const endAt = new Date(course.end_at);
            let status = '尚未開始';
            if(startAt < now){
                status = '進行中';
            }else if(endAt < now){
                status = '已結束';
            };
            const courseParticipant = coursesParticipant.find((coursesParticipant) => coursesParticipant.course_id === course.id);
            return{
                id: course.id,
                status,
                name: course.name,
				start_at: course.start_at,
				end_at: course.end_at,
                max_participants: course.max_participants, 
                participants: courseParticipant ? courseParticipant.count: 0
            }
        })
    });
};
async function getCoachCourseDetail(req,res,next){
    const { id } = req.user;
    const { courseId } = req.params;
    if(isUndefined(courseId) || !isValidString(courseId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const coach = await dataSource.getRepository('Coach').findOneBy({ user_id: id });
    if(!coach){
        return next(appError(400, ERROR_MESSAGES.COACH_NOT_FOUND));
    };

    const coachCourse = await dataSource.getRepository('Course').findOne({
        select: {
            id: true,
            Skill: { name: true },
            name: true,
            description: true,
            start_at: true,
            end_at: true,
            max_participants: true
        },
        where: { user_id: id },
        relations: {
            Skill: true
        }
    });

    res.status(200).json({
        status: 'success',
        data: {
            id: coachCourse.id,
            skill_name: coachCourse.Skill.name,
            name: coachCourse.name,
            description: coachCourse.description,
            start_at: coachCourse.start_at,
            end_at: coachCourse.end_at,
            max_participants: coachCourse.max_participants
        }
    });
};
async function putCoachCourseDetail(req,res,next){
    const { id } = req.user;
    const { courseId } = req.params;
    const { 
        skill_id: skillId, name, description, start_at: startAt, end_at: endAt, 
        max_participants: maxParticipants, meeting_url: meetingUrl = null
    } = req.body;
    if (isUndefined(courseId) || !isValidString(courseId) ||
        isUndefined(skillId) || !isValidString(skillId) ||
        isUndefined(name) || !isValidString(name) ||
        isUndefined(description) || !isValidString(description) ||
        isUndefined(startAt) || !isValidString(startAt) ||
        isUndefined(endAt) || !isValidString(endAt) ||
        isUndefined(maxParticipants) || !isValidInteger(maxParticipants)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    if(meetingUrl && isValidString(meetingUrl) && !isValidUrl(meetingUrl)){
        logger.warn(ERROR_MESSAGES.URL_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.URL_INCORRECT));
    };

    const courseRepo = await dataSource.getRepository('Course');
    const existCourse = await courseRepo.findOne({
        where: { id: courseId, user_id: id }
    });
    if(!existCourse){
        logger.warn(ERROR_MESSAGES.COURSE_NOT_FOUND);
        return next(appError(400, ERROR_MESSAGES.COURSE_NOT_FOUND));
    };

    const updateCourse = await courseRepo.update(
        {
            id: courseId
        },
        {
            skill_id: skillId,
            name,
            description,
            start_at: startAt,
            end_at: endAt,
            max_participants: maxParticipants,
            meeting_url: meetingUrl
        }
    );
    if(updateCourse.affected === 0){
        logger.warn(ERROR_MESSAGES.UPDATE_FAILED);
        return next(appError(400, ERROR_MESSAGES.UPDATE_FAILED));
    };

    const savedCourse = await courseRepo.findOneBy({ id: courseId });
    res.status(200).json({
        status: 'success',
        data: savedCourse
    });
};
async function postCoach(req,res,next){
    const { userId } = req.params;
    const { experience_years: experienceYears, description, profile_image_url: profileImageUrl = null } = req.body;
    if (isUndefined(userId) || !isValidString(userId) ||
        isUndefined(experienceYears) || !isValidInteger(experienceYears) ||
        isUndefined(description) || !isValidString(description)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    if(profileImageUrl && isValidString(profileImageUrl) && !isValidUrl(profileImageUrl)){
        logger.warn(ERROR_MESSAGES.PROFILE_PHOTO_URL_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.PROFILE_PHOTO_URL_INCORRECT));
    };

    const userRepo = await dataSource.getRepository('User');
    const existUser = await userRepo.findOne({
        select: ['id', 'name', 'role'],
        where: { id: userId }
    });
    if(!existUser){
        logger.warn(ERROR_MESSAGES.USER_NOT_FOUND);
        return next(appError(400, ERROR_MESSAGES.USER_NOT_FOUND));
    }else if(existUser.role === 'COACH'){
        logger.warn(ERROR_MESSAGES.ALREADY_COACH);
        return next(appError(409, ERROR_MESSAGES.ALREADY_COACH));
    };

    const coachRepo = await dataSource.getRepository('Coach');
    const newCoach = await coachRepo.create({
        user_id: userId,
        experience_years: experienceYears,
	    description,
	    profile_image_url: profileImageUrl
    });
    const updatedUser = await userRepo.update(
        {
            id: userId,
            role: 'USER'
        },
        {
            role: 'COACH'
        }
    );
    if(updatedUser.affected === 0){
        logger.warn(ERROR_MESSAGES.UPDATE_USER_FAILED);
        return next(appError(409, ERROR_MESSAGES.UPDATE_USER_FAILED));
    };

    const savedCoach = await coachRepo.save(newCoach);
    const savedUser = await userRepo.findOne({
        select: ['name', 'role'],
        where: { id: userId }
    })
    res.status(201).json({
        status: 'success',
        data: {
            user: savedUser,
            coach: savedCoach
        }
    });
    
};
async function putCoachProfile(req,res,next){
    const { id } = req.user;
    const { 
        experience_years: experienceYears,
        description,
        profile_image_url: profileImageUrl = null,
        skill_ids: skillIds
    } = req.body;
    if (isUndefined(experienceYears) || !isValidInteger(experienceYears) ||
        isUndefined(description) || !isValidString(description) ||
        isUndefined(profileImageUrl) || !isValidString(profileImageUrl) || !isValidUrl(profileImageUrl) ||
        isUndefined(skillIds) || !Array.isArray(skillIds)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    if(skillIds.length === 0 || skillIds.every(skill => isUndefined(skill) || !isValidString(skill))){
        logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const coachRepo = await dataSource.getRepository('Coach');
    const coach = await coachRepo.findOne({ 
        select: ['id'],
        where: { user_id: id } 
    });
    if(!coach){
        logger.warn(ERROR_MESSAGES.COACH_NOT_FOUND);
        return next(appError(400, ERROR_MESSAGES.COACH_NOT_FOUND));
    };

    await coachRepo.update(
        {
            id: coach.id
        },{
            experience_years: experienceYears,
            description,
            profile_image_url: profileImageUrl
        }
    );
    const coachLinkSkillRepo = await dataSource.getRepository('CoachLinkSkill');
    const newCoachLinkSkill = skillIds.map(skill => ({
        coach_id: coach.id,
        skill_id: skill
    }));
    await coachLinkSkillRepo.delete({ coach_id: coach.id });
    const insert = await coachLinkSkillRepo.insert(newCoachLinkSkill);
    logger.info(`newCoachLinkSkill: ${JSON.stringify(newCoachLinkSkill)}`);
    logger.info(`insert: ${JSON.stringify(insert, null, 1)}`);
    const result = await coachRepo.find({
        select: {
            id: true,
            experience_years: true,
            description: true,
            profile_image_url: true,
            CoachLinkSkill: {
                skill_id: true
            }
        },
        where: { id: coach.id },
        relations: {
            CoachLinkSkill: true
        }
    });
    logger.info(`resule: ${JSON.stringify(result, null ,1)}`);
    res.status(200).json({
        status: 'success',
        data: {
            id: result[0].id,
            experience_years: result[0].experience_years,
            description: result[0].description,
            profile_image_url: result[0].profile_image_url,
            skill_ids: result[0].CoachLinkSkill.map(skill => skill.skill_id)
        }
    });
};
async function getCoachProfile(req,res,next){
    const { id } = req.user;
    const coachRepo = await dataSource.getRepository('Coach');
    const coach = await coachRepo.findOne({
        select: ['id'],
        where: { user_id: id }
    });
    if(!coach){
        logger.warn(ERROR_MESSAGES.COACH_NOT_FOUND);
        return next(appError(400,ERROR_MESSAGES.COACH_NOT_FOUND));
    };
    const result = await coachRepo.findOne({
        select: {
            id: true,
            experience_years: true,
            description: true,
            profile_image_url: true,
            CoachLinkSkill: { skill_id: true }
        },
        where: { id: coach.id },
        relations: { CoachLinkSkill: true }
    });

    logger.info(`result: ${JSON.stringify(result, null, 1)}`);
    res.status(200).json({
        status: 'success',
        data: {
            id: result.id,
            experience_years: result.experience_years,
            description: result.description,
            profile_image_url: result.profile_image_url,
            skill_ids: result.CoachLinkSkill.length > 0 ? result.CoachLinkSkill.map(skill => skill.skill_id): result.CoachLinkSkill
        }
    });
};

module.exports = {
    postCoachCourse,
    getCoachRevenue,
    getCoachCourses,
    getCoachCourseDetail,
    putCoachCourseDetail,
    postCoach,
    putCoachProfile,
    getCoachProfile
};