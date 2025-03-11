const { IsNull } = require('typeorm');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CoursesController');
const { isUndefined, isValidString, } = require('../utils/validUtils');
const appError = require('../utils/appError');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function getCourses(req,res,next){
    const course = await dataSource.getRepository('Course').find({
        select: {
            id: true,
            User: { name: true},
            Skill: { name: true},
			name: true,
			description: true,
			start_at: true,
			end_at: true,
			max_participants: true
        },
        relations: {
            User: true,
            Skill: true
        }
    });
    res.status(200).json({
        status: 'success',
        data: course.map((course) => {
            return {
                id: course.id,
                coach_name: course.User.name,
                skill_name: course.Skill.name,
                name: course.name,
                description: course.description,
                start_at: course.start_at,
                end_at: course.end_at,
                max_participants: course.max_participants
            }
        })
    });
};
async function postCoursesBooking(req,res,next){
    const { id } = req.user;
    const { courseId } = req.params;
    if(isUndefined(courseId) || !isValidString(courseId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const courseRepo = await dataSource.getRepository('Course');
    const course = await courseRepo.findOneBy({ id: courseId });
    if(!course){
        return next(appError(400, ERROR_MESSAGES.ID_ERROR));
    };

    const creditPurchaseRepo = await dataSource.getRepository('CreditPurchase');
    const courseBookingRepo = await dataSource.getRepository('CourseBooking');

    const userCourseBooking  = await courseBookingRepo.findOne({
        where: {
            user_id: id,
            course_id: courseId
        }
    });
    if(userCourseBooking){
        return next(appError(400, ERROR_MESSAGES.ALREADY_REGISTERED));
    };

    const totalCredit = await creditPurchaseRepo.sum('purchased_credits',{
        user_id: id
    });
    const usedCredit = await courseBookingRepo.count({
        where: {
            user_id: id, 
            cancelledAt: IsNull()
        }
    });
    const courseBookingCount = await courseBookingRepo.count({
        where: {
            course_id: courseId,
            cancelledAt: IsNull()
        }
    });
    if(usedCredit >= totalCredit){
        return next(appError(400, ERROR_MESSAGES.NO_CREDITS));
    }else if(courseBookingCount >= course.max_participants){
        return next(appError(400, ERROR_MESSAGES.MAX_PARTICIPANTS_REACHED));
    };

    const newCourseBooking = await courseBookingRepo.create({
        user_id: id, course_id: courseId
    });
    await courseBookingRepo.save(newCourseBooking);
    res.status(200).json({
        status: 'success',
        data: null
    });
};
async function deleteCoursesBooking(req,res,next){
    const { id } = req.user;
    const { courseId } = req.params;
    if(isUndefined(courseId) || !isValidString(courseId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const courseBookingRepo = await dataSource.getRepository('CourseBooking');
    const userCourseBooking = await courseBookingRepo.findOne({ 
        where: {
            user_id: id,
            course_id: courseId,
            cancelledAt: IsNull()
        }
    });
    if(!userCourseBooking){
        return next(appError(400, ERROR_MESSAGES.COURSE_NOT_FOUND));
    };

    const updateCourseBooking = await courseBookingRepo.update(
        {
            user_id: id,
            course_id: courseId,
            cancelledAt: IsNull()
        },
        {
            cancelledAt: new Date().toISOString()
        }
    );
    if(updateCourseBooking.affected === 0){
        return next(appError(400, ERROR_MESSAGES.CANCEL_FAILED));
    };

    res.status(200).json({
        status: 'success',
        data: null
    });
};

module.exports = {
    getCourses,
    postCoursesBooking,
    deleteCoursesBooking
};