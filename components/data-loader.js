'use strict';

/**
 * Data loader component.
 * @author Serhiy Posokhin
 * @version 1.0.0
 */

// modules
const fs = require('fs');
const Promise = require('bluebird');

const _ = require('lodash');
const csv = require('csv-parser');
const moment = require('moment');

// models
const Email = require('../models/email');
const Patient = require('../models/patient');

// utils
const logger = require('../utils/logger');

class DataLoader {
    /**
     * Create a new instance of DataLoader.
     */
    constructor(data){
        if(_.isNil(data) ||
            _.isNil(data.fileName) ||
            _.isNil(data.numberOfBulkRecords)){
            throw new Error('Missing the required data.');
        }

        this.fileName = data.fileName; // CSV file name
        this.numberOfBulkRecords = data.numberOfBulkRecords; // size of the chunk of data
        this.numberOfEmails = 4; // number of emails that will be scheduled
        this.specialSeparator = '|'; // specify special separator
    }

    /**
     * Executes parsing and inserting data.
     *
     * @return {Promise} summary result.
     */
    execute(){
        // init
        let self = this;

        logger.log('info', 'DataLoader - starting.');
        return self.schedulePatientEmails();
    }

    /**
     * Schedule emails for every patient that has consent = 'Y'.
     *
     * @return {Promise<Array>} create requests.
     */
    async createEmails(patients){
        // init
        let self = this;

        let addEmails = [];
        for(let uPatient of patients){
            if(uPatient._id){
                // we need to get Patient.consent
                await Patient.findById(uPatient._id, (err, res) => {
                    if(err) throw err;
                    if(_.isEqual(res.consent, 'Y')){
                        for(let i = 1; i <= self.numberOfEmails; i++){
                            let newEmail = new Email(
                                {
                                    id: res._id, // patient id
                                    name: 'Day ' + i,
                                    scheduled_date: moment().add(i, 'days')
                                }
                            );
                            addEmails.push(newEmail.save());
                        }
                    }
                }).catch((error) => logger.log('error', error));
            }
        }
        return addEmails;
    }

    /**
     * Populate emails array for every patient.
     *
     * @return {Promise<Array>} update requests.
     */
    async populatePatientEmails(createdEmails){
        let populateEmails = [];
        for(let createdEmail of createdEmails) {

            let patientId = createdEmail.id;
            let filteredEmails = _.filter(_.clone(createdEmails), (email) => {
                return email.id === patientId;
            });

            populateEmails.push(Patient.updateOne({_id: createdEmail.id}, {
                emails: _.map(filteredEmails, '_id')
            }));
        }
        return populateEmails;
    }

    /**
     * Schedule Patient emails
     * 1) Parse CSV file and insert data into Patients collection
     * 2) Schedule emails for every patient in Emails collection
     *
     * @return {Promise}
     */
    schedulePatientEmails(){
        // init
        let self = this;

        // verbose
        logger.debug('DataLoader - start schedulePatientEmails.');

        return new Promise((resolve, reject) => {
            if(self.fileName){
                let headerRow;

                let countEmails = 0;
                let countPatients = 0;

                let patients = [];

                let csvStream = fs.createReadStream(self.fileName)
                    .pipe(csv({separator: self.specialSeparator}))
                    .on('headers', (headers) => {
                        logger.log('info', `Header row ${headers} `);
                        // get header from first row of the CSV file
                        headerRow = _.split(headers, ',');
                    })
                    .on('data', (data) => {
                        countPatients++

                        let updatePatient = _.fromPairs(_.map(headerRow, (column) => {
                            return [_.camelCase(column), data[column]];
                        }));

                        let newPatient =
                            {
                                updateOne: {
                                    filter: {
                                        memberId: data['Member ID']
                                    },
                                    update: updatePatient,
                                    upsert: true
                                }
                            };

                        patients.push(newPatient);
                        csvStream.pause(); // wait for the next chunk of data

                        if(patients.length === self.numberOfBulkRecords){
                            return Patient.bulkWrite(patients, (err, res) => {
                                logger.log('info', `${patients.length} patients have been successfully uploaded.`);

                                if(res.result.upserted){
                                    return Promise.all(self.createEmails(res.result.upserted))
                                        .then((emails) => {
                                            if(_.size(emails)){
                                                return Promise.all(self.populatePatientEmails(emails)).then(() => {
                                                    countEmails += emails.length;
                                                    logger.log('info', `on data ${emails.length} emails scheduled.`);
                                                    patients = [];
                                                    csvStream.resume();
                                                });
                                            }else{
                                                patients = [];
                                                csvStream.resume();
                                            }
                                        })
                                        .catch(err => logger.log('error', `Critical failure: ${err}`));
                                }
                                patients = [];
                                csvStream.resume();
                            });

                        }else{
                            csvStream.resume();
                        }
                    })
                    .on('end', () => {
                        if(countPatients){
                            return Patient.bulkWrite(patients, (err, res) => {
                                if(res.result.upserted){
                                    return Promise.all(self.createEmails(res.result.upserted))
                                        .then(async (emails) => {
                                            if(_.size(emails)){
                                                return Promise.all(self.populatePatientEmails(emails)).then(() => {
                                                    countEmails += emails.length;
                                                    logger.log('info', `${patients.length} patients have been successfully uploaded.`);
                                                    logger.log('info', `on end ${emails.length} emails scheduled.`);
                                                    logger.log('info', 'Data successfully loaded.');
                                                    logger.log('info', `Summary: ${countPatients} patients have been successfully uploaded, ${countEmails} emails scheduled.`);
                                                    patients = [];
                                                    resolve();
                                                });
                                            }

                                            logger.log('info', 'Data successfully loaded.');
                                            logger.log('info', `Summary: ${countPatients} patients have been successfully uploaded, ${countEmails} emails scheduled.`);
                                            resolve();
                                        })
                                        .catch(err => logger.log('error', `Critical failure: ${err}`));
                                }
                            });
                        }else{
                            reject(`The file ${self.fileName} is empty.`);
                        }
                    })
                    .on('error', (error) => {
                        reject(`Error in the read stream ${error}`);
                    });
            }
        });
    }
}

module.exports = DataLoader;