const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Configurações
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao banco
const db = require('./config/database');
db.connect().then(() => {
    console.log('📚 API conectada ao OrientDB!');
});

// Rotas
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Ver status do banco
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: db.db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Tratamento de erros
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor: http://localhost:${PORT}`);
    console.log(`📖 Documentação em: http://localhost:${PORT}/api-docs`);
});

module.exports = app;