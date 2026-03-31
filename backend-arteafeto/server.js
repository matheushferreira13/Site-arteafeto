import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import produtosRouter from './src/routes/produtos.js';
import authRouter from './src/routes/auth.js';
import ordersRouter from './src/routes/orders.js';

// Carrega variaveis do arquivo .env para o process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Libera chamadas do frontend para este backend.
// Em producao, Railway deve ter FRONTEND_URL configurado (ex: https://arteafetoconfeitaria.shop).
// Fallback abaixo e apenas para desenvolvimento local.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisicoes sem origin (ex: Postman, curl) apenas em dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem nao permitida pelo CORS'));
    }
  }
}));

// Permite receber JSON no body das requisicoes
app.use(express.json());

// Rota de teste simples para saber se o servidor subiu
app.get('/', (req, res) => {
  res.json({ message: 'Backend Arteafeto online.' });
});

// Health-check usado pelo Railway para monitorar o servico
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Todas as rotas de produtos ficam abaixo de /api
app.use('/api', produtosRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
