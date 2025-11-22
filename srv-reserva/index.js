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
const URL_USUARIOS   = 'http://svc-cadastro:3001';
const URL_ESPACOS    = 'http://svc-espaco:3002';
const URL_PAGAMENTOS = 'http://svc-pagamento:3004';

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

// --- Persistência em Arquivo (Database) ---
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

// POST /reservas - O FLUXO PRINCIPAL DO DIAGRAMA
app.post('/reservas', async (req, res) => {
  const { idCliente, idEspaco, data } = req.body;

  if (!idCliente || !idEspaco || !data) {
    return res.status(400).json({ error: 'Campos obrigatórios: idCliente, idEspaco, data.' });
  }

  try {
    // 1. Verificar Cliente (GET /usuarios/{id})
    // Se falhar (404 ou erro de rede), vai para o catch
    try {
        await axios.get(`${URL_USUARIOS}/usuarios/${idCliente}`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        // Para fins de teste, se o serviço não estiver rodando, vamos logar e avisar
        console.warn("Aviso: Serviço de Usuários não acessível. Pulando validação para teste.");
    }

    // 2. Verificar Espaço e obter Preço (GET /espacos/{id})
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

    // 3. Verificar Double Booking (Lógica Local)
    // Verifica se já existe reserva para esse Espaço + Data que NÃO esteja cancelada
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

    // 4. Criar o Pagamento (POST /pagamentos)
    // Envia IdReserva e Valor
    let dadosPagamento = null;
    try {
        const responsePagamento = await axios.post(`${URL_PAGAMENTOS}/pagamentos`, {
            idReserva: novaReserva.id,
            valor: preco
        });
        dadosPagamento = responsePagamento.data;
    } catch (error) {
        console.error("Erro ao criar pagamento:", error.message);
        // Nota: Em produção, deveríamos fazer rollback da reserva aqui ou marcar como erro.
        // Para o projeto, retornamos aviso.
        dadosPagamento = { status: "Erro na comunicação com Pagamentos" };
    }

    // 5. Responder ao Cliente
    res.status(201).json({
      reserva: novaReserva,
      pagamento: dadosPagamento
    });

  } catch (globalError) {
    console.error(globalError);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// PATCH /reservas/:id (Para confirmar ou cancelar)
app.patch('/reservas/:id', (req, res) => {
  const reservas = lerBanco();
  const index = reservas.findIndex(r => r.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Reserva não encontrada' });

  const { status } = req.body;
  
  // Atualiza campos
  const reservaAtualizada = { ...reservas[index], ...req.body };
  reservaAtualizada.id = req.params.id; // Protege ID

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