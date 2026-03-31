# API MAPA - ARTEAFETO

Este arquivo e um guia rapido para entender como frontend e backend conversam no projeto.

## 1) Visao geral

- Frontend (Live Server): carrega telas em outra porta (ex.: 5500)
- Backend (Node/Express): responde API em http://localhost:3000
- Frontend usa fetch para chamar a API em localhost:3000/api

## 2) Mapa visual de rotas

```mermaid
flowchart TD
	A[Frontend - index.html / admin.html] --> B[API Base: /api]
	B --> C[/api/produtos]
	B --> D[/api/auth/login]
	B --> E[/api/auth/me]
	B --> F[/api/orders]
	F --> G[/api/orders/:id]
```

## 3) Onde cada rota e definida

- Prefixos de rota: server.js
	- /api
	- /api/auth
	- /api/orders
- Sufixos de rota:
	- src/routes/produtos.js
	- src/routes/auth.js
	- src/routes/orders.js

Regra mental:

- Caminho final = prefixo (server.js) + sufixo (arquivo de rota)

## 4) Endpoints completos

### Health check

- Metodo: GET
- URL: http://localhost:3000/
- Uso: confirmar se backend subiu

### Produtos

- Metodo: GET
- URL: http://localhost:3000/api/produtos
- Uso: lista catalogo de produtos

### Auth - login

- Metodo: POST
- URL: http://localhost:3000/api/auth/login
- Body JSON:

```json
{
	"email": "seu@email.com",
	"password": "sua_senha"
}
```

### Auth - usuario logado

- Metodo: GET
- URL: http://localhost:3000/api/auth/me
- Header obrigatorio:

```text
Authorization: Bearer SEU_TOKEN
```

### Orders - listar

- Metodo: GET
- URL: http://localhost:3000/api/orders
- Header opcional/recomendado: Authorization Bearer

### Orders - criar

- Metodo: POST
- URL: http://localhost:3000/api/orders
- Header: Content-Type application/json
- Body exemplo:

```json
{
	"cliente": "Maria",
	"data_entrega": "2026-04-05",
	"produto": "Ovos de Colher",
	"tamanho": "P",
	"sabor": "Ferrero rocher",
	"quantidade": 1,
	"cidade": "Lavras",
	"forma_pagamento": "Pix",
	"valor": 69.9
}
```

### Orders - deletar

- Metodo: DELETE
- URL: http://localhost:3000/api/orders/:id
- Exemplo: http://localhost:3000/api/orders/123

## 5) Como descobrir caminhos novos

Sempre siga este passo a passo:

1. Abrir server.js e ver os app.use("/prefixo", router)
2. Abrir cada arquivo em src/routes
3. Somar prefixo + sufixo
4. Conferir metodo HTTP (get/post/delete/etc)

## 6) Como testar rapido no PowerShell

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:3000/" | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing "http://localhost:3000/api/produtos" | Select-Object -ExpandProperty StatusCode
```

## 7) Variaveis importantes (.env)

- PORT
- FRONTEND_URL
- PRODUTOS_API_URL
- XANO_ORDER_POST_URL
- XANO_ORDER_LIST_URL
- XANO_LOGIN_URL
- XANO_ME_URL
- API_KEY (se necessario)

## 8) Deploy em producao: Railway + Cloudflare Pages

### Passos para subir o backend no Railway

1. No painel do Railway, va em **Settings > Variables** do servico do backend.
2. Defina as seguintes variaveis de ambiente:

| Variavel | Valor |
|---|---|
| `FRONTEND_URL` | `https://site-arteafeto.pages.dev` |
| `PORT` | (Railway preenche automaticamente) |
| `XANO_LOGIN_URL` | `https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/login` |
| `XANO_ME_URL` | `https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/me` |
| `XANO_ORDER_POST_URL` | `https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders_post` |
| `XANO_ORDER_LIST_URL` | `https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders` |

3. Apos definir as variaveis, o Railway fara redeploy automatico.
4. Verifique o health-check em `https://site-arteafeto-production.up.railway.app/api/health`.

> **Importante**: A variavel `FRONTEND_URL` e obrigatoria para que o CORS permita chamadas
> vindas do Cloudflare Pages. Sem ela o login e todos os fetches do painel admin serao bloqueados.

### Verificar se o backend esta acessivel

Abra no navegador ou Postman:

```
GET https://site-arteafeto-production.up.railway.app/api/health
```

Resposta esperada:

```json
{ "status": "ok", "uptime": 123.45 }
```

Se aparecer erro de rede ou CORS no console do navegador ao fazer login, o backend nao
esta ativo ou a variavel `FRONTEND_URL` nao esta configurada corretamente no Railway.

## 9) Erros comuns

- "Cannot GET /admin.html" em localhost:3000
	- Causa: backend API nao serve arquivo estatico
	- Solucao: abrir admin.html no Live Server

- "EADDRINUSE: address already in use 3000"
	- Causa: ja existe processo na porta 3000
	- Solucao: encerrar processo antigo e subir backend novamente

- CORS no navegador (desenvolvimento local)
	- Causa: frontend e backend em portas diferentes
	- Situacao atual: backend ja esta com cors() habilitado para localhost:5500

- Login com "Não foi possível conectar ao servidor" (producao)
	- Causa: variavel `FRONTEND_URL` nao configurada no Railway, ou backend offline
	- Solucao: definir `FRONTEND_URL=https://site-arteafeto.pages.dev` em Settings > Variables no Railway

## 10) Fluxo completo em 20 segundos

1. Usuario abre tela no Live Server.
2. JS da tela chama localhost:3000/api/...
3. Router recebe requisicao.
4. Service consulta dados (externo ou fallback).
5. API responde JSON.
6. Frontend renderiza dados.

