class UserModel {
    constructor(db) {
        this.db = db;
    }

    // CREATE: Criar novo usuário
    async create(userData) {
        try {
            const user = await this.db.createVertex('User', {
                userId: userData.userId,
                name: userData.name,
                email: userData.email,
                createdAt: new Date().toISOString()
            });

            return { success: true, data: user };
        } catch (error) {
            console.error('Erro ao criar usuário:', error.message);
            throw error;
        }
    }

    // READ: Buscar usuário por userId
    async findByUserId(userId) {
        const sql = `
            SELECT 
                @rid as id,
                userId,
                name,
                email,
                createdAt,
                out('RATED').size() as totalRatings
            FROM User 
            WHERE userId = :userId
        `;
        
        return await this.db.queryOne(sql, { userId });
    }

    // READ: Listar todos os usuários
    async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT 
                @rid as id,
                userId,
                name,
                email,
                out('RATED').size() as totalRatings
            FROM User
            ORDER BY name
            SKIP ${offset}
            LIMIT ${limit}
        `;
        
        const users = await this.db.query(sql);
        
        // Contar total
        const countResult = await this.db.query('SELECT COUNT(*) as count FROM User');
        const total = countResult[0]?.count || 0;

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // UPDATE: Atualizar usuário
    async update(userId, updateData) {
        try {
            const updates = { ...updateData, updatedAt: new Date().toISOString() };
            const keys = Object.keys(updates);
            const setClause = keys.map(k => `${k} = :${k}`).join(', ');
            
            const sql = `UPDATE User SET ${setClause} WHERE userId = :userId RETURN AFTER`;
            const params = { ...updates, userId };
            
            const result = await this.db.query(sql, params);
            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error.message);
            throw error;
        }
    }

    // DELETE: Remover usuário
    async delete(userId) {
        try {
            const user = await this.findByUserId(userId);
            
            if (!user) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            // Deletar arestas de ratings
            await this.db.query(
                `DELETE EDGE RATED WHERE out = :rid`,
                { rid: user.id }
            );

            // Deletar vértice do usuário
            await this.db.query('DELETE VERTEX :rid', { rid: user.id });
            
            return { success: true, message: 'Usuário deletado com sucesso' };
        } catch (error) {
            console.error('Erro ao deletar usuário:', error.message);
            throw error;
        }
    }

    // Avaliar um livro (criar/atualizar aresta RATED)
    async rateBook(userId, isbn, score, review = '') {
        try {
            // Buscar usuário e livro
            const user = await this.findByUserId(userId);
            const bookSql = 'SELECT @rid as id FROM Book WHERE isbn = :isbn';
            const book = await this.db.queryOne(bookSql, { isbn });
            
            if (!user) {
                return { success: false, error: 'Usuário não encontrado' };
            }
            
            if (!book) {
                return { success: false, error: 'Livro não encontrado' };
            }

            // Verificar se já existe avaliação
            const existingRating = await this.db.queryOne(
                `SELECT FROM RATED WHERE out = :userId AND in = :bookId`,
                { userId: user.id, bookId: book.id }
            );

            if (existingRating) {
                // Atualizar avaliação existente
                await this.db.query(
                    `UPDATE RATED SET score = :score, review = :review, updatedAt = :updatedAt 
                     WHERE out = :userId AND in = :bookId`,
                    {
                        score,
                        review,
                        updatedAt: new Date().toISOString(),
                        userId: user.id,
                        bookId: book.id
                    }
                );
                
                return { 
                    success: true, 
                    message: 'Avaliação atualizada',
                    data: { userId, isbn, score, review }
                };
            } else {
                // Criar nova avaliação
                await this.db.createEdge('RATED', user.id, book.id, {
                    score,
                    review,
                    createdAt: new Date().toISOString()
                });
                
                return { 
                    success: true, 
                    message: 'Avaliação criada',
                    data: { userId, isbn, score, review }
                };
            }
        } catch (error) {
            console.error('Erro ao avaliar livro:', error.message);
            throw error;
        }
    }

    // Buscar avaliações de um usuário
    async getUserRatings(userId, limit = 10) {
        const sql = `
            SELECT 
                in.isbn as isbn,
                in.title as title,
                in.author as author,
                in.genres as genres,
                score,
                review,
                createdAt,
                updatedAt
            FROM RATED
            WHERE out.userId = :userId
            ORDER BY createdAt DESC
            LIMIT ${limit}
        `;
        
        return await this.db.query(sql, { userId });
    }

    // Buscar livros favoritos (rating >= 4)
    async getUserFavorites(userId) {
        const sql = `
            SELECT 
                in.isbn as isbn,
                in.title as title,
                in.author as author,
                in.genres as genres,
                score
            FROM RATED
            WHERE out.userId = :userId AND score >= 4
            ORDER BY score DESC, createdAt DESC
        `;
        
        return await this.db.query(sql, { userId });
    }
}

module.exports = UserModel;
