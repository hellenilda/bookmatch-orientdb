const BookModel = require('../models/BookModel');
const db = require('../config/database');

const bookModel = new BookModel(db.db);

class BookController {
    // POST /api/books
    async createBook(req, res) {
        try {
            const bookData = {
                isbn: req.body.isbn,
                title: req.body.title,
                author: req.body.author,
                description: req.body.description || '',
                pageCount: req.body.pageCount || 0,
                publishedDate: req.body.publishedDate || null,
                genres: req.body.genres || []
            };

            // Validação básica
            if (!bookData.isbn || !bookData.title || !bookData.author) {
                return res.status(400).json({
                    success: false,
                    error: 'ISBN, título e autor são obrigatórios'
                });
            }

            const result = await bookModel.create(bookData);
            res.status(201).json(result);
            
        } catch (error) {
            console.error('Erro ao criar livro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/books/:isbn
    async getBook(req, res) {
        try {
            const book = await bookModel.findByISBN(req.params.isbn);
            
            if (!book) {
                return res.status(404).json({
                    success: false,
                    error: 'Livro não encontrado'
                });
            }

            res.json({
                success: true,
                data: this.formatBookResponse(book)
            });
            
        } catch (error) {
            console.error('Erro ao buscar livro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/books
    async listBooks(req, res) {
        try {
            const { genre, author, page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;
            
            let query = 'SELECT FROM Book WHERE 1=1';
            const params = {};
            
            if (genre) {
                query += ' AND out("BELONGS_TO").name CONTAINS :genre';
                params.genre = genre;
            }
            
            if (author) {
                query += ' AND author.toLowerCase() LIKE :author';
                params.author = `%${author.toLowerCase()}%`;
            }
            
            query += ' ORDER BY title SKIP :offset LIMIT :limit';
            params.offset = parseInt(offset);
            params.limit = parseInt(limit);
            
            const books = await db.db.query(query, { params }).all();
            const total = await db.db.query('SELECT COUNT(*) FROM Book').scalar();
            
            res.json({
                success: true,
                data: books.map(book => this.formatBookResponse(book)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Erro ao listar livros:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT /api/books/:isbn
    async updateBook(req, res) {
        try {
            const result = await bookModel.update(req.params.isbn, req.body);
            res.json(result);
        } catch (error) {
            console.error('Erro ao atualizar livro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // DELETE /api/books/:isbn
    async deleteBook(req, res) {
        try {
            const result = await bookModel.delete(req.params.isbn);
            res.json(result);
        } catch (error) {
            console.error('Erro ao deletar livro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/books/:isbn/similar
    async getSimilarBooks(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const similarBooks = await bookModel.findSimilarBooks(req.params.isbn, limit);
            
            res.json({
                success: true,
                data: similarBooks.map(book => this.formatBookResponse(book))
            });
        } catch (error) {
            console.error('Erro ao buscar livros similares:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Formatar resposta do livro
    formatBookResponse(book) {
        return {
            id: book.id,
            isbn: book.isbn,
            title: book.title,
            author: book.author,
            description: book.description,
            pageCount: book.pageCount,
            publishedDate: book.publishedDate,
            genres: book.genres || [],
            ratingCount: book.ratingCount || 0,
            averageRating: book.allRatings ? 
                (book.allRatings.reduce((a, b) => a + b, 0) / book.allRatings.length).toFixed(1) : 0
        };
    }
}

module.exports = new BookController();