// index.js
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const syncController = require('./syncController');

app.use(cors());
app.use(express.json());

app.use('/api', syncController);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
