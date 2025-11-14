const express = require('express');
const axios = require('axios');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const path = require('path');
const app = express();

const PORT = 3004;

app.use(express.json());

const filePath = path.join(__dirname, 'database', 'dados-reserva.json')

function loadReservas(){
   const data = fs.readFileSync(filePath)
   return JSON.parse(data);
}

function saveReservas(reservas) {
  fs.writeFileSync(filePath, JSON.stringify(reservas, null, 2));
}

app.get('/reservas', (req, res) => {
   const reservas = loadReservas();
   res.json(reservas);
});

app.get('/reservas/:reservaId', (req, res) => {
   const reservas = loadReservas();
   const reserva = reservas.find(c => c.reservaId === Number(req.params.reservaId));
   if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada'});
   res.json(reserva);
});

app.post('/reservas', async (req, res) => {
   const { reservaId, dataReserva, valorReserva, statusReserva} = req.body;
   try {
      const resposta = await axios.get(`http://localhost:3001/cadastros/${usuarioId}`);
      
   } catch {
      
   }
});