# HairSync – Sistema Inteligente de Agendamento e Gestão para Salões

Projeto desenvolvido como parte do **Projeto Integrador I** do curso de **Engenharia de Computação – UNIVESP** (2025).

---

## 📌 Sobre o Projeto

**HairSync** é uma aplicação web full stack desenvolvida com o objetivo de informatizar e otimizar o processo de agendamentos em salões de beleza. A solução foi baseada em um problema real identificado em um salão localizado em Itaquaquecetuba/SP, onde o processo de agendamento era realizado de forma manual, gerando conflitos de horário, desorganização e perda de dados.

---

## 🎯 Funcionalidades

- Cadastro de clientes, serviços e profissionais
- Agendamento com data e hora
- Edição e exclusão de agendamentos
- Listagem dinâmica de atendimentos
- Interface responsiva e intuitiva
- Associação lógica entre serviços e profissionais habilitados

---

## 🛠️ Tecnologias Utilizadas

### Frontend:
- HTML5
- CSS3
- JavaScript (vanilla)

### Backend:
- Node.js
- Express.js
- MySQL (AWS RDS)
- API RESTful
- Fetch API

### Hospedagem (prevista):
- Amazon EC2 (backend)
- Amazon S3 (frontend)

### Outros:
- Git & GitHub
- Visual Studio Code

---

## 📁 Estrutura do Projeto

```bash
P_Integrador_I/
├── backend/                 # 🧠 Lógica do servidor e API
│   ├── server.js            # Arquivo principal da aplicação (ponto de entrada)
│   ├── database.js          # Configuração da conexão com o banco MySQL
│   ├── init-database.js     # Script de criação e inicialização das tabelas
│   ├── test_connection.js   # Teste de conexão com o banco
│   ├── package.json         # Dependências do Node.js
│   └── package-lock.json    # Lockfile das dependências
│
├── frontend/                # 💅 Interface da aplicação
│   ├── index.html           # Página principal do sistema
│   ├── style.css            # Estilização visual
│   └── script.js            # Lógica de interação com a API
│
├── .vscode/                 # ⚙️ Configurações de ambiente (opcional)
│   └── settings.json        # Preferências do VS Code para o projeto
│
├── README.md                # 📄 Documentação do projeto
└── fotos e codigo.docx      # 📎 Documento auxiliar com prints e código

---

## 👩‍💻 Integrantes do Grupo

- Kenya Aparecida Alves  
- Letícia Vitória Lemes Moreira  
- Licínio das Neves Neto  
- Wellington Fabrício do Amaral Olah

---

## 📽️ Apresentação em Vídeo

Confira o vídeo completo da apresentação do projeto no YouTube:  
🔗 [https://youtu.be/lk6ijeoQR8M](https://youtu.be/lk6ijeoQR8M)

---

## 📚 Projeto Acadêmico

Desenvolvido para o Projeto Integrador I – UNIVESP  
Curso: Engenharia de Computação  
Ano: 2025  
Orientador: Prof. Filipe Cordeiro de Souza Algatão


