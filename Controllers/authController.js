const User = require('./../Models/userModel');
const asyncErrorHandler = require('./../Utilis/asyncErrorHandler');
const jwt = require('jsonwebtoken');
const CustomError = require('./../Utilis/CustomError');
const util = require('util');
const sendEmail = require('./../Utilis/email');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign({id}, process.env.SECRET_STR, {
        expiresIn: process.env.LOGIN_EXPIRES
    })
}

const createSendResponse = (user, statusCode, res) => {
    const token = signToken(user._id);

    const options = {
        maxAge: process.env.LOGIN_EXPIRES,
        httpOnly: true
    }

    if(process.env.NODE_ENV === 'production')
        options.secure = true;

    res.cookie('jwt', token, options);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}

exports.signup = asyncErrorHandler(async (req, res, next) => {
    const newUser = await User.create(req.body);
    createSendResponse(newUser, 201, res);
});


exports.login = asyncErrorHandler(async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    //Check if email & password is present in request body
    if(!email || !password){
        const error = new CustomError('Please provide email ID & Password for login in!', 400);
        return next(error);
    }

    //Check if user exists with given email
    const user = await User.findOne({ email }).select('+password');

    //const isMatch = await user.comparePasswordInDb(password, user.password);

    //check if the user exists & password matches
    if(!user || !(await user.comparePasswordInDb(password, user.password))){
        const error = new CustomError('Incorrect email or password', 400);
        return next(error);
    }

    const token = signToken(user._id);

    createSendResponse(user, 200, res);
})




exports.protect = asyncErrorHandler(async (req, res, next) => {
    //1. Read the token &  check if it exist
    const testToken = req.headers.authorization
    let token;
    if(testToken && testToken.startsWith('Bearer')){
        token = testToken.split(' ')[1];
    }
    if(!token){
        next(new CustomError('You are not logged in!', 401))
    }

    //2. validate the token
    const decodedToken = await util.promisify(jwt.verify)(token, process.env.SECRET_STR);

    console.log(decodedToken);

    //3.  If the user exists
    const user = await User.findById(decodedToken.id);

    if(!user){
        next(new CustomError('The user with given token does not exist', 401))
    }

    const isPasswordChanged = await user.isPasswordChanged(decodedToken.iat);
    //4. If the user changed password after the token was issued
    if(isPasswordChanged){
        const error = new CustomError('The password has been changed recently. Please login again', 401)
        return next(error);
    };

    //5. Allow user to access route
    req.user = user;
    next();
})


exports.restrict = (role) => {
    return (req, res, next) => {
        if(req.user.role !== role){
            const error = new CustomError('You do not have permission to perform this action', 403);
            return next(error)
        }
        next();
    }
}


//for multiple roles for action
// exports.restrict = (...role) => {
//     return (req, res, next) => {
//         if(!role.includes(req.user.role)){
//             const error = new CustomError('You do not have permission to perform this action', 403);
//             return next(error)
//         }
//         next();
//     }
// }

exports.forgotPassword = asyncErrorHandler(async(req, res, next) => {
    //1. GET USER BASED ON POSTED EMAIL
    const user = await User.findOne({email: req.body.email});

    if(!user){
        const error = new CustomError('We could not find the user with given email', 404);
        next(error);
    }

    //2. GENERATE A RANDOM RESET TOKEN
    const resetToken = user.createResetPasswordToken();

    await user.save({validateBeforeSave: false});

    //3. SEND THE TOKEN BACK TO THE USER EMAIL
    const reseturl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = `We have recieved a password reset request. Please use the below link to reset your passowrd\n\n${reseturl}\n\nThis reset password link will be valid only for 10 minutes`

    try{
        await sendEmail({
            email: user.email,
            subject: 'Password change request received',
            message: message
        });

        res.status(200).json({
            status: "success",
            message: 'Password reset link send to the user email'
        })

    }catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined
        user.save({validateBeforeSave: false});

        return next(new CustomError('There was an error sending password reset email. Please try again later!', 500));
    }

    
})

exports.resetPassword = asyncErrorHandler(async (req, res, next) => {
    //1. IF THE USER EXISTS WITH THE GIVEN TOKEN & TOKEN HAS NOT EXPIRED
    const token = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({passwordResetToken: token, passwordResetTokenExpires: {$gt: Date.now()}});

    if(!user){
        const error = new CustomError('Token is invalid or has expired!', 400);
        next(error);
    }

    //2. RESETTING THE USER PASSWORD
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = Date.now()

    user.save();

    //3. LOGIN THE USER
    createSendResponse(user, 200, res);
});

