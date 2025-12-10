# BookMatch

Sistema de recomendação de leitura utilizando OrientDB (banco de dados NoSQL multi-modelo)

---

## Sumário
1. [Tecnologias utilizadas](#tecnologias-utilizadas)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Como utilizar a aplicação](#como-utilizar-a-aplicação)
4. [Endpoints da API](#endpoints-da-api)
5. [Autora](#autora)

---

## Tecnologias utilizadas
![Python](https://img.shields.io/badge/Python-262626?style=flat&logo=python&logoColor=blue)
![OrientDB](https://img.shields.io/badge/OrientDB-262626?style=flat&logo=orientdb&logoColor=orange)

---

## Estrutura do projeto

```bash
bookmatch/
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com.example.cardapio/
└── README.md                                             # Documentação do projeto
```

---

## Como utilizar a aplicação

### Pré-requisitos

- **Python 3.12** ou superior
- **OrientDB** container

### Configurar o banco de dados

1. Crie um container Docker com a imagem do OrientDB
```bash
docker run -d --name orientdb -p 2424:2424 -p 2480:2480 orientdb
```
2. 

### Clonar o repositório

```bash
git clone https://github.com/hellenilda/bookmatch-orientdb.git
cd bookmatch-orientdb
```

### Executar a aplicação
1. 
2.

A API estará disponível em `http://localhost:8080`

---

## Endpoints da API

### Listar 
### Criar
### Atualizar
### Remover
### Estrutura de resposta

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

---

# 1. Iniciar projeto Node.js
mkdir bookmatch-api && cd bookmatch-api
npm init -y

# 2. Instalar dependências principais
npm install express orientjs dotenv cors helmet
npm install -D nodemon

# 3. Iniciar OrientDB via Docker (ou download manual)
docker run -d --name orientdb-bookmatch \
  -p 2424:2424 -p 2480:2480 \
  -e ORIENTDB_ROOT_PASSWORD=root \
  orientdb:latest

# 4. Criar estrutura de pastas
mkdir routes controllers services models config