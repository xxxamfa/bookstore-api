'use strict';

/**
 * Book Store Management API (Express + Mongoose)
 * - Uses environment variables for secrets (PORT, MONGO_URI)
 * - Validates and sanitizes request bodies with Joi (see validators.js)
 * - Validates MongoDB ObjectId for :id routes
 * - Provides consistent HTTP status codes and JSON responses
 */

require('dotenv').config();                // Load .env variables first

// ------------------------------
// Imports
// ------------------------------
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { bookSchema, validate, validateId } = require('./validators'); // body & id validators

// ------------------------------
// App & Middleware
// ------------------------------
const app = express();
const port = process.env.PORT || 3000;
// Enable CORS for all origins (adjust if you need restrictions)
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// ------------------------------
// MongoDB (Mongoose) Connection
// ------------------------------
// Connect using MONGO_URI from .env to avoid hardcoding secrets in code
(async function connectAndStart() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        app.listen(port, () =>
            console.log(`Book Store API Server is running on port ${port}`)
        );
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit if DB connection fails
    }
})();

// ------------------------------
// Mongoose Model
// ------------------------------
const bookstoreSchema = new mongoose.Schema(
    {
        Title: { type: String, required: true, trim: true },
        Author: { type: String, required: true, trim: true },
        Pages: { type: Number, required: true, min: 1 },
    },
    { timestamps: true } // createdAt / updatedAt for free
);

const BookStore = mongoose.model('BookStore', bookstoreSchema);

// ------------------------------
// Router (/api/bookstores)
// ------------------------------
const router = express.Router();
app.use('/api/bookstores', router);

/**
 * READ: Get all books
 * GET /api/bookstores
 */
router.get('/', async (req, res) => {
    try {
        const books = await BookStore.find().lean();
        return res.json(books);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * READ: Get one book by id
 * GET /api/bookstores/:id
 */
router.get('/:id', validateId, async (req, res) => {
    try {
        const doc = await BookStore.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ message: 'NotFound' });
        return res.json(doc);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * CREATE: Add a new book
 * POST /api/bookstores/add
 * Body validated & sanitized by Joi (validators.js)
 */
router.post('/add', validate(bookSchema), async (req, res) => {
    try {
        const created = await BookStore.create(req.body); // req.body is already cleaned
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * UPDATE: Modify a book by id
 * PUT /api/bookstores/update/:id
 * Both :id and body are validated before hitting DB
 */
router.put('/update/:id', validateId, validate(bookSchema), async (req, res) => {
    try {
        const updated = await BookStore.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // return updated doc
        );
        if (!updated) return res.status(404).json({ message: 'NotFound' });
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * DELETE: Remove a book by id
 * DELETE /api/bookstores/delete/:id
 */
router.delete('/delete/:id', validateId, async (req, res) => {
    try {
        const deleted = await BookStore.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'NotFound' });
        return res.json({ message: 'Book Store deleted.' });
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

// ------------------------------
// Health check & 404 fallback
// ------------------------------
app.get('/health', (req, res) => res.json({ ok: true }));

// Catch-all for undefined routes
app.use((req, res) => res.status(404).json({ message: 'NotFound' }));
