const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({path: './config.env'});

process.on('uncaughtException', (err) => {
    console.log(err.name, err.message);
    console.log('Uncaught Exception occured! Shutting down...');
    process.exit(1);
})

const app = require('./app');

// console.log(app.get('env'));
console.log(process.env);

mongoose.connect(process.env.CONN_STR, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then((conn) => {
    //console.log(conn);
    console.log('DB Connection Successful');
})

// .catch((error) => {
//     console.log('Some error has occured:', error);
// });

//CREATE A SERVER
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log('Server has started...')
})

process.on('unhandledRejection', (err) => {
     console.log(err.name, err.message);
     console.log('Unhandled rejection occured! Shutting down...');

     server.close(() => {
        process.exit(1);
     })
})
