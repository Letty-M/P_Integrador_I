const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para testar conexão
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com banco de dados estabelecida');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error);
    return false;
  }
}

// Função para executar queries
async function executeQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('❌ Erro ao executar query:', error);
    throw error;
  }
}

// Função para executar queries que retornam um único resultado
async function executeQuerySingle(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows[0] || null;
  } catch (error) {
    console.error('❌ Erro ao executar query single:', error);
    throw error;
  }
}

// Função para iniciar transação
async function getTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

// Função para fechar pool
async function closePool() {
  try {
    await pool.end();
    console.log('🔌 Pool de conexões fechado');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeQuerySingle,
  getTransaction,
  closePool
};
