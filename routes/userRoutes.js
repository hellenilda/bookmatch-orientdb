const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Usuários
router.post('/', userController.createUser.bind(userController));
router.get('/', userController.listUsers.bind(userController));
router.get('/:userId', userController.getUser.bind(userController));
router.put('/:userId', userController.updateUser.bind(userController));
router.delete('/:userId', userController.deleteUser.bind(userController));

// Avaliações
router.post('/:userId/rate/:isbn', userController.rateBook.bind(userController));
router.delete('/:userId/rate/:isbn', userController.deleteRating.bind(userController));
router.get('/:userId/ratings', userController.getUserRatings.bind(userController));

// Recomendações
router.get('/:userId/recommendations', userController.getRecommendations.bind(userController));

module.exports = router;