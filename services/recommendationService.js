const db = require('../config/database');

class RecommendationService {
    // Gerar recomendações baseadas no grafo
    async generateRecommendations(userId, limit = 10) {
        try {
            // Buscar gêneros dos livros que o usuário avaliou bem (score >= 4)
            const userRatings = await db.query(
                `SELECT in.genres as genres 
                 FROM RATED 
                 WHERE out.userId = :userId AND score >= 4`,
                { userId }
            );

            // Se o usuário não tem avaliações, retornar livros mais populares
            if (!userRatings || userRatings.length === 0) {
                const popularBooks = await db.query(
                    `SELECT 
                        @rid as id,
                        isbn,
                        title,
                        author,
                        genres,
                        in('RATED').size() as popularity
                     FROM Book
                     ORDER BY popularity DESC
                     LIMIT ${limit}`
                );
                
                return {
                    success: true,
                    data: popularBooks,
                    generatedAt: new Date().toISOString()
                };
            }

            // Coletar todos os gêneros favoritos do usuário
            const favoriteGenres = [];
            userRatings.forEach(rating => {
                if (rating.genres && Array.isArray(rating.genres)) {
                    favoriteGenres.push(...rating.genres);
                }
            });

            // Se não há gêneros, retornar livros populares
            if (favoriteGenres.length === 0) {
                const popularBooks = await db.query(
                    `SELECT 
                        @rid as id,
                        isbn,
                        title,
                        author,
                        genres,
                        in('RATED').size() as popularity
                     FROM Book
                     ORDER BY popularity DESC
                     LIMIT ${limit}`
                );
                
                return {
                    success: true,
                    data: popularBooks,
                    generatedAt: new Date().toISOString()
                };
            }

            // Buscar livros NÃO avaliados pelo usuário, dos gêneros favoritos
            const booksAlreadyRated = await db.query(
                `SELECT in.isbn as isbn FROM RATED WHERE out.userId = :userId`,
                { userId }
            );
            
            const ratedIsbns = booksAlreadyRated.map(r => r.isbn);

            // Buscar recomendações
            const allBooks = await db.query(
                `SELECT 
                    @rid as id,
                    isbn,
                    title,
                    author,
                    genres,
                    in('RATED').size() as popularity
                 FROM Book`
            );

            // Filtrar e pontuar os livros
            const scoredBooks = allBooks
                .filter(book => !ratedIsbns.includes(book.isbn))
                .map(book => {
                    let score = 0;
                    
                    // Pontuar baseado em gêneros em comum
                    if (book.genres && Array.isArray(book.genres)) {
                        const commonGenres = book.genres.filter(g => favoriteGenres.includes(g));
                        score += commonGenres.length * 3;
                    }
                    
                    // Adicionar popularidade
                    score += (book.popularity || 0) * 0.5;
                    
                    return { ...book, score };
                })
                .filter(book => book.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return {
                success: true,
                data: scoredBooks,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro ao gerar recomendações:', error);
            throw error;
        }
    }

    async simpleRecommendations(userId, limit = 5) {
        try {
            // livros bem avaliados por usuários com gostos similares
            const sql = `
                SELECT 
                    book.isbn as isbn,
                    book.title as title,
                    book.author as author,
                    book.genres as genres,
                    COUNT(*) as score
                FROM (
                    SELECT expand(in) as book
                    FROM RATED
                    WHERE out.userId != :userId
                    AND score >= 4
                    AND in.isbn NOT IN (
                        SELECT in.isbn FROM RATED WHERE out.userId = :userId
                    )
                )
                GROUP BY book
                ORDER BY score DESC
                LIMIT ${limit}
            `;
            
            return await db.query(sql, { userId });
        } catch (error) {
            console.error('Erro ao gerar recomendações:', error);
            return [];
        }
    }

    // Atualizar similaridade entre livros (batch processing)
    async updateBookSimilarities() {
        console.log('Atualizando similaridades entre livros...');
        
        // 1. limpar arestas antigas
        await db.db.command('DELETE EDGE SIMILAR_TO').all();
        
        // 2. para cada livro, encontrar 5 similares
        const allBooks = await db.query('SELECT @rid, isbn FROM Book').all();
        
        for (const book of allBooks) {
            const similar = await db.query(
                `SELECT 
                    @rid as similarId,
                    (
                      -- Pontuação de similaridade baseada em:
                      -- 1. Mesmo autor (3 pontos)
                      -- 2. Gêneros em comum (2 pontos cada)
                      -- 3. Popularidade similar (1 ponto)
                      (CASE WHEN author = :author THEN 3 ELSE 0 END) +
                      (SELECT count(*) * 2 FROM intersect(
                        out('BELONGS_TO').name, 
                        :bookGenres
                      )) +
                      (CASE 
                        WHEN abs(in('RATED').size() - :popularity) < 10 THEN 1 
                        ELSE 0 
                      END)
                    ) as similarityScore
                 FROM Book
                 WHERE @rid != :bookId
                 ORDER BY similarityScore DESC
                 LIMIT 5`,
                {
                    params: {
                        bookId: book['@rid'],
                        author: book.author,
                        bookGenres: await this.getBookGenres(book['@rid']),
                        popularity: await this.getBookPopularity(book['@rid'])
                    }
                }
            ).all();

            // 3. Criar arestas de similaridade
            for (const similarBook of similar) {
                if (similarBook.similarityScore > 2) { // Threshold mínimo
                    await db.db.command(
                        'CREATE EDGE SIMILAR_TO FROM :fromId TO :toId SET weight = :weight, reason = "auto_generated"',
                        {
                            params: {
                                fromId: book['@rid'],
                                toId: similarBook.similarId,
                                weight: similarBook.similarityScore
                            }
                        }
                    ).one();
                }
            }
        }
        
        console.log(`Similaridades atualizadas para ${allBooks.length} livros`);
        return { processed: allBooks.length };
    }

    async getBookGenres(bookId) {
        const result = await db.query(
            'SELECT name FROM (SELECT expand(out("BELONGS_TO")) FROM :bookId)',
            { params: { bookId } }
        ).all();
        return result.map(g => g.name);
    }

    async getBookPopularity(bookId) {
        return await db.query(
            'SELECT in("RATED").size() FROM :bookId',
            { params: { bookId } }
        ).scalar() || 0;
    }
}

module.exports = new RecommendationService();