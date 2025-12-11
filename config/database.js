const { Server, OrientDBClient } = require('orientjs');
require('dotenv').config();

class Database {
    constructor() {
        this.server = null;
        this.db = null;
    }

    async connect() {
        try {
            this.server = new Server({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 2424,
                username: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || 'root',
                useToken: true
            });

            // Criar ou conecta ao banco
            const dbName = 'BookMatch';
            const dbList = await this.server.list();
            
            if (!dbList.find(db => db.name === dbName)) {
                await this.server.create({
                    name: dbName,
                    type: 'graph',
                    storage: 'plocal'
                });
                console.log(`✅ Banco '${dbName}' criado!`);
            }

            this.db = this.server.use({
                name: dbName,
                username: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || 'root',
                useToken: true
            });

            console.log('✅ Conectado');
            await this.setupSchema();
            return this.db;
            
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            process.exit(1);
        }
    }

    async setupSchema() {
        // Cria classes (se não existirem)
        const classes = ['User', 'Book', 'Genre'];
        
        for (const className of classes) {
            const exists = await this.db.class.get(className).catch(() => false);
            if (!exists) {
                await this.db.create('class', className).extend('V').one();
                console.log(`✅ Classe '${className}' criada.`);
            }
        }
        
        // Cria arestas (edges)
        const edges = ['RATED', 'BELONGS_TO', 'SIMILAR_TO'];
        for (const edgeName of edges) {
            const exists = await this.db.class.get(edgeName).catch(() => false);
            if (!exists) {
                await this.db.create('class', edgeName).extend('E').one();
                console.log(`✅ Aresta '${edgeName}' criada.`);
            }
        }
        
        // Cria índices (performance)
        await this.db.create('index', 'User.userId').type('UNIQUE').run();
        await this.db.create('index', 'Book.isbn').type('UNIQUE').run();
        console.log('✅ Índices criados.');
    }
}

module.exports = new Database();