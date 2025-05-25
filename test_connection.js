const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔧 Testando conexão com MySQL na AWS...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);
  console.log('IP resolvido: 18.225.28.98');
  
  try {
    console.log('\n⏳ Tentando conectar (pode demorar até 60 segundos)...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Query teste executada:', rows);
    
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('✅ Bancos disponíveis:', databases.map(db => db.Database));
    
    await connection.end();
    console.log('✅ Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro de conexão:', error.message);
    console.error('❌ Código do erro:', error.code);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n🔍 PROBLEMA: Timeout de conexão');
      console.log('📋 Checklist para resolver:');
      console.log('');
      console.log('1. 🔒 AWS Security Groups:');
      console.log('   - Acesse: AWS Console → RDS → Databases → sallondb');
      console.log('   - Clique na aba "Connectivity & security"');
      console.log('   - Clique no Security Group');
      console.log('   - Aba "Inbound rules" deve ter:');
      console.log('     * Type: MySQL/Aurora');
      console.log('     * Port: 3306');
      console.log('     * Source: 0.0.0.0/0');
      console.log('');
      console.log('2. 🌐 Publicly accessible deve estar "Yes"');
      console.log('3. 🔥 Teste de outra rede para verificar firewall');
    }
  }
}

testConnection();