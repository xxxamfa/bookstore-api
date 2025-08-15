'use strict';

/**
 * Book Store Management API (Express + Mongoose)
 * - Uses env vars (PORT, MONGO_URI) via dotenv
 * - Validates/sanitizes bodies with Joi (see validators.js)
 * - Validates MongoDB ObjectId for :id routes
 * - Adds file upload with Multer (POST /api/bookstores/:id/cover)
 * - Serves Swagger UI at /docs
 */

require('dotenv').config(); // Load .env first

// ------------------------------
// Imports
// ------------------------------
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { bookSchema, validate, validateId } = require('./validators');

// ------------------------------
// App & Middleware
// ------------------------------
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());           // Allow cross-origin requests (relax if needed)
app.use(express.json());   // Parse JSON bodies
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// ------------------------------
// MongoDB (Mongoose) Connection
// ------------------------------
(async function connectAndStart() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        app.listen(port, () => console.log(`Book Store API Server is running on port ${port}`));
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
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
        // Optional cover image URL saved after upload
        CoverUrl: { type: String, default: null }
    },
    { timestamps: true }
);

const BookStore = mongoose.model('BookStore', bookstoreSchema);

// ------------------------------
// Multer (file upload) setup
// ------------------------------
// Save files under ./uploads with random filename; only allow images; limit 2MB
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    },
});
const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const fileFilter = (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed (png, jpg, jpeg, webp).'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// ------------------------------
// Router (/api/bookstores)
// ------------------------------
const router = express.Router();
app.use('/api/bookstores', router);

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Book Store CRUD
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required: [Title, Author, Pages]
 *       properties:
 *         _id: { type: string }
 *         Title:  { type: string }
 *         Author: { type: string }
 *         Pages:  { type: integer, minimum: 1 }
 *         CoverUrl: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /api/bookstores:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     responses:
 *       200: { description: OK }
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
 * @swagger
 * /api/bookstores/{id}:
 *   get:
 *     summary: Get one book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
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
 * @swagger
 * /api/bookstores/add:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Book' }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
router.post('/add', validate(bookSchema), async (req, res) => {
    try {
        const created = await BookStore.create(req.body);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * @swagger
 * /api/bookstores/update/{id}:
 *   put:
 *     summary: Update a book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Book' }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid id / Validation error }
 *       404: { description: Not found }
 */
router.put('/update/:id', validateId, validate(bookSchema), async (req, res) => {
    try {
        const updated = await BookStore.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'NotFound' });
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ message: 'ServerError', error: String(err) });
    }
});

/**
 * @swagger
 * /api/bookstores/delete/{id}:
 *   delete:
 *     summary: Delete a book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
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

/**
 * @swagger
 * /api/bookstores/{id}/cover:
 *   post:
 *     summary: Upload a cover image for a book
 *     description: Use form-data with key `file` to upload an image. Returns the updated book with `CoverUrl`.
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Uploaded }
 *       400: { description: Invalid id or bad file }
 *       404: { description: Not found }
 */
router.post('/:id/cover', validateId, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'File is required (field name: file)' });
        // Build a public URL to the uploaded file
        const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const updated = await BookStore.findByIdAndUpdate(req.params.id, { CoverUrl: url }, { new: true });
        if (!updated) return res.status(404).json({ message: 'NotFound' });
        return res.json(updated);
    } catch (err) {
        return res.status(400).json({ message: 'UploadError', error: String(err) });
    }
});

// ------------------------------
// Health 
// ------------------------------
app.get('/health', (req, res) => res.json({ ok: true }));

// ------------------------------
// Swagger setup (/docs)
// ------------------------------
const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: { title: 'Book Store API', version: '1.0.0' },
        servers: [{ url: '/' }] // relative base; works in local & most hosts
    },
    apis: [__filename], // scan this file's JSDoc comments
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ------------------------------
// 必須放最後才不會擋到Swagger
// ------------------------------
app.use((req, res) => res.status(404).json({ message: 'NotFound' }));

