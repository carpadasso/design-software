const express   = require('express');
const fs        = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml      = require('js-yaml');
const path      = require('path');
const crypto    = require('crypto');

const app = express();

// Porta do Serviço de Cadastro
const PORT = 3001;

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
const DB_FILE = path.join(DB_DIR, 'dados-cadastro.json');

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
// GET /cadastros - Listar todos os cadastros
// Respostas possíveis: 200 (OK)
app.get('/cadastros', (req, res) => {
  const cadastros = lerBanco();
  // Boa prática: remover a senha antes de retornar a lista
  const cadastrosSeguros = cadastros.map(({ senha, ...resto }) => resto);
  res.status(200).json(cadastrosSeguros);
});

// GET /cadastros/:id - Buscar um cadastro específico pelo ID
// (Usado pela Reserva para validar cliente)
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.get('/cadastros/:id', (req, res) => {
  const cadastros = lerBanco();
  const cadastro = cadastros.find(c => c.id === req.params.id);

  if (!cadastro) {
    return res.status(404).json({ error: 'Cadastro não encontrado.' });
  }

  // Remove senha do retorno por segurança
  const { senha, ...cadastroSeguro } = cadastro;
  res.status(200).json(cadastroSeguro);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// POST /cadastros - Criar novo cadastro
// Respostas possíveis: 201 (Criado com Sucesso), 400 (Bad Request), 409 (Já Existente)
app.post('/cadastros', (req, res) => {
  const { nome, email, cpf, senha, telefone } = req.body;

  // Validação simples
  if (!nome || !email || !cpf || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, cpf, senha.' });
  }

  const cadastros = lerBanco();

  // Verifica se Email ou CPF já existem
  const existe = cadastros.find(c => c.email === email || c.cpf === cpf);
  if (existe) {
    return res.status(409).json({ error: 'Email ou CPF já cadastrados.' });
  }

  const novoCadastro = {
    id: crypto.randomUUID(),
    nome,
    email,
    cpf,
    telefone: telefone || "",
    senha
  };

  cadastros.push(novoCadastro);
  salvarBanco(cadastros);

  // Retorna sem a senha
  const { senha: _, ...cadastroRetorno } = novoCadastro;
  res.status(201).json(cadastroRetorno);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// PUT /cadastros/:id - Atualização de um cadastro via ID
// Respostas possíveis: 200 (OK), 404 (Não Encontrado)
app.put('/cadastros/:id', (req, res) => {
  const cadastros = lerBanco();
  const index = cadastros.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Cadastro não encontrado.' });

  const { nome, email, cpf, senha, telefone } = req.body;
  const cadastroAntigo = cadastros[index];

  cadastros[index] = {
    id: req.params.id,
    nome: nome || cadastroAntigo.nome,
    email: email || cadastroAntigo.email,
    cpf: cpf || cadastroAntigo.cpf,
    telefone: telefone || cadastroAntigo.telefone,
    senha: senha || cadastroAntigo.senha
  };

  salvarBanco(cadastros);
  
  const { senha: _, ...cadastroRetorno } = cadastros[index];
  res.status(200).json(cadastroRetorno);
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// DELETE /cadastros/:id - Remove um cadastro pelo ID
// Respostas possíveis: 204 (OK sem Retorno), 404 (Não Encontrado)
app.delete('/cadastros/:id', (req, res) => {
  let cadastros = lerBanco();
  const index = cadastros.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Cadastro não encontrado.' });

  cadastros.splice(index, 1);
  salvarBanco(cadastros);

  res.status(204).send();
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

app.listen(PORT, () => {
  console.log(`Serviço de Cadastro rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});