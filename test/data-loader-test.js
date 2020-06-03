'use strict';
/* eslint-disable no-unused-expressions */

/**
 * Patients Integration Tool application.
 * Data Loader Tests
 *
 * @author Serhiy Posokhin
 * @version 1.0.0
 */

// modules
const fs = require('fs');
const Promise = require('bluebird');

const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

const _ = require('lodash');
const csv = require('csv-parser');
const moment = require('moment');

const Email = require('../models/email');
const Patient = require('../models/patient');

// database
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const numberOfBulkRecords = parseInt(process.env.BULK_RECORDS) || 1000;
const csvFileName = process.env.CSV_FILE_NAME;
const mongoDbUri = process.env.MONGO_DB_URI;

const connectOptions = {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
};

const specialSeparator = '|';

// utils
const logger = require('../utils/logger');

describe('Data Loader - Tests ', () => {
    let headerRow;
    let db;
    let countRows;
    let rows;

    before(async () => {
        countRows = 0;
        rows = [];
        await mongoose.connect(mongoDbUri, connectOptions, (err, res) => {
            if (err) {
                logger.log('error', err);
                process.exit(1);
            }
        });
        db = mongoose.connection;
    });

    after(() => {
        if(db) {
            db.close();
        }
    });

    it('should data in the CSV file match the data in Patients collection', (done) => {
        // read csv file
        let stream = fs.createReadStream(csvFileName);
        // use csv-parser; specify special separator
        let csvStream = csv({separator: specialSeparator})
            .on('headers', (headers) => {
                logger.log('info', `Header row ${headers} `);
                headerRow = _.split(headers, ',');
            })
            .on('data', async (data) => {
                countRows++
                let newPatient = _.fromPairs(_.map(headerRow, (column) => {
                    return [_.camelCase(column), data[column]];
                }));

                rows.push(newPatient);
                csvStream.pause(); // wait for the next chunk of data

                if(rows.length === numberOfBulkRecords){
                    return Promise.all(rows.map(async row => {
                        row = await Patient.exists(row);
                        return row;
                    })).then((result) => {
                        expect(_.every(result)).to.be.true;
                        rows = [];
                        csvStream.resume();
                    }).catch(error => {
                        throw error;
                    });
                }else{
                    csvStream.resume();
                }
            })
            .on('end', async () => {
                if(countRows){
                    return Promise.all(rows.map(row => {
                        return Patient.exists(row).catch((error => {
                            done(error);
                        }));
                    })).then((result) => {
                        // all data in the CSV file matches the data in Patients collection
                        expect(_.every(result)).to.be.true;
                        rows = [];
                        done();
                    }).catch(error => {
                        done(error);
                    });
                }
            })
            .on('error', (error) => {
                logger.log('error', `Error in the read stream ${error} `);
            });

        return stream.pipe(csvStream);
        // done();
    });

    it('Print out all Patient IDs where the first name is missing', (done) => {
        Patient.find({firstName: ''}).then(result => {
            expect(result).to.be.an('array');
            result.forEach(value => {
               expect(value.firstName).to.be.eql('');
            });
            logger.log('info', `Patient IDs where the first name is missing: ${_.map(result, '_id').join(', ')}`);

            done();
        })
        .catch((error => {
            done(error);
        }))
    });

    it('Print out all Patient IDs where the email address is missing, but consent is Y', (done) => {
        Patient.find({emailAddress: '', consent: 'Y'}).then(result => {
            expect(result).to.be.an('array');
            result.forEach(value => {
                expect(value.emailAddress).to.be.eql('');
                expect(value.consent).to.be.eql('Y');
            });
            logger.log('info', `Patient IDs where the email address is missing, but consent is Y: ${_.map(result, '_id').join(', ')}`);
            done();
        })
        .catch((error => {
            done(error);
        }));
    });

    it('Verify Emails were created in Emails Collection for patients who have CONSENT as Y', (done) => {
        Patient
            .find({consent: 'Y'})
            .populate([{
                path:'emails',
                model:'Email'
            }])
            .exec()
            .then((data) => {
                expect(data).to.be.an('array');
                expect(data.length).to.be.at.least(1);
                data.forEach(patient => {
                    expect(patient.consent).to.be.eql('Y');
                    expect(patient.emails).to.be.an('array');
                    expect(patient.emails).to.have.length(4);
                });
                done();
            })
            .catch((error => {
                done(error);
            }));
    });

    it('Verify emails for each patient are scheduled correctly', (done) => {
        Patient
            .find({consent: 'Y'})
            .populate([{
                path:'emails',
                model:'Email'
            }])
            .exec()
            .then((data) => {
                data.forEach(patient => {
                    let whenScheduled = [];
                    let i = 1;
                    patient.emails.forEach(email => {
                        expect(email.id).to.be.eql(patient._id);
                        expect(email.name).to.be.eql('Day ' + i);
                        whenScheduled
                            .push(moment(new Date(email.scheduled_date))
                            .subtract(i, 'days') // the day when email was scheduled
                            .format('YYYY-MM-DD'));

                        i++;
                    })
                    expect(_.uniq(whenScheduled).length).to.be.eql(1);
                });
                done();
            })
            .catch((error => {
                done(error);
            }));
    });
});