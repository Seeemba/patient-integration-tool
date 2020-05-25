'use strict';

/**
 * Patients Integration Tool application.
 * Logger component
 * @author Serhiy Posokhin
 * @version 1.0.0
 */

// node modules
var appRoot = require('app-root-path');
const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	// format: winston.format.json(),
	transports: [
		// - Write all logs with level `error` and below to `error.log`
		// - Write all logs with level `info` and below to `combined.log`
		new winston.transports.File({filename: `${appRoot}/logs/data-loader-error.log`, level: 'error', timestamp: true}),
		new winston.transports.File({filename: `${appRoot}/logs/data-loader.log`, timestamp: true})
	]
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if(process.env.NODE_ENV !== 'production'){
	logger.add(new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.cli(),
			winston.format.splat()
		)
	}));
}

module.exports = logger;