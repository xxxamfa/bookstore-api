'use strict';

// ###################################################### //
// ##### Server Setup for Book Store Management API ##### //
// ###################################################### //

// Importing packages
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialize Express app
const app = express();
// Define the port for the server to listen on
const port = process.env.PORT || 3000; // You can change this port

// Middleware setup
// Enable CORS (Cross-Origin Resource Sharing) for all routes
app.use(cors());
// Enable Express to parse JSON formatted request bodies
app.use(express.json());

// ###################################################### //
// #####           Connection to MongoDB            ##### //
// ###################################################### //

// Importing the Mongoose package for MongoDB interaction
// Mongoose is an ODM (Object Data Modeling) library for MongoDB and Node.js.

// MongoDB connection string.
// This string is generated from the inputs provided in the UI.
mongoose.connect('mongodb+srv://xxxamfa:Bl1691821@book.oaosyob.mongodb.net/?retryWrites=true&w=majority&appName=Book', {
    useNewUrlParser: true, // Use the new URL parser instead of the deprecated one
    useUnifiedTopology: true // Use the new server discovery and monitoring engine
})
    .then(() => {
        console.log('Connected to MongoDB');
        // Start the Express server only after successfully connecting to MongoDB
        app.listen(port, () => {
            console.log('Book Store API Server is running on port ' + port);
        });
    })
    .catch((error) => {
        // Log any errors that occur during the MongoDB connection
        console.error('Error connecting to MongoDB:', error);
    });

// ############################################### //
// #####        Book Store Model Setup       ##### //
// ############################################### //

// Define Mongoose Schema Class
const Schema = mongoose.Schema;

// This schema defines the structure of book store documents in the MongoDB collection.
const bookstoreSchema = new Schema({
    Title: { type: String, required: true },
    Author: { type: String, required: true },
    Pages: { type: Number, required: true }
});

// Create a Mongoose model from the book storeSchema.
// This model provides an interface to interact with the 'bookstores' collection.
// Mongoose automatically pluralizes "BookStore" to "bookstores" for the collection name.
const BookStore = mongoose.model("BookStore", bookstoreSchema);

// ############################################# //
// #####     Book Store API Routes Setup   ##### //
// ############################################# //

// Create an Express Router instance to handle book store-related routes.
const router = express.Router();

// Mount the router middleware at the '/api/bookstores' path.
// All routes defined on this router will be prefixed with '/api/bookstores'.
app.use('/api/bookstores', router);

// READ: Get All Books
// Route to get all book stores from the database.
// Handles GET requests to '/api/bookstores/'.
router.route("/")
    .get((req, res) => {
        console.log("Fetching all book stores..."); // Log the request for debugging purposes.
        // Find all book store documents in the 'bookstores' collection.
        BookStore.find()
            .then((bookstores) => res.json(bookstores)) // If successful, return book stores as JSON.
            .catch((err) => res.status(400).json("Error: " + err)); // If error, return 400 status with error message.
    });

// READ: Get Book by ID
// Route to get a specific book store by its ID.
// Handles GET requests to '/api/bookstores/:id'.
router.route("/:id")
    .get((req, res) => {
        // Find a book store document by its ID from the request parameters.
        BookStore.findById(req.params.id)
            .then((bookstore) => res.json(bookstore)) // If successful, return the book store as JSON.
            .catch((err) => res.status(400).json("Error: " + err)); // If error, return 400 status with error message.
    });

// CREATE: Add New Book
// Route to add a new book store to the database.
// Handles POST requests to '/api/bookstores/add'.
router.route("/add")
    .post((req, res) => {
        // Extract attributes from the request body.
        const Title = req.body.Title;
        const Author = req.body.Author;
        const Pages = req.body.Pages;

        // Create a new Book Store object using the extracted data.
        const newBookStore = new BookStore({
            Title,
            Author,
            Pages
        });

        // Save the new book store document to the database.
        newBookStore
            .save()
            .then(() => res.json("Book Store added!")) // If successful, return success message.
            .catch((err) => res.status(400).json("Error: " + err)); // If error, return 400 status with error message.
    });

// UPDATE: Modify Book by ID
// Route to update an existing book store by its ID.
// Handles PUT requests to '/api/bookstores/update/:id'.
router.route("/update/:id")
    .put((req, res) => {
        // Find the book store by ID.
        BookStore.findById(req.params.id)
            .then((bookstore) => {
                // Update the book store's attributes with data from the request body.
                bookstore.Title = req.body.Title;
                bookstore.Author = req.body.Author;
                bookstore.Pages = req.body.Pages;

                // Save the updated book store document.
                bookstore
                    .save()
                    .then(() => res.json("Book Store updated!")) // If successful, return success message.
                    .catch((err) => res.status(400).json("Error: " + err)); // If error, return 400 status with error message.
            })
            .catch((err) => res.status(400).json("Error: " + err)); // If book store not found or other error, return 400.
    });

// DELETE: Remove Book by ID
// Route to delete a book store by its ID.
// Handles DELETE requests to '/api/bookstores/delete/:id'.
router.route("/delete/:id")
    .delete((req, res) => {
        // Find and delete the book store document by ID.
        BookStore.findByIdAndDelete(req.params.id)
            .then(() => res.json("Book Store deleted.")) // If successful, return success message.
            .catch((err) => res.status(400).json("Error: " + err)); // If error, return 400 status with error message.
    });
