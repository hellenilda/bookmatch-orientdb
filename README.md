# BookMatch

Sistema de recomendação de leitura utilizando OrientDB (banco de dados NoSQL multi-modelo)

---

## Sumário
1. [Tecnologias utilizadas](#tecnologias-utilizadas)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Pré-requisitos](#pré-requisitos)
4. [Como utilizar a aplicação](#como-utilizar-a-aplicação)
5. [Endpoints da API](#endpoints-da-api)
6. [Autora](#autora)

---

## Tecnologias utilizadas
![Node.js](https://img.shields.io/badge/Node.js-262626?style=flat&logo=node.js&logoColor=green)
![Express](https://img.shields.io/badge/Express-262626?style=flat&logo=express&logoColor=white)
![OrientDB](https://img.shields.io/badge/OrientDB-262626?style=flat&logo=orientdb&logoColor=orange)

---

## Estrutura do projeto

```bash
bookmatch-orientdb/
│
├── app.js                      # Arquivo principal da aplicação
├── package.json                # Dependências do projeto
├── .env                        # Variáveis de ambiente
├── README.md                   # Documentação do projeto
│
├── config/
│   └── database.js             # Configuração do OrientDB
│
├── controllers/
│   ├── bookController.js       # Lógica dos endpoints de livros
│   └── userController.js       # Lógica dos endpoints de usuários
│
├── models/
│   ├── BookModel.js            # Modelo para operações com livros
│   └── UserModel.js            # Modelo para operações com usuários
│
├── routes/
│   ├── bookRoutes.js           # Rotas da API de livros
│   └── userRoutes.js           # Rotas da API de usuários
│
└── services/
    └── recommendationService.js # Serviço de recomendações com algoritmo de grafo
```

---

## Pré-requisitos

- **Node.js 14.0** ou superior
- **npm** (incluso com Node.js)
- **Docker** (para executar OrientDB)

---

## Como utilizar a aplicação

### 1. Clonar o repositório

```bash
git clone https://github.com/hellenilda/bookmatch-orientdb.git
cd bookmatch-orientdb
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o banco de dados

#### Opção A: Usar Docker (recomendado)

```bash
docker run -d --name orientdb-bookmatch \
  -p 2424:2424 -p 2480:2480 \
  -e ORIENTDB_ROOT_PASSWORD=root \
  orientdb:latest
```

#### Opção B: Instalar localmente
- Faça download em [orientdb.com](https://orientdb.com/download)
- Siga as instruções de instalação do site

### 4. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=2424
DB_USER=root
DB_PASSWORD=root
```

### 5. Executar a aplicação

#### Modo desenvolvimento
```bash
npm run dev
```

#### Modo produção
```bash
npm start
```

A API estará disponível em `http://localhost:3000`

---

## Endpoints da API

### Health Check
- **GET** `/health` - Verifica o status da API e conexão com o banco

### Livros
- **GET** `/api/books` - Lista todos os livros com paginação e filtros
  - Query params: `genre`, `author`, `page`, `limit`
- **POST** `/api/books` - Cria um novo livro
  - Body: `{ isbn, title, author, description, pageCount, publishedDate, genres }`
- **GET** `/api/books/:isbn` - Obtém detalhes de um livro específico
- **PUT** `/api/books/:isbn` - Atualiza informações de um livro
- **DELETE** `/api/books/:isbn` - Remove um livro
- **GET** `/api/books/:isbn/similar` - Obtém livros similares baseado em gêneros
  - Query params: `limit`

### Usuários
- **GET** `/api/users` - Lista todos os usuários
- **POST** `/api/users` - Cria um novo usuário
- **GET** `/api/users/:userId` - Obtém detalhes de um usuário
- **PUT** `/api/users/:userId` - Atualiza informações do usuário
- **DELETE** `/api/users/:userId` - Remove um usuário
- **POST** `/api/users/:userId/rate/:isbn` - Avalia um livro
- **GET** `/api/users/:userId/recommendations` - Obtém recomendações personalizadas

### Estrutura de resposta padrão

**Sucesso (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }
}
```

**Erro (4xx/5xx):**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

---

## Autora

<table>
    <tr>
        <td align="center">
            <a href="https://github.com/hellenilda">
                <img src="https://avatars.githubusercontent.com/u/109177631?v=4" width="100px;" alt="Hellen Araújo"/><br>
                <sub>
                    <b>Hellen Araújo</b>
                </sub>
            </a>
        </td>
    </tr>
</table>