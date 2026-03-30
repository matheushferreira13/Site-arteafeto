import { Router } from 'express';
import { loginFromExternalApi, getAuthenticatedUserFromExternalApi } from '../services/apiService.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password sao obrigatorios.' });
    }

    const result = await loginFromExternalApi({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    const status = Number(error.status || 500);
    return res.status(status).json({
      message: error.message || 'Falha ao autenticar usuario.'
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader) {
      return res.status(401).json({ message: 'Token ausente no cabecalho Authorization.' });
    }

    const user = await getAuthenticatedUserFromExternalApi(authHeader);
    return res.status(200).json(user);
  } catch (error) {
    const status = Number(error.status || 500);
    return res.status(status).json({
      message: error.message || 'Falha ao validar sessao.'
    });
  }
});

export default router;