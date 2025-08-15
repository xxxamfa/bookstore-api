// validators.js
const Joi = require('joi');
const mongoose = require('mongoose');

// 驗「書本」資料
const bookSchema = Joi.object({
    Title: Joi.string().trim().min(1).required(),
    Author: Joi.string().trim().min(1).required(),
    Pages: Joi.number().integer().min(1).required(),
});

// 共用：驗 body 的中介層
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,      // 一次回所有錯誤
            stripUnknown: true      // 自動移除不在 schema 的欄位
        });
        if (error) {
            return res.status(400).json({
                message: 'ValidationError',
                details: error.details.map(d => ({ message: d.message, path: d.path }))
            });
        }
        req.body = value; // 用清洗後的資料
        next();
    };
}

// 共用：驗證 Mongo ObjectId
function validateId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid id' });
    }
    next();
}

module.exports = { bookSchema, validate, validateId };
