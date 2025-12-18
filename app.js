const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// configurações
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// conexão com o banco
const db = require('./config/database');
db.connect().then(() => {
    console.log('📚 API conectada ao OrientDB!');
}).catch(err => {
    console.error('Falha ao conectar:', err);
    process.exit(1);
});

// Rotas principais
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: db.dbName ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// tratamentos
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
    });
});

// iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor: http://localhost:${PORT}`);
});

module.exports = app;