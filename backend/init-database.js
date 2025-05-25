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
  }
};

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL na AWS!');

    // Criar tabelas
    console.log('📋 Criando tabelas...');

    // Tabela de clientes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela clientes criada');

    // Tabela de serviços
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco DECIMAL(10,2) NOT NULL,
        duracao INT COMMENT 'Duração em minutos',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela servicos criada');

    // Tabela de profissionais
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profissionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela profissionais criada');

    // Tabela de relação profissional-serviços (muitos para muitos)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profissional_servicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profissional_id INT NOT NULL,
        servico_id INT NOT NULL,
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
        FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_profissional_servico (profissional_id, servico_id)
      )
    `);
    console.log('✅ Tabela profissional_servicos criada');

    // Tabela de agendamentos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        servico_id INT NOT NULL,
        profissional_id INT NOT NULL,
        data_horario DATETIME NOT NULL,
        status ENUM('agendado', 'confirmado', 'concluido', 'cancelado') DEFAULT 'agendado',
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servico_id) REFERENCES servicos(id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
      )
    `);
    console.log('✅ Tabela agendamentos criada');

    // Inserir dados iniciais
    console.log('📝 Inserindo dados iniciais...');

    // Clientes iniciais
    await connection.execute(`
      INSERT IGNORE INTO clientes (id, nome, email, telefone) VALUES
      (1, 'Maria Silva', 'maria@email.com', '(11) 99999-9999'),
      (2, 'João Santos', 'joao@email.com', '(11) 88888-8888'),
      (3, 'Ana Costa', 'ana@email.com', '(11) 77777-7777')
    `);

    // Serviços iniciais
    await connection.execute(`
      INSERT IGNORE INTO servicos (id, nome, preco, duracao) VALUES
      (1, 'Corte Feminino', 50.00, 60),
      (2, 'Escova', 35.00, 45),
      (3, 'Manicure', 25.00, 30),
      (4, 'Pedicure', 30.00, 40),
      (5, 'Corte Masculino', 25.00, 30),
      (6, 'Coloração', 80.00, 120),
      (7, 'Tratamento Capilar', 45.00, 90)
    `);

    // Profissionais iniciais
    await connection.execute(`
      INSERT IGNORE INTO profissionais (id, nome) VALUES
      (1, 'Carla Oliveira'),
      (2, 'Pedro Lima'),
      (3, 'Sofia Mendes'),
      (4, 'Juliana Santos')
    `);

    // Relacionar profissionais com serviços
    await connection.execute(`
      INSERT IGNORE INTO profissional_servicos (profissional_id, servico_id) VALUES
      (1, 1), (1, 2), (1, 6), (1, 7),  -- Carla: Corte Fem, Escova, Coloração, Tratamento
      (2, 1), (2, 5),                   -- Pedro: Corte Fem, Corte Masc
      (3, 3), (3, 4),                   -- Sofia: Manicure, Pedicure
      (4, 1), (4, 2), (4, 6)            -- Juliana: Corte Fem, Escova, Coloração
    `);

    // Agendamentos iniciais
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    await connection.execute(`
      INSERT IGNORE INTO agendamentos (id, cliente_id, servico_id, profissional_id, data_horario, status) VALUES
      (1, 1, 1, 1, ?, 'agendado'),
      (2, 2, 5, 2, ?, 'confirmado'),
      (3, 3, 3, 3, ?, 'agendado')
    `, [
      hoje.toISOString().slice(0, 19).replace('T', ' '),
      hoje.toISOString().slice(0, 19).replace('T', ' '),
      amanha.toISOString().slice(0, 19).replace('T', ' ')
    ]);

    console.log('✅ Dados iniciais inseridos com sucesso!');
    console.log('🎉 Banco de dados inicializado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

// Executar se o arquivo for chamado diretamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
