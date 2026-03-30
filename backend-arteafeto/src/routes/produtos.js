import { Router } from 'express';
import { getProdutosFromExternalApi } from '../services/apiService.js';

const router = Router();

// GET /api/produtos
// Chama o service que conversa com a API externa e devolve o resultado para o frontend
router.get('/produtos', async (req, res) => {
  try {
    const produtos = await getProdutosFromExternalApi();
    res.status(200).json(produtos);
  } catch (error) {
    console.error('Erro na rota /api/produtos:', error.message);
    res.status(500).json({
      message: 'Erro interno ao buscar produtos.'
    });
  }
});

export default router;
