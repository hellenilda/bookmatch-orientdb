const axios = require('axios');
require('dotenv').config();

class OrientDBHttpClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.httpPort = process.env.DB_HTTP_PORT || 2480;
        this.username = process.env.DB_USER || 'root';
        this.password = process.env.DB_PASSWORD || 'root';
        this.dbName = 'BookMatch';
        
        this.baseURL = `http://${this.host}:${this.httpPort}`;
        this.auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }

    async connect() {
        try {
            // Verificar se o servidor está rodando
            await this.client.get('/server');
            console.log('✅ OrientDB está rodando');

            // Verificar/criar banco de dados
            try {
                await this.client.get(`/database/${this.dbName}`);
                console.log(`✅ Conectado ao banco '${this.dbName}'`);
            } catch (error) {
                if (error.response?.status === 404) {
                    // Banco não existe, criar
                    await this.client.post(`/database/${this.dbName}/plocal/graph`);
                    console.log(`✅ Banco '${this.dbName}' criado!`);
                    // Aguardar criação
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw error;
                }
            }

            await this.setupSchema();
            return this;
            
        } catch (error) {
            console.error('❌ Erro na conexão:', error.message);
            if (error.response) {
                console.error('Resposta do servidor:', error.response.data);
            }
            process.exit(1);
        }
    }

    // Executar comando SQL
    async command(sql, params = {}) {
        try {
            const response = await this.client.post(
                `/command/${this.dbName}/sql`,
                {
                    command: sql,
                    parameters: params
                }
            );
            return response.data.result || [];
        } catch (error) {
            console.error('Erro ao executar comando:', sql);
            throw error;
        }
    }

    // Executar query (alias para command)
    async query(sql, params = {}) {
        return this.command(sql, params);
    }

    // Buscar um único registro
    async queryOne(sql, params = {}) {
        const results = await this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    // Criar vértice
    async createVertex(className, properties) {
        const keys = Object.keys(properties);
        const sql = `CREATE VERTEX ${className} SET ${keys.map(k => `${k} = :${k}`).join(', ')}`;
        const result = await this.query(sql, properties);
        return result[0];
    }

    // Criar aresta
    async createEdge(edgeClass, fromRid, toRid, properties = {}) {
        let sql = `CREATE EDGE ${edgeClass} FROM ${fromRid} TO ${toRid}`;
        
        if (Object.keys(properties).length > 0) {
            const props = Object.keys(properties).map(k => `${k} = :${k}`).join(', ');
            sql += ` SET ${props}`;
        }
        
        const result = await this.query(sql, properties);
        return result[0];
    }

    // Deletar aresta
    async deleteEdge(edgeClass, fromRid, toRid) {
        const sql = `DELETE EDGE ${edgeClass} FROM ${fromRid} TO ${toRid}`;
        return await this.query(sql);
    }

    async setupSchema() {
        try {
            // Criar classes de vértices
            const classes = ['User', 'Book'];
            
            for (const className of classes) {
                try {
                    await this.command(`CREATE CLASS ${className} IF NOT EXISTS EXTENDS V`);
                } catch (error) {
                    // Ignorar se já existe
                }
            }
            
            // Criar classes de arestas
            const edges = ['RATED', 'SIMILAR_TO'];
            for (const edgeName of edges) {
                try {
                    await this.command(`CREATE CLASS ${edgeName} IF NOT EXISTS EXTENDS E`);
                } catch (error) {
                    // Ignorar se já existe
                }
            }
            
            // Criar índices únicos
            try {
                await this.command('CREATE INDEX User.userId IF NOT EXISTS UNIQUE');
            } catch (error) {
                // Ignorar se já existe
            }
            
            try {
                await this.command('CREATE INDEX Book.isbn IF NOT EXISTS UNIQUE');
            } catch (error) {
                // Ignorar se já existe
            }
            
            console.log('✅ Schema configurado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao configurar schema:', error.message);
        }
    }

    // Helper para formatar RID
    formatRid(rid) {
        if (!rid) return null;
        if (typeof rid === 'string') return rid;
        if (rid['@rid']) return rid['@rid'];
        return null;
    }
}

module.exports = new OrientDBHttpClient();
