// backend/server.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

const app = express();

// Middlewares
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(cors());         // Para habilitar CORS (Cross-Origin Resource Sharing)

// Configuração do Pool de Conexões com o Banco de Dados
const dbConfig = {
  connectionLimit: 10, // Número máximo de conexões no pool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Usa a porta do .env ou 3306 como padrão
  waitForConnections: true,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Testar a conexão com o banco de dados ao iniciar
pool.getConnection((err, connection) => {
  if (err) {
    console.error('------------------------------------------------------------');
    console.error('### ERRO AO CONECTAR AO BANCO DE DADOS ###');
    console.error('Mensagem:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Causa: A conexão com o servidor de banco de dados foi perdida.');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Causa: O servidor de banco de dados tem muitas conexões.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Causa: A conexão foi recusada. Verifique se o servidor de BD está rodando e acessível.');
      console.error(`Tentando conectar em: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Causa: Acesso negado. Verifique usuário/senha do banco de dados.');
      console.error(`Usuário: ${process.env.DB_USER}`);
    } else if (err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
        console.error('Causa: Hostname do banco de dados não encontrado ou inacessível.');
        console.error(`Verifique o endpoint: ${process.env.DB_HOST}`);
        console.error('Verifique também se o Security Group do RDS permite acesso do seu IP.');
    }
    console.error('------------------------------------------------------------');
    // Em um cenário de produção, você pode querer encerrar o app se o BD for crítico:
    // process.exit(1); 
    return;
  }
  if (connection) {
    connection.release(); // Libera a conexão de volta para o pool
    console.log('🎉 Conectado ao banco de dados MySQL com sucesso usando pool!');
  }
});

// Função auxiliar para executar queries (melhora tratamento de erro)
const executeQuery = (res, sql, params = []) => {
  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error(`Erro na query SQL: ${sql}`, err);
      // Não envie o `err` completo para o cliente em produção por segurança
      return res.status(500).json({ message: "Erro interno no servidor ao processar sua solicitação.", errorDetails: err.code });
    }
    return res.json(results);
  });
};


// Rota inicial de teste
app.get('/', (req, res) => {
  res.send('API do salão funcionando 🚀 Olá do Backend!');
});

// ======================= CLIENTES =======================
app.get('/clientes', (req, res) => {
  const sql = `SELECT DISTINCT id, nome, email, telefone FROM usuarios WHERE tipo = 'cliente' ORDER BY nome`;
  executeQuery(res, sql);
});

app.post('/clientes', (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome) { // Validação básica
    return res.status(400).json({ message: "O nome do cliente é obrigatório." });
  }
  const sql = "INSERT INTO usuarios (nome, email, telefone, tipo) VALUES (?, ?, ?, 'cliente')";
  pool.query(sql, [nome, email, telefone], (err, result) => {
    if (err) {
      console.error('Erro ao cadastrar cliente:', err);
      return res.status(500).json({ message: "Erro ao cadastrar cliente.", errorDetails: err.code });
    }
    res.status(201).json({ message: "Cliente cadastrado com sucesso!", insertId: result.insertId });
  });
});

// ======================= SERVIÇOS =======================
app.get('/servicos', (req, res) => {
  const sql = `SELECT DISTINCT id, nome, preco, duracao FROM servicos ORDER BY nome`;
  executeQuery(res, sql);
});

app.post('/servicos', (req, res) => {
  const { nome, preco, duracao } = req.body;
  if (!nome || preco === undefined || duracao === undefined) { // Validação básica
    return res.status(400).json({ message: "Nome, preço e duração são obrigatórios para o serviço." });
  }
  const sql = "INSERT INTO servicos (nome, preco, duracao) VALUES (?, ?, ?)";
  pool.query(sql, [nome, preco, duracao], (err, result) => {
    if (err) {
      console.error('Erro ao cadastrar serviço:', err);
      return res.status(500).json({ message: "Erro ao cadastrar serviço.", errorDetails: err.code });
    }
    res.status(201).json({ message: "Serviço cadastrado com sucesso!", insertId: result.insertId });
  });
});

// ======================= PROFISSIONAIS =======================
app.get('/profissionais', (req, res) => {
  // Esta query pode ser melhorada se você quiser os serviços que cada um faz.
  // Por ora, mantém a lógica original de listar nomes distintos.
  const sql = `SELECT DISTINCT id, nome FROM profissionais ORDER BY nome`;
  executeQuery(res, sql);
});
// Adicionar rota POST para /profissionais se necessário (não estava no original)

// ======================= AGENDAMENTOS =======================
app.post('/agendamentos', (req, res) => {
  const { id_cliente, id_servico, id_profissional, data_horario } = req.body;
  if (!id_cliente || !id_servico || !data_horario) { // Validação básica
      return res.status(400).json({ message: "Cliente, serviço e data/hora são obrigatórios." });
  }
  const sql = `
    INSERT INTO agendamentos (id_cliente, id_servico, id_profissional, data_horario, status)
    VALUES (?, ?, ?, ?, 'agendado') 
  `; // Adicionado status padrão
  pool.query(sql, [id_cliente, id_servico, id_profissional, data_horario], (err, result) => {
    if (err) {
      console.error('Erro ao criar agendamento:', err);
      return res.status(500).json({ message: "Erro ao criar agendamento.", errorDetails: err.code });
    }
    res.status(201).json({ message: "Agendamento criado com sucesso!", insertId: result.insertId });
  });
});

app.get('/agendamentos', (req, res) => {
  const sql = `
    SELECT 
        a.id, 
        u.nome AS cliente, 
        u.id AS id_cliente,
        s.nome AS servico, 
        s.id AS id_servico,
        p.nome AS profissional, 
        p.id AS id_profissional,
        a.data_horario, 
        a.status
    FROM agendamentos a
    INNER JOIN usuarios u ON a.id_cliente = u.id
    INNER JOIN servicos s ON a.id_servico = s.id
    LEFT JOIN profissionais p ON a.id_profissional = p.id
    ORDER BY a.data_horario ASC
  `;
  executeQuery(res, sql);
});

app.put('/agendamentos/cancelar/:id', (req, res) => {
  const { id } = req.params;
  const sql = "UPDATE agendamentos SET status = 'cancelado' WHERE id = ?";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Erro ao cancelar agendamento:', err);
      return res.status(500).json({ message: "Erro ao cancelar agendamento.", errorDetails: err.code });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Agendamento não encontrado." });
    }
    res.json({ message: "Agendamento cancelado com sucesso!" });
  });
});

app.put('/agendamentos/:id', (req, res) => {
  const { id } = req.params;
  const { id_cliente, id_servico, id_profissional, data_horario, status } = req.body;

  // Validar se os campos necessários existem.
  // Você pode querer uma validação mais robusta aqui.
  if (!id_cliente || !id_servico || !data_horario || !status) {
      return res.status(400).json({ message: "Campos incompletos para atualização." });
  }

  const sql = `
    UPDATE agendamentos SET
      id_cliente = ?,
      id_servico = ?,
      id_profissional = ?,
      data_horario = ?,
      status = ?
    WHERE id = ?
  `;
  pool.query(sql, [id_cliente, id_servico, id_profissional, data_horario, status, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar agendamento:', err);
      return res.status(500).json({ message: "Erro ao atualizar agendamento.", errorDetails: err.code });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Agendamento não encontrado para atualização." });
    }
    res.json({ message: "Agendamento atualizado com sucesso!" });
  });
});

// Buscar profissionais de um serviço específico
app.get('/servicos/:id_servico/profissionais', (req, res) => {
  const { id_servico } = req.params;
  const sql = `
    SELECT p.id, p.nome
    FROM profissionais p
    INNER JOIN servico_profissional sp ON p.id = sp.id_profissional
    WHERE sp.id_servico = ?
    ORDER BY p.nome
  `;
  // Assumindo que existe uma tabela 'servico_profissional' para mapear
  // quais profissionais realizam quais serviços. Se não existir, esta rota precisa ser adaptada.
  // Se a lógica for apenas listar todos os profissionais, use a rota /profissionais.
  executeQuery(res, sql, [id_servico]);
});



// Iniciar o servidor
const PORTA = process.env.PORT || 5000;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
  console.log(`   Acesse o teste inicial em http://localhost:${PORTA}/`);
});