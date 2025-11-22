const express = require('express');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001; // Porta esperada pelo serviço de Reservas

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

// GET /usuarios - Listar todos
app.get('/usuarios', (req, res) => {
  const usuarios = lerBanco();
  // Boa prática: remover a senha antes de retornar a lista
  const usuariosSafe = usuarios.map(({ senha, ...resto }) => resto);
  res.status(200).json(usuariosSafe);
});

// GET /usuarios/:id - Buscar um (Usado pela Reserva para validar cliente)
app.get('/usuarios/:id', (req, res) => {
  const usuarios = lerBanco();
  const usuario = usuarios.find(u => u.id === req.params.id);

  if (!usuario) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Remove senha do retorno por segurança
  const { senha, ...usuarioSafe } = usuario;
  res.status(200).json(usuarioSafe);
});

// POST /usuarios - Cadastro
app.post('/usuarios', (req, res) => {
  const { nome, email, cpf, senha, telefone } = req.body;

  // Validação simples
  if (!nome || !email || !cpf || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, cpf, senha.' });
  }

  const usuarios = lerBanco();

  // Verifica se Email ou CPF já existem
  const existe = usuarios.find(u => u.email === email || u.cpf === cpf);
  if (existe) {
    return res.status(409).json({ error: 'Email ou CPF já cadastrados.' });
  }

  const novoUsuario = {
    id: crypto.randomUUID(),
    nome,
    email,
    cpf,
    telefone: telefone || "",
    senha // Em um caso real, usaríamos bcrypt para hashear a senha aqui
  };

  usuarios.push(novoUsuario);
  salvarBanco(usuarios);

  // Retorna sem a senha
  const { senha: _, ...usuarioRetorno } = novoUsuario;
  res.status(201).json(usuarioRetorno);
});

// PUT /usuarios/:id - Atualização
app.put('/usuarios/:id', (req, res) => {
  const usuarios = lerBanco();
  const index = usuarios.findIndex(u => u.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const { nome, email, cpf, senha, telefone } = req.body;

  // Atualiza dados, mantendo o ID
  usuarios[index] = {
    id: req.params.id,
    nome,
    email,
    cpf,
    telefone: telefone || "",
    senha: senha || usuarios[index].senha // Se não enviou senha nova, mantém a antiga
  };

  salvarBanco(usuarios);
  
  const { senha: _, ...usuarioRetorno } = usuarios[index];
  res.status(200).json(usuarioRetorno);
});

// DELETE /usuarios/:id
app.delete('/usuarios/:id', (req, res) => {
  let usuarios = lerBanco();
  const index = usuarios.findIndex(u => u.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  usuarios.splice(index, 1);
  salvarBanco(usuarios);

  res.status(204).send();
});

// POST /login - Endpoint simples para simular autenticação
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const usuarios = lerBanco();
    
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);
    
    if (usuario) {
        res.status(200).json({ 
            mensagem: "Login realizado com sucesso", 
            token: "fake-jwt-token-123", // Simulação de token
            id: usuario.id,
            nome: usuario.nome
        });
    } else {
        res.status(401).json({ error: "Credenciais inválidas" });
    }
});

app.listen(PORT, () => {
  console.log(`Serviço de Usuários rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});