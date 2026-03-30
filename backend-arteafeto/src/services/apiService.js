import axios from 'axios';

const DEFAULT_ARTEAFETO_PRODUCTS = [
  {
    id: 'ovo-colher',
    nome: 'Ovos de Colher',
    categoria: 'ovos',
    precoInicial: 69.9,
    tamanhos: [
      { tamanho: 'P', preco: 69.9 },
      { tamanho: 'G', preco: 122.9 }
    ],
    sabores: [
      'Ferrero rocher',
      'Kinder bueno',
      'Ninho e nutela',
      'Ninho com geleia de morango',
      'Maracuja com chocolate',
      'Dois amores',
      'Brigadeiro',
      "Cookies n' cream",
      'Pistache',
      'Matilda',
      'Bolo de cenoura'
    ]
  },
  {
    id: 'kit-mini-confeiteiro',
    nome: 'Kit Mini Confeiteiro',
    categoria: 'kits',
    preco: 60
  },
  {
    id: 'caca-aos-ovos',
    nome: 'Caca aos Ovos',
    categoria: 'kits',
    preco: 35
  },
  {
    id: 'kit-degustacao',
    nome: 'Kit Degustacao',
    categoria: 'kits',
    preco: 50
  },
  {
    id: 'ovos-trufados',
    nome: 'Ovos Trufados',
    categoria: 'ovos',
    precoInicial: 89.9,
    tamanhos: [
      { tamanho: 'P', preco: 89.9 },
      { tamanho: 'G', preco: 135.9 }
    ],
    sabores: [
      'Ferreiro rocher',
      'Cocada',
      'Brigadeiro',
      'Maracuja',
      'Maracuja com chocolate',
      'Pistache de Dubai',
      "Cookies n' cream"
    ]
  },
  {
    id: 'ovos-tradicionais',
    nome: 'Ovos Tradicionais',
    categoria: 'ovos',
    preco: 60,
    sabores: ['Chocolate ao leite', 'Chocolate branco', 'Tipo kinder', 'Ao leite crocante']
  }
];

// Service responsavel por falar com API externa de produtos (quando configurada)
export async function getProdutosFromExternalApi() {
  const productsApiUrl = process.env.PRODUTOS_API_URL || '';

  // Se nao houver API externa configurada, usa catalogo local.
  if (!productsApiUrl) {
    return DEFAULT_ARTEAFETO_PRODUCTS;
  }

  try {
    const response = await axios.get(productsApiUrl, {
      // API KEY vem do .env, nunca hardcoded no codigo
      headers: {
        'X-API-KEY': process.env.API_KEY || ''
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    // Fallback para manter endpoint funcional mesmo se API externa cair.
    console.error(`Falha ao consultar API externa de produtos, usando fallback local: ${error.message}`);
    return DEFAULT_ARTEAFETO_PRODUCTS;
  }
}

const DEFAULT_XANO_ORDER_POST_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders_post';
const DEFAULT_XANO_ORDER_LIST_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders';
const DEFAULT_XANO_LOGIN_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/login';
const DEFAULT_XANO_ME_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/me';

function buildAuthHeaders(authHeader = '') {
  const headers = {};
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  return headers;
}

function normalizeExternalError(error, fallbackMessage) {
  if (!error || typeof error !== 'object') {
    return { status: 500, message: fallbackMessage };
  }

  const status = Number(error.response?.status || 500);
  const apiMessage = error.response?.data?.message;
  const message = typeof apiMessage === 'string' && apiMessage.trim()
    ? apiMessage
    : `${fallbackMessage}: ${error.message || 'erro desconhecido'}`;

  return { status, message };
}

export async function createOrderInExternalApi(payload, authHeader = '') {
  try {
    const url = process.env.XANO_ORDER_POST_URL || DEFAULT_XANO_ORDER_POST_URL;
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(authHeader)
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw normalizeExternalError(error, 'Falha ao enviar pedido para API externa');
  }
}

export async function listOrdersFromExternalApi(authHeader = '') {
  try {
    const url = process.env.XANO_ORDER_LIST_URL || DEFAULT_XANO_ORDER_LIST_URL;
    const response = await axios.get(url, {
      headers: {
        ...buildAuthHeaders(authHeader)
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw normalizeExternalError(error, 'Falha ao listar pedidos na API externa');
  }
}

export async function deleteOrderFromExternalApi(orderId, authHeader = '') {
  try {
    const baseUrl = process.env.XANO_ORDER_LIST_URL || DEFAULT_XANO_ORDER_LIST_URL;
    await axios.delete(`${baseUrl}/${encodeURIComponent(orderId)}`, {
      headers: {
        ...buildAuthHeaders(authHeader)
      },
      timeout: 10000
    });
  } catch (error) {
    throw normalizeExternalError(error, 'Falha ao excluir pedido na API externa');
  }
}

export async function loginFromExternalApi({ email, password }) {
  const url = process.env.XANO_LOGIN_URL || DEFAULT_XANO_LOGIN_URL;

  const attempts = [
    {
      headers: { 'Content-Type': 'application/json' },
      body: { email, password }
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ email, password }).toString()
    },
    {
      headers: { 'Content-Type': 'application/json' },
      body: { field_value: email, password }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      body: { login: email, senha: password }
    }
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const response = await axios.post(url, attempt.body, {
        headers: attempt.headers,
        timeout: 10000
      });

      const authToken = response.data?.authToken || response.data?.auth_token || response.data?.token;
      if (authToken) {
        return {
          ...response.data,
          authToken
        };
      }
    } catch (error) {
      lastError = error;
      const code = error.response?.data?.code;
      if (code !== 'ERROR_CODE_INPUT_ERROR') {
        break;
      }
    }
  }

  if (lastError) {
    throw normalizeExternalError(lastError, 'Falha ao autenticar na API externa');
  }

  throw { status: 401, message: 'Login invalido' };
}

export async function getAuthenticatedUserFromExternalApi(authHeader = '') {
  try {
    const url = process.env.XANO_ME_URL || DEFAULT_XANO_ME_URL;
    const response = await axios.get(url, {
      headers: {
        ...buildAuthHeaders(authHeader)
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw normalizeExternalError(error, 'Falha ao validar sessao na API externa');
  }
}
