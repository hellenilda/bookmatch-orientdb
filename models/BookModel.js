class BookModel {
    constructor(db) {
        this.db = db;
    }

    // CREATE | cria novo livro (genres é um array simples)
    async create(bookData) {
        try {
            const book = await this.db.createVertex('Book', {
                isbn: bookData.isbn,
                title: bookData.title,
                author: bookData.author,
                description: bookData.description || '',
                pageCount: bookData.pageCount || 0,
                publishedDate: bookData.publishedDate || null,
                genres: bookData.genres || [],
                createdAt: new Date().toISOString()
            });

            return { success: true, data: book };
        } catch (error) {
            console.error('Erro ao criar livro:', error.message);
            throw error;
        }
    }

    // READ | busca livro por ISBN
    async findByISBN(isbn) {
        const sql = `
            SELECT 
                @rid as id,
                isbn,
                title,
                author,
                description,
                pageCount,
                publishedDate,
                genres,
                in('RATED').size() as ratingCount,
                in('RATED').score as allRatings
            FROM Book 
            WHERE isbn = :isbn
        `;
        
        return await this.db.queryOne(sql, { isbn });
    }

    // READ | lista todos os livros
    async findAll(filters = {}) {
        let sql = 'SELECT FROM Book WHERE 1=1';
        const params = {};
        
        if (filters.genre) {
            sql += ` AND :genre IN genres`;
            params.genre = filters.genre;
        }
        
        if (filters.author) {
            sql += ` AND author LIKE :author`;
            params.author = `%${filters.author}%`;
        }
        
        sql += ' ORDER BY title';
        
        if (filters.limit) {
            sql += ` LIMIT ${parseInt(filters.limit)}`;
        }
        
        return await this.db.query(sql, params);
    }

    // UPDATE | atualiza livro
    async update(isbn, updateData) {
        try {
            const book = await this.findByISBN(isbn);
            
            if (!book) {
                return { success: false, message: 'Livro não encontrado' };
            }

            const updates = { ...updateData, updatedAt: new Date().toISOString() };
            const keys = Object.keys(updates);
            const setClause = keys.map(k => `${k} = :${k}`).join(', ');
            
            const sql = `UPDATE ${book.id} SET ${setClause} RETURN AFTER`;
            const params = { ...updates };
            
            const result = await this.db.query(sql, params);
            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Erro ao atualizar livro:', error.message);
            throw error;
        }
    }

    // DELETE | remove livro
    async delete(isbn) {
        try {
            // buscar
            const book = await this.findByISBN(isbn);
            
            if (!book) {
                return { success: false, error: 'Livro não encontrado' };
            }

            // deleta arestas conectadas
            await this.db.query(
                `DELETE EDGE RATED WHERE out = :rid OR in = :rid`,
                { rid: book.id }
            );
            
            await this.db.query(
                `DELETE EDGE SIMILAR_TO WHERE out = :rid OR in = :rid`,
                { rid: book.id }
            );

            // deleta o vértice
            await this.db.query('DELETE VERTEX :rid', { rid: book.id });
            
            return { success: true, message: 'Livro deletado com sucesso' };
        } catch (error) {
            console.error('Erro ao deletar livro:', error.message);
            throw error;
        }
    }

    // Busca livros similares (baseado nos mesmos gêneros)
    async findSimilarBooks(isbn, limit = 5) {
        // busca os gêneros do livro original
        const originalBook = await this.findByISBN(isbn);
        
        if (!originalBook || !originalBook.genres || originalBook.genres.length === 0) {
            return [];
        }

        const sql = `
            SELECT 
                @rid as id,
                isbn,
                title,
                author,
                genres,
                in('RATED').size() as ratingCount
            FROM Book
            WHERE isbn != :isbn
            AND genres CONTAINSANY :genres
            ORDER BY ratingCount DESC
            LIMIT ${limit}
        `;
        
        return await this.db.query(sql, { isbn, genres: originalBook.genres });
    }

    // relação de similaridade entre livros
    async createSimilarity(isbn1, isbn2, score = 0.8) {
        try {
            const book1 = await this.findByISBN(isbn1);
            const book2 = await this.findByISBN(isbn2);
            
            if (!book1 || !book2) {
                return { success: false, error: 'Um dos livros não foi encontrado' };
            }

            await this.db.createEdge('SIMILAR_TO', book1.id, book2.id, {
                similarity: score,
                createdAt: new Date().toISOString()
            });

            return { success: true, message: 'Similaridade criada' };
        } catch (error) {
            console.error('Erro ao criar similaridade:', error.message);
            throw error;
        }
    }
}

module.exports = BookModel;
