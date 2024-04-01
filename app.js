//IMPORT PACKAGE
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const moviesRouter = require('./Routes/moviesRoutes.js');
const authRouter = require('./Routes/authRouter.js')
const CustomError = require('./Utilis/CustomError.js');
const globalErrorHandler = require('./Controllers/errorController.js')
const userRoute = require('./Routes/userRoute.js')

let app = express();

app.use(helmet());

let limiter = rateLimit({
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: 'We have received too many request from this IP. Please try after one hour.'
});

app.use('/api', limiter);

// const logger = function(req, res, next){
//     console.log('Custom middleware called');
//     next();

// }

app.use(express.json({limit: '10kb'}));

app.use(sanitize());
app.use(xss());
app.use(hpp({whitelist: ['duration','ratings', 'releaseYear', 'releaseDate', 'genres', 'directors', 'actors', 'price']}));
// if(process.env.NODE_ENV === 'development'){
//     app.use(morgan('dev'))
// }

// app.use(express.static('./public'))
// app.use(logger);
// app.use((req, res, next) => {
//     req.requestedAt = new Date().toISOString();
//     next();
// })


//GET - api/v1/movies
// app.get('/api/v1/movies', getAllMovies);
// app.get('/api/v1/movies/:id', getMovie);
// app.post('/api/v1/movies', createMovie)
// app.patch('/api/v1/movies/:id', updateMovie)
// app.delete('/api/v1/movies/:id', deleteMovie)

// const moviesRouter = express.Router();

// moviesRouter.route('/')
//     .get(getAllMovies)
//     .post(createMovie)

// moviesRouter.route('/:id')
//     .get(getMovie)
//     .patch(updateMovie)
//     .delete(deleteMovie)

app.use('/api/v1/movies', moviesRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/user', userRoute)
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on the server!`
    // });
    // const err = new Error(`Can't find ${req.originalUrl} on the server!`);
    // err.status = 'fail';
    // err.statusCode = 404;

    const err = new CustomError(`Can't find ${req.originalUrl} on the server!`, 404)
    next(err);
});

//Global Error Handling Middleware 
app.use(globalErrorHandler);

module.exports = app;