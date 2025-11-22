const express = require('express');
const axios = require('axios');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3003;

// --- URLs dos Outros Microsserviços ---
// Atualizado: aponta para o serviço 'svc-cadastro' na porta 3001
const URL_CADASTRO = 'http://svc-cadastro:3001'; 
const URL_ESPACOS = 'http://svc-espacos:3002';
const URL_PAGAMENTOS = 'http://svc-pagamentos:3004';

app.use(express.json());

// --- Configuração Swagger ---
try {
  const fileContents = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8');
  const swaggerDocument = yaml.load(fileContents);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log(`Swagger disponível em http://localhost:${PORT}/docs`);
} catch (e) {
  console.error("Erro ao carregar openapi.yaml:", e);
}

// --- Persistência em Arquivo ---
const DB_DIR = path.join(__dirname, 'database');
const DB_FILE = path.join(DB_DIR, 'dados-reserva.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');

function lerBanco() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) { return []; }
}

function salvarBanco(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf8');
}

// --- Rotas ---

// GET /reservas
app.get('/reservas', (req, res) => {
  res.status(200).json(lerBanco());
});

// GET /reservas/:id
app.get('/reservas/:id', (req, res) => {
  const reserva = lerBanco().find(r => r.id === req.params.id);
  if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada' });
  res.status(200).json(reserva);
});

// POST /reservas
app.post('/reservas', async (req, res) => {
  const { idCliente, idEspaco, data } = req.body;

  if (!idCliente || !idEspaco || !data) {
    return res.status(400).json({ error: 'Campos obrigatórios: idCliente, idEspaco, data.' });
  }

  try {
    // 1. Verificar Cadastro do Cliente (Passo Atualizado)
    // Agora chama GET /cadastros/{id} no serviço svc-cadastro
    try {
        await axios.get(`${URL_CADASTRO}/cadastros/${idCliente}`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Cadastro do cliente não encontrado.' });
        }
        console.warn("Aviso: Serviço de Cadastro não acessível. Pulando validação para teste.");
    }

    // 2. Verificar Espaço e obter Preço
    let dadosEspaco;
    try {
        const responseEspaco = await axios.get(`${URL_ESPACOS}/espacos/${idEspaco}`);
        dadosEspaco = responseEspaco.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Espaço não encontrado.' });
        }
        return res.status(502).json({ error: 'Erro ao comunicar com Serviço de Espaços.' });
    }

    const preco = dadosEspaco.preco;

    // 3. Verificar Double Booking
    const reservas = lerBanco();
    const conflito = reservas.find(r => 
      r.idEspaco === idEspaco && 
      r.data === data && 
      r.status !== 'CANCELADA'
    );

    if (conflito) {
      return res.status(409).json({ error: 'Conflito: Este espaço já está reservado para esta data.' });
    }

    // Criar Reserva PENDENTE
    const novaReserva = {
      id: crypto.randomUUID(),
      idCliente,
      idEspaco,
      data,
      valor: preco,
      status: 'PENDENTE'
    };

    reservas.push(novaReserva);
    salvarBanco(reservas);

    // 4. Criar o Pagamento
    let dadosPagamento = null;
    try {
        const responsePagamento = await axios.post(`${URL_PAGAMENTOS}/pagamentos`, {
            idReserva: novaReserva.id,
            valor: preco
        });
        dadosPagamento = responsePagamento.data;
    } catch (error) {
        console.error("Erro ao criar pagamento:", error.message);
        dadosPagamento = { status: "Erro na comunicação com Pagamentos" };
    }

    res.status(201).json({
      reserva: novaReserva,
      pagamento: dadosPagamento
    });

  } catch (globalError) {
    console.error(globalError);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// PATCH /reservas/:id
app.patch('/reservas/:id', (req, res) => {
  const reservas = lerBanco();
  const index = reservas.findIndex(r => r.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Reserva não encontrada' });

  // Atualiza campos
  const reservaAtualizada = { ...reservas[index], ...req.body };
  reservaAtualizada.id = req.params.id; 

  reservas[index] = reservaAtualizada;
  salvarBanco(reservas);

  res.status(200).json(reservaAtualizada);
});

// DELETE /reservas/:id
app.delete('/reservas/:id', (req, res) => {
  let reservas = lerBanco();
  const index = reservas.findIndex(r => r.id === req.params.id);
  
  if (index === -1) return res.status(404).json({ error: 'Reserva não encontrada' });

  reservas.splice(index, 1);
  salvarBanco(reservas);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Serviço de Reservas rodando na porta ${PORT}`);
});