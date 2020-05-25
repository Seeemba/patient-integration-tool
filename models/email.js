'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const emailSchema = new Schema(
	{
		id: {type: Schema.Types.ObjectId, ref: 'Patient'},
		name: String,
		scheduled_date: String
	},
	{
		timestamps: true,
		versionKey: false
	}
);

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;