const express   = require('express');
const axios     = require('axios');
const fs        = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml      = require('js-yaml');
const path      = require('path');
const crypto    = require('crypto');

const app = express();

// Porta do Serviço de Pagamento
const PORT = 3004;

// URL do Serviço de Reservas para notificação.
const URL_RESERVAS = 'http://svc-reserva:3003';

app.use(express.json());

// --------------------------- Configuração Swagger ---------------------------
try {
  const fileContents = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8');
  const swaggerDocument = yaml.load(fileContents);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log(`Swagger disponível em http://localhost:${PORT}/docs`);
} catch (e) {
  console.error("Erro ao carregar openapi.yaml:", e);
}
// ----------------------------------------------------------------------------


// ------------------------ Arquivo de Banco de Dados -------------------------
const DB_DIR = path.join(__dirname, 'database');
const DB_FILE = path.join(DB_DIR, 'dados-pagamento.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');

// Função lerBanco(): Carrega o arquivo JSON inteiro em uma variável.
function lerBanco() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) { return []; }
}

// Função salvarBanco(): Salva a estrutura inteira do JSON de volta no arquivo,
// simulando a escrita dos dados em um Banco de Dados.
function salvarBanco(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf8');
}
// ----------------------------------------------------------------------------


// ============================================================================
// --------------------------   Rotas dos Serviços   --------------------------
// ============================================================================

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// GET /pagamentos - Lista todos os pagamentos
// Respostas possíveis: 200 (OK)
app.get('/pagamentos', (req, res) => {
  res.status(200).json(lerBanco());
});

// GET /pagamentos/:id - Lista um pagamento por ID
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.get('/pagamentos/:id', (req, res) => {
  const pagamentos = lerBanco();
  const pag = pagamentos.find(p => p.id === req.params.id);
  if (!pag) return res.status(404).json({ error: 'Pagamento não encontrado.' });
  res.status(200).json(pag);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// POST /pagamentos - Criação de um novo pagamento, usado pelo Serviço de Reservas
// Respostas possíveis: 201 (Criado com Sucesso), 400 (Bad Request)
app.post('/pagamentos', (req, res) => {
  const { idReserva, valor } = req.body;

  if (!idReserva || !valor) {
    return res.status(400).json({ error: 'idReserva e valor são obrigatórios.' });
  }

  const pagamentos = lerBanco();
  
  const novoPagamento = {
    id: crypto.randomUUID(),
    idReserva,
    valor,
    status: 'PENDENTE',
    dataCriacao: new Date().toISOString()
  };

  pagamentos.push(novoPagamento);
  salvarBanco(pagamentos);

  res.status(201).json(novoPagamento);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// POST /pagamentos/:id/confirmar - Adiciona a confirmação para o pagamento
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.post('/pagamentos/:id/confirmar', async (req, res) => {
  const pagamentos = lerBanco();
  const index = pagamentos.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Pagamento não encontrado.' });
  }

  // 1. Atualizar Pagamento Localmente
  const novoStatus = req.body.status || 'PAGO'; // Padrão 'PAGO' se não vier no body
  pagamentos[index].status = novoStatus;
  pagamentos[index].dataConfirmacao = new Date().toISOString();
  
  salvarBanco(pagamentos);

  const idReserva = pagamentos[index].idReserva;

  // 2. Notificar Serviço de Reservas (Comunicação Síncrona via REST)
  // Diagrama: SvcPagamentos -> SvcReservas : PATCH /reservas/{id_reserva}/status
  try {
    console.log(`Notificando Serviço de Reservas sobre pagamento da reserva ${idReserva}...`);
    
    // Nota: O Serviço de Reservas espera PATCH /reservas/:id com body { status: ... }
    await axios.patch(`${URL_RESERVAS}/reservas/${idReserva}`, {
      status: 'CONFIRMADA'
    });

    console.log('Serviço de Reservas notificado com sucesso.');

    res.status(200).json({
      mensagem: "Pagamento confirmado e Reserva atualizada.",
      pagamento: pagamentos[index]
    });

  } catch (error) {
    console.error("Erro ao notificar Serviço de Reservas:", error.message);
    res.status(200).json({
      mensagem: "Pagamento registrado, mas houve erro ao atualizar a reserva.",
      erroIntegracao: error.message,
      pagamento: pagamentos[index]
    });
  }
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

app.listen(PORT, () => {
  console.log(`Serviço de Pagamentos rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});