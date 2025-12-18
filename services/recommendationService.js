const db = require('../config/database');

class RecommendationService {
    // Gerar recomendações baseadas no grafo
    async generateRecommendations(userId, limit = 10) {
        try {
            // Consulta complexa no grafo
            const recommendations = await db.query(
                `LET $userId = :userId
                 
                 -- 1. Encontrar o usuário
                 LET targetUser = (
                   SELECT FROM User WHERE userId = $userId
                 )
                 
                 -- 2. Livros que o usuário já avaliou bem (≥ 4 estrelas)
                 LET likedBooks = (
                   SELECT expand(out('RATED')) 
                   FROM $targetUser 
                   WHERE score >= 4
                 )
                 
                 -- 3. Gêneros desses livros (com peso)
                 LET likedGenres = (
                   SELECT 
                     name,
                     count(*) as weight,
                     out('BELONGS_TO').size() as bookCount
                   FROM (
                     SELECT expand(out('BELONGS_TO')) 
                     FROM $likedBooks
                   )
                   GROUP BY name
                   ORDER BY weight DESC
                   LIMIT 5
                 )
                 
                 -- 4. Buscar livros NÃO avaliados do mesmo gênero
                 LET candidateBooks = (
                   SELECT 
                     @rid as id,
                     isbn,
                     title,
                     author,
                     in('RATED').size() as popularity,
                     in('RATED').avg(score) as avgRating,
                     $genreWeight as genreWeight
                   FROM Book
                   LET $genreWeight = (
                     SELECT sum(weight) FROM $likedGenres 
                     WHERE name IN out('BELONGS_TO').name
                   )
                   WHERE 
                     -- Não avaliado pelo usuário
                     @rid NOT IN $likedBooks.@rid
                     AND 
                     -- Tem pelo menos um gênero em comum
                     $genreWeight > 0
                   ORDER BY 
                     (genreWeight * 0.6 + popularity * 0.3 + avgRating * 0.1) DESC
                   LIMIT :limit * 2  -- Buscar mais para filtrar depois
                 )
                 
                 -- 5. Filtrar e ordenar resultados finais
                 SELECT 
                   id,
                   isbn,
                   title,
                   author,
                   out('BELONGS_TO').name as genres,
                   popularity,
                   avgRating,
                   genreWeight,
                   (genreWeight * 0.6 + popularity * 0.3 + avgRating * 0.1) as finalScore
                 FROM $candidateBooks
                 ORDER BY finalScore DESC
                 LIMIT :limit`,
                { userId, limit }
            );

            return {
                success: true,
                data: recommendations,
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