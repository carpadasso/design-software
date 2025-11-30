const express   = require('express');
const axios     = require('axios');
const fs        = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml      = require('js-yaml');
const path      = require('path');
const crypto    = require('crypto');

const app = express();

// Porta do Serviço de Espaço
const PORT = 3002;

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
const DB_FILE = path.join(DB_DIR, 'dados-espaco.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '[]', 'utf8');
}

// Função lerBanco(): Carrega o arquivo JSON inteiro em uma variável.
function lerBanco() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao ler banco:", error);
    return [];
  }
}

// Função salvarBanco(): Salva a estrutura inteira do JSON de volta no arquivo,
// simulando a escrita dos dados em um Banco de Dados.
function salvarBanco(dados) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf8');
  } catch (error) {
    console.error("Erro ao salvar banco:", error);
  }
}
// ----------------------------------------------------------------------------


// ============================================================================
// --------------------------   Rotas dos Serviços   --------------------------
// ============================================================================

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// GET /espacos - Listar todos os espaços
// Respostas possíveis: 200 (OK)
app.get('/espacos', (req, res) => {
  const espacos = lerBanco();
  res.status(200).json(espacos);
});

// GET /espacos/:id - Lista os dados de um espaço pelo ID
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.get('/espacos/:id', (req, res) => {
  const espacos = lerBanco();
  const espaco = espacos.find(e => e.id === req.params.id);
  
  if (!espaco) {
    return res.status(404).json({ error: 'Espaço não encontrado.' });
  }
  
  res.status(200).json(espaco);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// POST /espacos - Criar novo espaço
// Respostas possíveis: 201 (Criado com Sucesso), 400 (Bad Request)
app.post('/espacos', (req, res) => {
  const { nome, capacidade, preco, fotos } = req.body;

  if (!nome || !capacidade || !preco) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, capacidade, preco.' });
  }

  const espacos = lerBanco();
  
  const novoEspaco = {
    id: crypto.randomUUID(),
    nome,
    capacidade,
    preco,
    fotos: fotos || []
  };

  espacos.push(novoEspaco);
  salvarBanco(espacos); // Persiste no arquivo

  res.status(201).json(novoEspaco);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// PUT /espacos/:id - Substitui um espaço existente
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.put('/espacos/:id', (req, res) => {
  const espacos = lerBanco();
  const index = espacos.findIndex(e => e.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Espaço não encontrado.' });
  }

  const { nome, capacidade, preco, fotos } = req.body;

  // Substitui o objeto mantendo o ID original
  espacos[index] = {
    id: req.params.id,
    nome,
    capacidade,
    preco,
    fotos: fotos || []
  };

  salvarBanco(espacos);
  res.status(200).json(espacos[index]);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// PATCH /espacos/:id - Altera um espaço existente
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.patch('/espacos/:id', (req, res) => {
  const espacos = lerBanco();
  const index = espacos.findIndex(e => e.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Espaço não encontrado.' });
  }

  // Atualiza apenas os campos enviados
  const espacoAtualizado = { ...espacos[index], ...req.body };
  // Garante que o ID não foi alterado
  espacoAtualizado.id = req.params.id;
  
  espacos[index] = espacoAtualizado;
  
  salvarBanco(espacos);
  res.status(200).json(espacoAtualizado);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// DELETE /espacos/:id - Remove um espaço existente
// Respostas possíveis: 204 (OK sem Retorno), 404 (Não Encontrado)
app.delete('/espacos/:id', (req, res) => {
  let espacos = lerBanco();
  const index = espacos.findIndex(e => e.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Espaço não encontrado.' });
  }

  espacos.splice(index, 1);
  salvarBanco(espacos);
  
  res.status(204).send();
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

app.listen(PORT, () => {
  console.log(`Serviço de Espaços rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});