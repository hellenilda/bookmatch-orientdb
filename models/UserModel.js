const db = require('../config/database');

class UserModel {
    constructor(database) {
        this.db = database;
    }

    // CREATE: Criar novo usuário
    async create(userData) {
        const session = await this.db.session();
        
        try {
            await session.begin();
            
            const user = await session.command(
                `CREATE VERTEX User SET 
                 userId = :userId, 
                 name = :name, 
                 email = :email,
                 createdAt = :createdAt`,
                {
                    params: {
                        userId: userData.userId,
                        name: userData.name,
                        email: userData.email,
                        createdAt: new Date().toISOString()
                    }
                }
            ).one();

            await session.commit();
            return { success: true, data: user };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // READ: Buscar usuário por userId
    async findByUserId(userId) {
        return await this.db.query(
            `SELECT 
                @rid as id,
                userId,
                name,
                email,
                createdAt,
                out('RATED').size() as totalRatings
             FROM User 
             WHERE userId = :userId`,
            {
                params: { userId }
            }
        ).one();
    }

    // READ: Listar todos os usuários
    async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const users = await this.db.query(
            `SELECT 
                @rid as id,
                userId,
                name,
                email,
                out('RATED').size() as totalRatings
             FROM User
             ORDER BY name
             SKIP :offset
             LIMIT :limit`,
            {
                params: { offset, limit }
            }
        ).all();

        const total = await this.db.query('SELECT COUNT(*) FROM User').scalar();

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

    // UPDATE: Atualizar informações do usuário
    async update(userId, updateData) {
        const session = await this.db.session();
        
        try {
            await session.begin();
            
            const result = await session.command(
                `UPDATE User MERGE :updateData 
                 WHERE userId = :userId
                 RETURN AFTER @rid, userId, name, email`,
                {
                    params: {
                        userId,
                        updateData: {
                            ...updateData,
                            updatedAt: new Date().toISOString()
                        }
                    }
                }
            ).one();

            await session.commit();
            return { success: true, data: result };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // DELETE: Remover usuário e suas avaliações
    async delete(userId) {
        const session = await this.db.session();
        
        try {
            await session.begin();
            
            const user = await session.query(
                'SELECT FROM User WHERE userId = :userId',
                { params: { userId } }
            ).one();

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Deletar todas as avaliações do usuário
            await session.command(
                `DELETE EDGE RATED WHERE out = :userId`,
                { params: { userId: user['@rid'] } }
            );

            // Deletar o vértice do usuário
            await session.command(
                'DELETE VERTEX User WHERE @rid = :userId',
                { params: { userId: user['@rid'] } }
            );

            await session.commit();
            return { success: true, message: 'Usuário removido com sucesso' };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // Avaliar um livro (criar aresta RATED)
    async rateBook(userId, isbn, score, review = '') {
        const session = await this.db.session();
        
        try {
            await session.begin();

            // Buscar usuário e livro
            const user = await session.query(
                'SELECT FROM User WHERE userId = :userId',
                { params: { userId } }
            ).one();

            const book = await session.query(
                'SELECT FROM Book WHERE isbn = :isbn',
                { params: { isbn } }
            ).one();

            if (!user) throw new Error('Usuário não encontrado');
            if (!book) throw new Error('Livro não encontrado');

            // Verificar se já existe avaliação
            const existingRating = await session.query(
                `SELECT FROM RATED WHERE out = :userId AND in = :bookId`,
                { 
                    params: { 
                        userId: user['@rid'],
                        bookId: book['@rid']
                    } 
                }
            ).one().catch(() => null);

            if (existingRating) {
                // Atualizar avaliação existente
                await session.command(
                    `UPDATE EDGE RATED SET 
                     score = :score,
                     review = :review,
                     updatedAt = :updatedAt
                     WHERE out = :userId AND in = :bookId`,
                    {
                        params: {
                            userId: user['@rid'],
                            bookId: book['@rid'],
                            score,
                            review,
                            updatedAt: new Date().toISOString()
                        }
                    }
                );
            } else {
                // Criar nova avaliação
                await session.command(
                    `CREATE EDGE RATED FROM :userId TO :bookId SET 
                     score = :score,
                     review = :review,
                     createdAt = :createdAt`,
                    {
                        params: {
                            userId: user['@rid'],
                            bookId: book['@rid'],
                            score,
                            review,
                            createdAt: new Date().toISOString()
                        }
                    }
                );
            }

            await session.commit();
            return { 
                success: true, 
                message: existingRating ? 'Avaliação atualizada' : 'Livro avaliado com sucesso' 
            };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // Buscar avaliações de um usuário
    async getUserRatings(userId, limit = 10) {
        return await this.db.query(
            `SELECT 
                in.isbn as isbn,
                in.title as title,
                in.author as author,
                score,
                review,
                createdAt,
                updatedAt
             FROM (
               SELECT expand(outE('RATED')) 
               FROM User 
               WHERE userId = :userId
             )
             ORDER BY createdAt DESC
             LIMIT :limit`,
            {
                params: { userId, limit }
            }
        ).all();
    }

    // Buscar livros avaliados com nota alta (≥4)
    async getUserFavorites(userId) {
        return await this.db.query(
            `SELECT 
                in.isbn as isbn,
                in.title as title,
                in.author as author,
                in.out('BELONGS_TO').name as genres,
                score
             FROM (
               SELECT expand(outE('RATED')) 
               FROM User 
               WHERE userId = :userId
             )
             WHERE score >= 4
             ORDER BY score DESC, createdAt DESC`,
            {
                params: { userId }
            }
        ).all();
    }
}

module.exports = UserModel;