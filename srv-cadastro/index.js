const express = require('express');
const axios = require('axios');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const path = require('path');
const app = express();

const PORT = 3001;

app.use(express.json());

const filePath = path.join(__dirname, 'database', 'dados-cadastro.json')