require('dotenv').config();

const express = require('express');
// const router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5050;

const { dbConnection } = require('./db/dbConnection');
const authRoute = require('./routes/auth/index.js');
const auth = require('./middleware/auth/index.js');
const homeRoute = require('./routes/home/index.js');

// router.use(express.json()); 
app.use(bodyParser.json());
app.use(cors());
app.use('/auth', authRoute);
app.use('/home', auth, homeRoute);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}.`);
  dbConnection(process.env.MongoURI);
});
