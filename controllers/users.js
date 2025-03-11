const { IsNull, In } = require('typeorm')
const bcrypt = require('bcrypt');
const generateJWT = require('../utils/generateJWT');
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('UsersController');
const { isUndefined, isValidString, isValidEmail, isValidPassword } = require ('../utils/validUtils');
const appError = require('../utils/appError');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function postSignup(req,res,next){
    const { name, email, password } = req.body;
    if (isUndefined(name) || !isValidString(name) ||
        isUndefined(email) || !isValidString(email) ||
        isUndefined(password) || !isValidString(password)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    if(!isValidEmail(email)){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.EMAIL_NOT_RULE}`);
        return next(appError(400, ERROR_MESSAGES.EMAIL_NOT_RULE));
    };
    if(!isValidPassword(password)){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_NOT_RULE}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_NOT_RULE));
    };
    
    const userRepo = await dataSource.getRepository('User');
    const existEmail = await userRepo.findOneBy({ email });
    if(existEmail){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.EMAIL_ALREADY_USED}`);
        next(appError(409, ERROR_MESSAGES.EMAIL_ALREADY_USED));
        return;
    };

    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(password, salt);
    const newUser = await userRepo.create({
        name,
        email,
        role: 'USER',
        password: hashPassword
    });
    const savedUser = await userRepo.save(newUser);
    logger.info('新建立的使用者ID:', savedUser.id);
    
    res.status(201).json({
        status: 'success',
        data: {
            user: {
			    id: savedUser.id,
			    name: savedUser.name
		    }
        }
    });
};
async function postLogin(req,res,next){
    const { email, password } = req.body;
    if (isUndefined(email) || !isValidString(email) ||
        isUndefined(password) || !isValidString(password)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    if(!isValidEmail(email)){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.EMAIL_NOT_RULE}`);
        return next(appError(400, ERROR_MESSAGES.EMAIL_NOT_RULE));
    };
    if(!isValidPassword(password)){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_NOT_RULE}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_NOT_RULE));
    };

    const userRepo = await dataSource.getRepository('User');
    const existUser = await userRepo.findOne({
        select: ['id', 'name', 'password', 'role'],
        where: { email }
    });
    logger.info(`使用者資料: ${JSON.stringify(existUser)}`)
    if(!existUser){
        logger.warn(ERROR_MESSAGES.USER_NOT_FOUND_OR_PASSWORD_FALSE);
        return next(appError(400,ERROR_MESSAGES.USER_NOT_FOUND_OR_PASSWORD_FALSE));
    };
    const isMatch = await bcrypt.compare(password, existUser.password);
    if(!isMatch){
        logger.warn(ERROR_MESSAGES.USER_NOT_FOUND_OR_PASSWORD_FALSE);
        return next(appError(400, ERROR_MESSAGES.USER_NOT_FOUND_OR_PASSWORD_FALSE));
    };
    
    const token = await generateJWT(
        { id: existUser.id, role: existUser.role }, config.get('secret.jwtSecret'), 
        { expiresIn: `${config.get('secret.jwtExpiresDay')}` }
    );
    res.status(201).json({
        status: 'success',
        data: {
            token,
            name: existUser.name
        }
    });
};
async function getUserProfile(req,res,next){
    const { id } = req.user;
    const user = await dataSource.getRepository('User').findOne({
        select: ['email', 'name'],
        where: { id }
    });
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
};
async function putUserProfile(req,res,next){
    const { id } = req.user;
    const { name } = req.body;
    if(isUndefined(name) || !isValidString(name)){
        logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const userRepo = await dataSource.getRepository('User');
    const user = await userRepo.findOne({
        select: ['id', 'name'],
        where: { id }
    });
    if(user.name === name){
        return next(appError(400, ERROR_MESSAGES.USER_NOT_CHANGE));
    };
    const updateUser = await userRepo.update(
        {
            id,
            name: user.name
        },
        {
            name
        }
    );
    if(updateUser.affected === 0){
        return next(appError(400, ERROR_MESSAGES.UPDATE_USER_FAILED));
    };

    res.status(200).json({
        status: 'success'
    });
};
async function getCreditPackage(req,res,next){
    const { id } = req.user;
    const creditPurchase = await dataSource.getRepository('CreditPurchase').find({
        select: {
            purchased_credits: true,
			price_paid: true,
			CreditPackage: { name: true },
			purchaseAt: true
        },
        relations: { CreditPackage: true },
        where: { user_id: id }
    });

    res.status(200).json({
        status: 'success',
        data: creditPurchase.map((creditPurchase) => {
            return{
                purchased_credits: creditPurchase.purchased_credits,
                price_paid: creditPurchase.price_paid,
                name: creditPurchase.CreditPackage.name,
                purchase_at: creditPurchase.purchaseAt
            }
        })
    });
};
async function getCoursesBooking(req,res,next){
    const { id } = req.user;
    const creditPurchaseRepo = await dataSource.getRepository('CreditPurchase');
    const courseBookingRepo = await dataSource.getRepository('CourseBooking');
    const totalCredit = await creditPurchaseRepo.sum('purchased_credits',{ user_id: id });
    const usedCredit = await courseBookingRepo.count({
        where: {
            user_id: id,
            cancelledAt: IsNull()
        }
    });
    const courseBookingList = await courseBookingRepo.find({
        select: {
            course_id: true,
            Course: {
                name: true,
                start_at: true,
                end_at: true,
                meeting_url: true,
                user_id: true
            }
        },
        where: { user_id: id },
        order: {
            Course: {
                start_at: 'ASC'
            }
        },
        relations: { Course: true }
    });

    const coachUserIdMap = {};
    if(courseBookingList.length > 0){
        courseBookingList.forEach((courseBooking) => {
            coachUserIdMap[courseBooking.Course.user_id] = courseBooking.Course.user_id;
        });
        const userRepo = await dataSource.getRepository('User');
        const coachUsers = await userRepo.find({
            select: ['id', 'name'],
            where: {
                id: In(Object.values(coachUserIdMap))
            }
        });
        coachUsers.forEach((user) => {
            coachUserIdMap[user.id] = user.name;
        });
        logger.debug(`courseBookingList: ${JSON.stringify(courseBookingList)}`);
        logger.debug(`coachUsers: ${JSON.stringify(coachUsers)}`);
    };

    res.status(200).json({
        status: 'success',
        data: {
            credit_remain: totalCredit- usedCredit,
            credit_usage: usedCredit,
            course_booking: courseBookingList.map((courseBooking) => {
                const now = new Date();
                const startAt = new Date(courseBooking.Course.start_at);
                const endAt = new Date(courseBooking.Course.end_at);
                let status = 'pending';
                if(startAt <= now && now <= endAt){
                    status = 'ongoing';
                }else if(endAt < now){
                    status = 'completed';
                };
                
                return {
                    name: courseBooking.Course.name,
                    course_id: courseBooking.course_id,
                    coach_name: coachUserIdMap[courseBooking.Course.user_id],
                    status,
                    start_at: courseBooking.Course.start_at,
                    end_at: courseBooking.Course.end_at,
                    metting_url: courseBooking.Course.meeting_url
                }
            })
        }
    });
};
async function putPassword(req,res,next){
    const { id } = req.user;
    const { password, new_password: newPassword, confirm_new_password: confirmNewPassword } = req.body;
    if (isUndefined(password) || !isValidString(password) ||
        isUndefined(newPassword) || !isValidString(newPassword) ||
        isUndefined(confirmNewPassword) || !isValidString(confirmNewPassword)){
            logger.warn(ERROR_MESSAGES.FIELDS_INCORRECT);
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };
    
    if(!isValidPassword(password) || !isValidPassword(newPassword) || !isValidPassword(confirmNewPassword)){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_NOT_RULE}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_NOT_RULE));
    };

    const userRepo = await dataSource.getRepository('User');
    const user = await userRepo.findOne({ 
        select: ['id', 'password'],
        where: { id }
    });

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_FALSE}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_FALSE));
    };

    if(password === newPassword){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_NEW_AND_OLD_NOT_SAME}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_NEW_AND_OLD_NOT_SAME));
    };

    if(newPassword !== confirmNewPassword){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.PASSWORD_NEW_AND_VERIFIEDNEW_NOT_SAME}`);
        return next(appError(400, ERROR_MESSAGES.PASSWORD_NEW_AND_VERIFIEDNEW_NOT_SAME));
    };

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    const updatePassword = await userRepo.update(
        {
            id
        },
        {
            password: hashPassword
        }
    );
    if(updatePassword.affected === 0){
        logger.warn(`建立使用者錯誤: ${ERROR_MESSAGES.UPDATE_PASSWORD_FAILED}`);
        return next(appError(400, ERROR_MESSAGES.UPDATE_PASSWORD_FAILED));
    };

    res.status(200).json({
        status: 'success',
        data: null
    });
};

module.exports = {
    postSignup,
    postLogin,
    getUserProfile,
    putUserProfile,
    getCreditPackage,
    getCoursesBooking,
    putPassword
};