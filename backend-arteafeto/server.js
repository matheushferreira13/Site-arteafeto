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

// Libera chamadas do frontend para este backend
app.use(cors());

// Permite receber JSON no body das requisicoes
app.use(express.json());

// Rota de teste simples para saber se o servidor subiu
app.get('/', (req, res) => {
  res.json({ message: 'Backend Arteafeto online.' });
});

// Todas as rotas de produtos ficam abaixo de /api
app.use('/api', produtosRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
