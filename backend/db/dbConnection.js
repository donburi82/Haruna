const mongoose = require('mongoose');

const dbConnection = async (MongoURI) => {
  try {
    await mongoose.connect(MongoURI);
    console.log('db connected');
  } catch (error) {
    console.log('db connection failed');
    console.error(error);
  }
};

module.exports = { dbConnection };
