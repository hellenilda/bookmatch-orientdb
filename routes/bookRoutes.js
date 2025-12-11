const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Rotas CRUD para livros
router.post('/', bookController.createBook.bind(bookController));
router.get('/', bookController.listBooks.bind(bookController));
router.get('/:isbn', bookController.getBook.bind(bookController));
router.put('/:isbn', bookController.updateBook.bind(bookController));
router.delete('/:isbn', bookController.deleteBook.bind(bookController));

// Rota para livros similares
router.get('/:isbn/similar', bookController.getSimilarBooks.bind(bookController));

module.exports = router;