const CustomError = require('./../Utilis/CustomError')

const devErrors = (res, error) => {
    res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
        stackTrace: error.stack,
        error: error
    });
}

const castErrorHandler = (err) => {
    const msg = `Invalid value for ${err.path}: ${err.value}!`
    return new CustomError(msg, 400);
}

const duplicateErrorHandler = (err) => {
    const name = err.keyValue.name;
    const msg = `There is already a movie with name ${name}. Please use another name!`;
    console.log(name);
    return new CustomError(msg, 400);
}

const validateErrorHandler = (err) => {
    const errors = Object.values(err.errors).map(val => val.message);
    const errorMessages = errors.join('. ');
    console.log(errorMessages)
    const msg = `Invalid input data: ${errorMessages}`;

    return new CustomError(msg, 400);
}

const handleExpiredJWT = (err) => {
    return new CustomError('JWT has expired. Please login again!', 401);
}

const handleJWTError = (err) => {
    return new CustomError('Invalid token. Please login again!', 401);
}

const prodErrors = (res, error) => {
    if(error.isOperational){
        res.status(error.statusCode).json({
            status: error.statusCode, 
            message: error.message,
        });
}else {
    res.status(500).json({
        status: 'error',
        message: 'Oops Something went wrong! Please try again later.'
    })
}
}

module.exports = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';

    if(process.env.NODE_ENV === 'development'){
        devErrors(res, error);
    } else if(process.env.NODE_ENV === 'production'){
         if(error.name === 'CastError'){
            error =  castErrorHandler(error);
         }
         if(error.code === 11000){
            error = duplicateErrorHandler(error);
         }
         if(error.name === 'ValidationError'){
            error = validateErrorHandler(error);
         }
         if(error.name === 'TokenExpiredError'){
            error = handleExpiredJWT(error);
         }
         if(error.name === 'JsonWebTokenError'){
            error = handleJWTError(error);
         }
         prodErrors(res, error);   
    }

    
}