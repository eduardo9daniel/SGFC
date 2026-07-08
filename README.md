# Centro de Formação Darcy Ribeiro — Node.js + React

Sistema web completo para gerenciamento de formações continuadas, migrado de PHP para Node.js (Express) + React (Vite).

## Estrutura do Projeto

```
darcy_ribeiro/
├── backend/                  ← API REST em Node.js + Express
│   ├── src/
│   │   ├── config/db.js      ← Conexão MySQL (mysql2)
│   │   ├── middleware/auth.js ← Autenticação JWT
│   │   ├── routes/           ← auth, formacoes, inscricoes, frequencias, certificados, usuarios, relatorios
│   │   └── server.js         ← Ponto de entrada
│   ├── .env                  ← Variáveis de ambiente (edite antes de rodar)
│   └── package.json
│
├── frontend/                 ← SPA em React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── public/       ← Home, Login, Cadastro, ValidarCertificado
│   │   │   ├── admin/        ← Dashboard, Formações, Inscrições, Frequência, Certificados, Usuários, Relatórios, Logs
│   │   │   ├── coordenador/  ← Mesmo do admin (sem Usuários/Logs)
│   │   │   └── participante/ ← Dashboard, Formações, Inscrições, Frequência, Certificados, Perfil
│   │   ├── components/       ← Sidebar, PainelLayout, ui.jsx, PublicLayout
│   │   ├── context/          ← AuthContext (JWT), ToastContext
│   │   ├── api.js            ← axios com interceptor de token
│   │   └── App.jsx           ← Roteamento React Router v6
│   └── package.json
│
└── banco_de_dados.sql        ← Script MySQL
```

## Pré-requisitos

- Node.js 18+ e npm
- MySQL 8.0+ ou MariaDB 10.6+

## Instalação

### 1. Banco de Dados

```bash
mysql -u root -p < banco_de_dados.sql
```

Credenciais admin padrão: admin@centroformacao.edu.br / password
ALTERE após o primeiro acesso!

### 2. Backend

```bash
cd backend
npm install

# Edite o .env se necessário (DB_USER, DB_PASS, JWT_SECRET)

npm run dev      # desenvolvimento
npm start        # produção
```

API rodando em: http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App rodando em: http://localhost:5173

## Variáveis de Ambiente (backend/.env)

PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=centro_formacao_darcy_ribeiro
JWT_SECRET=darcy_ribeiro_jwt_secret_2024   ← MUDE EM PRODUÇÃO!
JWT_EXPIRES_IN=2h
CERT_MIN_FREQUENCIA=75

## Perfis de Acesso

- Admin: /admin/* — acesso total
- Coordenador: /coordenador/* — formações, frequência, certificados, relatórios
- Participante: /participante/* — inscrições, frequência própria, certificados

## Diferenças em relação à versão PHP

| Funcionalidade  | PHP              | Node.js + React             |
|-----------------|------------------|-----------------------------|
| Autenticação    | Sessions PHP     | JWT (Bearer Token)          |
| Backend         | PHP + PDO        | Express + mysql2            |
| Frontend        | PHP/HTML         | React + Vite (SPA)          |
| Hash senha      | password_hash    | bcryptjs                    |
| CSRF            | Token formulário | JWT stateless               |
