'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const patientSchema = new Schema(
	{
		programIdentifier: String,
		dataSource: String,
		cardNumber: String,
		memberId: {
			type: String,
			index: true
		},
		firstName: String,
		lastName: String,
		dateOfBirth: String, // TODO: change to Data type if needed
		address1: String,
		address2: String,
		city: String,
		state: String,
		zipCode: String,
		telephoneNumber: String,
		emailAddress: String,
		consent: String, // TODO: change to Boolean data type if needed
		mobilePhone: String,
		emails: [{type: Schema.Types.ObjectId, ref: 'Email'}]
	},
	{
		timestamps: true,
		versionKey: false
	}
);

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;