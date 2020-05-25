'use strict';

/**
 * Patients Integration Tool application.
 * @author Serhiy Posokhin
 * @version 1.0.0
 */

// core modules
const fs = require('fs');

// third party modules
const _ = require('lodash');

// database modules
const mongoose = require('mongoose');

// components
const DataLoader = require('./components/data-loader');

// utils
const logger = require('./utils/logger');

// constants
// const env = process.env.NODE_ENV  || 'development';
const bulkRecords = parseInt(process.env.BULK_RECORDS) || 1000;
const csvFileName = process.env.CSV_FILE_NAME;
const mongoDbUri = process.env.MONGO_DB_URI;

const connectOptions = {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true
};

logger.log('info', 'Application start.');

// connect to db
logger.log('info', `Connecting to the database ${mongoDbUri}.`);
mongoose.connect(mongoDbUri, connectOptions).catch(error => {
	logger.error(error);
	throw error;
});

mongoose.connection.on('error', error => {
	throw new Error(`Couldn't connect to ${mongoDbUri} database. Mongoose initial connection error: ${error.message}`);
});

mongoose.connection.on('connected', () => {
	logger.log('info', 'Successfully established connection.');

	if(_.isEmpty(csvFileName)){
		logger.log('error', 'You should set the filename - process.env.CSV_FILE_NAME.');
		throw new Error('Insufficient parameter process.env.CSV_FILE_NAME');
	}
	// Check if the file exists
	fs.access(csvFileName, fs.constants.F_OK, (err) => {
		if(err){
			logger.log('error', `File ${csvFileName} does not exist.`);
			throw err;
		}

		logger.log('info', `File ${csvFileName} exists.`);
		// Parse and insert data
		return new DataLoader({
			fileName: csvFileName,
			numberOfBulkRecords: bulkRecords
		}).execute().then(result => {
			return result;
		}).catch((error => {
			logger.log('error', 'Data loading failure. Please resolve error(s) and execute it again.');
			return error;
		}));
	});
});

mongoose.connection.on('disconnected', () => {
	logger.log('info', 'Mongoose is disconnected.');
});

process.on('SIGINT', () => {
	mongoose.connection.close(() => {
		logger.log('info', 'Mongoose is disconnected due to application termination.');
	});
});
