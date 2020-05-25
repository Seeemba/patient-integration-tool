# Patients Integration Tool

Patients Integration Tool loads data from a CSV file to MongoDB, schedules email communications, and then executes automated tests to ensure all data and logic were processed correctly.

## Installation

Using npm:

```bash
$ npm install
```
Database Setup
```bash
This app uses MongoDB as its database service. So you can either install MongoDB locally or use appropriate service online.

Whatever option you choose, make sure you update MONGO_DB_URI variable.
```

## Usage
Run
```bash
$ MONGO_DB_URI="mongodb://localhost:27017/emrx" CSV_FILE_NAME="./data/patients.csv" BULK_RECORDS="1000" node index
```
Test
```bash
$ npm test
```
or
```bash
$ MONGO_DB_URI="mongodb://localhost:27017/emrx" CSV_FILE_NAME="./data/patients.csv" BULK_RECORDS="1000" npm test
```

## Parameters
```bash
MONGO_DB_URI="mongodb://localhost:27017/emrx" - connection string.
CSV_FILE_NAME="./data/patients.csv" - CSV data file.
BULK_RECORDS="1000" - size of the chunk of data to import the records in smaller portions.
```

## Contributing
Code reviews and Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

Thanks!

## License
[ISC](https://choosealicense.com/licenses/isc/)