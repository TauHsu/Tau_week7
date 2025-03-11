const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackageController');
const { isUndefined, isValidString, isValidInteger } = require('../utils/validUtils');
const appError = require('../utils/appError');
const ERROR_MESSAGES = require('../utils/errorMessages');

async function get(req,res,next){
    const creditPackage = await dataSource.getRepository('CreditPackage').find({
        select: ["id", "name", "credit_amount", "price"]
    });
    res.status(200).json({
        status: 'success',
        data: creditPackage
    });
};
async function post(req,res,next){
    const { name, credit_amount: creditAmount, price } = req.body;
    if (isUndefined(name) || !isValidString(name) || 
        isUndefined(creditAmount) || !isValidInteger(creditAmount) ||
        isUndefined(price) || !isValidInteger(price)){
            return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT));
    };

    const creditPackageRepo = await dataSource.getRepository('CreditPackage');
    const existCreditPackage = await creditPackageRepo.findOneBy({ name });
    if(existCreditPackage){
        return next(appError(409, ERROR_MESSAGES.DATA_REPEAT));
    };

    const newCreditPackage = await creditPackageRepo.create({
        name,
        credit_amount: creditAmount,
        price
    });
    const result = await creditPackageRepo.save(newCreditPackage);
    res.status(201).json({
        status: 'success',
        data: result
    });
};
async function postUserBuy(req,res,next){
    const { id } = req.user;
    const { creditPackageId } = req.params;
    const creditPackageRepo = await dataSource.getRepository('CreditPackage');
    const creditPackage = await creditPackageRepo.findOneBy({ id: creditPackageId });
    if(!creditPackage){
        return next(appError(400, ERROR_MESSAGES.ID_ERROR));
    };

    const creditPurchaseRepo = await dataSource.getRepository('CreditPurchase');
    const newCreditPurchase = await creditPurchaseRepo.create({
        user_id: id,
        credit_package_id: creditPackageId,
        purchased_credits: creditPackage.credit_amount,
        price_paid: creditPackage.price,
        purchaseAt: new Date().toISOString()
    });
    await creditPurchaseRepo.save(newCreditPurchase);
    res.status(200).json({
        status: 'success',
        data: null
    });
};
async function deletePackage(req,res,next){
    const { creditPackageId } = req.params;
    if(isUndefined(creditPackageId) || !isValidString(creditPackageId)){
        return next(appError(400, ERROR_MESSAGES.FIELDS_INCORRECT))
    };

    const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId);
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
    postUserBuy,
    deletePackage
};