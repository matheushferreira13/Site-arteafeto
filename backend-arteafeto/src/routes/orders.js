import { Router } from 'express';
import {
  createOrderInExternalApi,
  listOrdersFromExternalApi,
  deleteOrderFromExternalApi
} from '../services/apiService.js';

const router = Router();

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const orders = await listOrdersFromExternalApi(authHeader);
    return res.status(200).json(orders);
  } catch (error) {
    const status = Number(error.status || 500);
    return res.status(status).json({
      message: error.message || 'Falha ao buscar pedidos.'
    });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const payload = req.body || {};
    const createdOrder = await createOrderInExternalApi(payload, authHeader);
    return res.status(201).json(createdOrder);
  } catch (error) {
    const status = Number(error.status || 500);
    return res.status(status).json({
      message: error.message || 'Falha ao criar pedido.'
    });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || '';
    if (!id) {
      return res.status(400).json({ message: 'ID do pedido e obrigatorio.' });
    }

    await deleteOrderFromExternalApi(id, authHeader);
    return res.status(204).send();
  } catch (error) {
    const status = Number(error.status || 500);
    return res.status(status).json({
      message: error.message || 'Falha ao excluir pedido.'
    });
  }
});

export default router;