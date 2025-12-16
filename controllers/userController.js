const UserModel = require('../models/UserModel');
const recommendationService = require('../services/recommendationService');
const db = require('../config/database');

class UserController {
    // POST /api/users
    async createUser(req, res) {
        try {
            const userModel = new UserModel(db);
            const userData = {
                userId: req.body.userId,
                name: req.body.name,
                email: req.body.email
            };

            // Validação básica
            if (!userData.userId || !userData.name || !userData.email) {
                return res.status(400).json({
                    success: false,
                    error: 'userId, nome e email são obrigatórios'
                });
            }

            const result = await userModel.create(userData);
            res.status(201).json(result);
            
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/users/:userId
    async getUser(req, res) {
        try {
            const userModel = new UserModel(db);
            const user = await userModel.findByUserId(req.params.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            res.json({
                success: true,
                data: user
            });
            
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/users
    async listUsers(req, res) {
        try {
            const userModel = new UserModel(db);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const result = await userModel.findAll(page, limit);
            
            res.json({
                success: true,
                data: result.users,
                pagination: result.pagination
            });
            
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // PUT /api/users/:userId
    async updateUser(req, res) {
        try {
            const userModel = new UserModel(db);
            const result = await userModel.update(req.params.userId, req.body);
            res.json(result);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // DELETE /api/users/:userId
    async deleteUser(req, res) {
        try {
            const userModel = new UserModel(db);
            const result = await userModel.delete(req.params.userId);
            res.json(result);
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // POST /api/users/:userId/rate/:isbn
    async rateBook(req, res) {
        try {
            const userModel = new UserModel(db);
            const { userId, isbn } = req.params;
            const { score, review } = req.body;

            // Validação
            if (!score || score < 1 || score > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Score deve ser entre 1 e 5'
                });
            }

            const result = await userModel.rateBook(userId, isbn, score, review || '');
            res.json(result);
            
        } catch (error) {
            console.error('Erro ao avaliar livro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/users/:userId/ratings
    async getUserRatings(req, res) {
        try {
            const userModel = new UserModel(db);
            const limit = parseInt(req.query.limit) || 10;
            const ratings = await userModel.getUserRatings(req.params.userId, limit);
            
            res.json({
                success: true,
                data: ratings
            });
            
        } catch (error) {
            console.error('Erro ao buscar avaliações:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // GET /api/users/:userId/recommendations
    async getRecommendations(req, res) {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            
            const recommendations = await recommendationService.generateRecommendations(userId, limit);
            
            res.json(recommendations);
            
        } catch (error) {
            console.error('Erro ao gerar recomendações:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new UserController();