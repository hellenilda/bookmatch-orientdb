class BookModel {
    constructor(db) {
        this.db = db;
    }

    // Novo livro com arestas para gêneros
    async create(bookData) {
        const session = await this.db.session();
        
        try {
            // 1. Criar vértice do livro (transação aberta)
            await session.begin();
            
            const book = await session.command(
                `CREATE VERTEX Book SET 
                 isbn = :isbn, 
                 title = :title, 
                 author = :author,
                 description = :description,
                 pageCount = :pageCount,
                 publishedDate = :publishedDate`,
                {
                    params: bookData
                }
            ).one();

            // 2. Criar arestas para cada gênero
            for (const genreName of bookData.genres || []) {
                // Buscar ou criar vértice de gênero
                let genre = await session.query(
                    `SELECT FROM Genre WHERE name = :name`,
                    { params: { name: genreName } }
                ).one().catch(() => null);

                if (!genre) {
                    genre = await session.command(
                        'CREATE VERTEX Genre SET name = :name',
                        { params: { name: genreName } }
                    ).one();
                }

                // Criar aresta BELONGS_TO
                await session.command(
                    `CREATE EDGE BELONGS_TO 
                     FROM :bookId TO :genreId 
                     SET strength = 'primary'`,
                    {
                        params: {
                            bookId: book['@rid'],
                            genreId: genre['@rid']
                        }
                    }
                ).one();
            }

            await session.commit();
            return { success: true, data: book };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // READ: Buscar livro por ISBN
    async findByISBN(isbn) {
        return await this.db.query(
            `SELECT 
                @rid as id,
                isbn,
                title,
                author,
                description,
                pageCount,
                publishedDate,
                out('BELONGS_TO').name as genres,
                in('RATED').size() as ratingCount,
                in('RATED').score as allRatings
             FROM Book 
             WHERE isbn = :isbn`,
            {
                params: { isbn },
                fetchPlan: 'genres:2' // Trazer gêneros relacionados
            }
        ).one();
    }

    // UPDATE: Atualizar informações do livro
    async update(isbn, updateData) {
        const session = await this.db.session();
        
        try {
            await session.begin();
            
            // Atualizar propriedades do livro
            const result = await session.command(
                `UPDATE Book MERGE :updateData 
                 WHERE isbn = :isbn
                 RETURN AFTER @rid, isbn, title`,
                {
                    params: {
                        isbn,
                        updateData: {
                            ...updateData,
                            updatedAt: new Date().toISOString()
                        }
                    }
                }
            ).one();

            // Se houver novos gêneros, atualizar relações
            if (updateData.genres) {
                await this.updateGenres(session, result['@rid'], updateData.genres);
            }

            await session.commit();
            return { success: true, data: result };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // DELETE: Remover livro (e suas relações)
    async delete(isbn) {
        const session = await this.db.session();
        
        try {
            await session.begin();
            
            // Encontrar o livro
            const book = await session.query(
                'SELECT FROM Book WHERE isbn = :isbn',
                { params: { isbn } }
            ).one();

            if (!book) {
                throw new Error('Livro não encontrado');
            }

            // Deletar todas as arestas conectadas
            await session.command(
                `DELETE EDGE RATED, BELONGS_TO, SIMILAR_TO
                 WHERE out = :bookId OR in = :bookId`,
                { params: { bookId: book['@rid'] } }
            );

            // Deletar o vértice do livro
            await session.command(
                'DELETE VERTEX Book WHERE @rid = :bookId',
                { params: { bookId: book['@rid'] } }
            );

            await session.commit();
            return { success: true, message: 'Livro removido com sucesso' };
            
        } catch (error) {
            await session.rollback();
            throw error;
        } finally {
            session.close();
        }
    }

    // Método auxiliar para atualizar gêneros
    async updateGenres(session, bookId, newGenres) {
        // Remover relações antigas
        await session.command(
            'DELETE EDGE BELONGS_TO WHERE out = :bookId',
            { params: { bookId } }
        );

        // Criar novas relações
        for (const genreName of newGenres) {
            let genre = await session.query(
                'SELECT FROM Genre WHERE name = :name',
                { params: { name: genreName } }
            ).one().catch(() => null);

            if (!genre) {
                genre = await session.command(
                    'CREATE VERTEX Genre SET name = :name',
                    { params: { name: genreName } }
                ).one();
            }

            await session.command(
                `CREATE EDGE BELONGS_TO FROM :bookId TO :genreId`,
                { params: { bookId, genreId: genre['@rid'] } }
            ).one();
        }
    }

    // CONSULTA AVANÇADA: Buscar livros similares (usando grafo)
    async findSimilarBooks(isbn, limit = 5) {
        return await this.db.query(
            `SELECT 
                expand(books)
             FROM (
               LET targetBook = (SELECT FROM Book WHERE isbn = :isbn),
               targetGenres = (SELECT out('BELONGS_TO') FROM $targetBook),
               similarBooks = (
                 SELECT FROM Book 
                 WHERE isbn != :isbn
                 AND out('BELONGS_TO') IN $targetGenres
                 AND @rid NOT IN (SELECT in FROM SIMILAR_TO WHERE out = $targetBook.@rid)
               )
               SELECT $similarBooks as books
             )`,
            {
                params: { isbn },
                limit
            }
        ).all();
    }
}

module.exports = BookModel;