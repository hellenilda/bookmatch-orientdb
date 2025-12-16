# BookMatch

Sistema de recomendação de leitura utilizando OrientDB (banco de dados NoSQL multi-modelo).

---

## Sumário
1. [Tecnologias utilizadas](#tecnologias-utilizadas)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Pré-requisitos](#pré-requisitos)
4. [Como utilizar a aplicação](#como-utilizar-a-aplicação)
5. [Endpoints da API](#endpoints-da-api)
6. [Modelo de dados](#modelo-de-dados)
7. [Autora](#autora)

---

## Tecnologias utilizadas
![Node.js](https://img.shields.io/badge/Node.js-262626?style=flat&logo=node.js&logoColor=green)
![Express](https://img.shields.io/badge/Express-262626?style=flat&logo=express&logoColor=white)
![OrientDB](https://img.shields.io/badge/OrientDB-262626?style=flat&logo=orientdb&logoColor=orange)
![Axios](https://img.shields.io/badge/Axios-262626?style=flat&logo=axios&logoColor=5A29E4)

**Stack:**
- **Node.js** - Runtime JavaScript
- **Express 5.x** - Framework web
- **OrientDB 3.2** - Banco de dados grafo
- **Axios** - Cliente HTTP para comunicação com OrientDB
- **Nodemon** - Auto-reload em desenvolvimento

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
│   └── database.js             # Cliente HTTP do OrientDB (axios)
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

#### Usando Docker (recomendado)

```bash
docker run -d --name orientdb-bookmatch \
  -p 2424:2424 -p 2480:2480 \
  -e ORIENTDB_ROOT_PASSWORD=root \
  orientdb:latest
```

> **Nota:** A aplicação usa a porta **2480** (API HTTP) do OrientDB para maior estabilidade.

### 4. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=2424
DB_HTTP_PORT=2480
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

### 6. Verificar status

```bash
curl http://localhost:3000/health
```

---

## Endpoints da API

### Health Check
- **GET** `/health` - Verifica o status da API e conexão com o banco

**Resposta:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-15T12:00:00.000Z"
}
```

---

### 📚 Livros

#### Criar livro
- **POST** `/api/books`

**Body:**
```json
{
  "isbn": "978-0-123456-47-2",
  "title": "O Senhor dos Anéis",
  "author": "J.R.R. Tolkien",
  "description": "Uma épica aventura na Terra Média",
  "pageCount": 1216,
  "genres": ["Fantasia", "Aventura", "Épico"]
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "@rid": "#12:0",
    "isbn": "978-0-123456-47-2",
    "title": "O Senhor dos Anéis",
    "author": "J.R.R. Tolkien",
    "genres": ["Fantasia", "Aventura", "Épico"]
  }
}
```

#### Listar livros
- **GET** `/api/books?genre=Fantasia&author=Tolkien&page=1&limit=10`

#### Buscar livro específico
- **GET** `/api/books/:isbn`

#### Atualizar livro
- **PUT** `/api/books/:isbn`

**Body:**
```json
{
  "description": "Nova descrição",
  "pageCount": 1200
}
```

#### Deletar livro
- **DELETE** `/api/books/:isbn`

#### Buscar livros similares
- **GET** `/api/books/:isbn/similar?limit=5`

---

### 👤 Usuários

#### Criar usuário
- **POST** `/api/users`

**Body:**
```json
{
  "userId": "user001",
  "name": "João Silva",
  "email": "joao@example.com"
}
```

#### Listar usuários
- **GET** `/api/users?page=1&limit=10`

#### Buscar usuário específico
- **GET** `/api/users/:userId`

#### Atualizar usuário
- **PUT** `/api/users/:userId`

#### Deletar usuário
- **DELETE** `/api/users/:userId`

---

### ⭐ Avaliações

#### Avaliar um livro
- **POST** `/api/users/:userId/rate/:isbn`

**Body:**
```json
{
  "score": 5,
  "review": "Obra-prima da literatura fantástica!"
}
```

**Validação:** Score deve ser entre 1 e 5.

#### Listar avaliações do usuário
- **GET** `/api/users/:userId/ratings?limit=10`

#### Obter recomendações personalizadas
- **GET** `/api/users/:userId/recommendations?limit=10`

---

### Estrutura de resposta padrão

**Sucesso (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { 
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**Erro (4xx/5xx):**
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

---

## Modelo de dados

### Estrutura do Grafo

**Vértices:**
- `User` - Usuários do sistema
  - Propriedades: `userId`, `name`, `email`, `createdAt`
  
- `Book` - Livros disponíveis
  - Propriedades: `isbn`, `title`, `author`, `description`, `pageCount`, `publishedDate`, `genres[]`, `createdAt`

**Arestas:**
- `RATED` - Conecta usuário → livro
  - Propriedades: `score` (1-5), `review`, `createdAt`, `updatedAt`
  
- `SIMILAR_TO` - Conecta livro → livro
  - Propriedades: `similarity` (0-1), `createdAt`

### Exemplo de Query SQL do OrientDB

```sql
-- Buscar livros similares baseado em gêneros
SELECT FROM Book 
WHERE isbn != '978-0-123456-47-2'
AND genres CONTAINSANY ['Fantasia', 'Aventura']
ORDER BY in('RATED').size() DESC
LIMIT 5
```

---

## Arquitetura e Decisões Técnicas

### Por que API HTTP ao invés do driver binário?

A aplicação utiliza a **API REST HTTP** do OrientDB (porta 2480) ao invés do driver binário (porta 2424) pelos seguintes motivos:

**Maior estabilidade** - Sem problemas de autenticação com tokens  
**Mais fácil de debugar** - Pode testar queries com curl/Postman  
**Documentação mais clara** - API HTTP bem documentada  
**Melhor compatibilidade** - Funciona perfeitamente com OrientDB 3.x  

### Simplificações

- **Genres como array** - Ao invés de vértices separados, os gêneros são armazenados como array de strings no livro, reduzindo complexidade
- **Cliente HTTP customizado** - Classe `OrientDBHttpClient` encapsula toda comunicação com o banco
- **Sem transações complexas** - Operações diretas via SQL simplificam o código

---

## Exemplos de uso completo

### Fluxo típico de uso

```bash
# 1. Criar um usuário
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"user001","name":"João Silva","email":"joao@example.com"}'

# 2. Criar um livro
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"isbn":"978-0-123456-47-2","title":"O Senhor dos Anéis","author":"J.R.R. Tolkien","genres":["Fantasia","Aventura"]}'

# 3. Usuário avalia o livro
curl -X POST http://localhost:3000/api/users/user001/rate/978-0-123456-47-2 \
  -H "Content-Type: application/json" \
  -d '{"score":5,"review":"Incrível!"}'

# 4. Buscar avaliações do usuário
curl http://localhost:3000/api/users/user001/ratings

# 5. Obter recomendações personalizadas
curl http://localhost:3000/api/users/user001/recommendations?limit=5
```

---

## Troubleshooting

### Porta 2480 em uso
```bash
# Verificar o que está usando a porta
lsof -i :2480

# Parar o OrientDB
docker stop orientdb-bookmatch
```

### Banco não conecta
```bash
# Verificar se OrientDB está rodando
docker ps | grep orientdb

# Ver logs do OrientDB
docker logs orientdb-bookmatch

# Reiniciar container
docker restart orientdb-bookmatch
```

### Limpar dados e recomeçar
```bash
# Parar aplicação (Ctrl+C)
# Remover banco de dados
docker exec orientdb-bookmatch rm -rf /orientdb/databases/*
docker restart orientdb-bookmatch

# Reiniciar aplicação
npm run dev
```

---

## Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

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