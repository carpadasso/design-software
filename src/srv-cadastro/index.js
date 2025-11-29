const express = require('express');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001; // Porta do Serviço de Cadastro

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
const DB_FILE = path.join(DB_DIR, 'dados-cadastro.json');

// Garante criação do diretório e arquivo
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

// GET /cadastros - Listar todos
app.get('/cadastros', (req, res) => {
  const cadastros = lerBanco();
  // Boa prática: remover a senha antes de retornar a lista
  const cadastrosSafe = cadastros.map(({ senha, ...resto }) => resto);
  res.status(200).json(cadastrosSafe);
});

// GET /cadastros/:id - Buscar um (Usado pela Reserva para validar cliente)
app.get('/cadastros/:id', (req, res) => {
  const cadastros = lerBanco();
  const cadastro = cadastros.find(c => c.id === req.params.id);

  if (!cadastro) {
    return res.status(404).json({ error: 'Cadastro não encontrado.' });
  }

  // Remove senha do retorno por segurança
  const { senha, ...cadastroSafe } = cadastro;
  res.status(200).json(cadastroSafe);
});

// POST /cadastros - Criar novo
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
    senha // Em produção, usar hash
  };

  cadastros.push(novoCadastro);
  salvarBanco(cadastros);

  // Retorna sem a senha
  const { senha: _, ...cadastroRetorno } = novoCadastro;
  res.status(201).json(cadastroRetorno);
});

// PUT /cadastros/:id - Atualização
app.put('/cadastros/:id', (req, res) => {
  const cadastros = lerBanco();
  const index = cadastros.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Cadastro não encontrado.' });

  const { nome, email, cpf, senha, telefone } = req.body;

  // Atualiza dados, mantendo o ID
  cadastros[index] = {
    id: req.params.id,
    nome,
    email,
    cpf,
    telefone: telefone || "",
    senha: senha || cadastros[index].senha // Se não enviou senha nova, mantém a antiga
  };

  salvarBanco(cadastros);
  
  const { senha: _, ...cadastroRetorno } = cadastros[index];
  res.status(200).json(cadastroRetorno);
});

// DELETE /cadastros/:id
app.delete('/cadastros/:id', (req, res) => {
  let cadastros = lerBanco();
  const index = cadastros.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Cadastro não encontrado.' });

  cadastros.splice(index, 1);
  salvarBanco(cadastros);

  res.status(204).send();
});

// POST /login - Endpoint simples para simular autenticação
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const cadastros = lerBanco();
    
    const cadastro = cadastros.find(c => c.email === email && c.senha === senha);
    
    if (cadastro) {
        res.status(200).json({ 
            mensagem: "Login realizado com sucesso", 
            token: "fake-jwt-token-123", // Simulação de token
            id: cadastro.id,
            nome: cadastro.nome
        });
    } else {
        res.status(401).json({ error: "Credenciais inválidas" });
    }
});

app.listen(PORT, () => {
  console.log(`Serviço de Cadastro rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});