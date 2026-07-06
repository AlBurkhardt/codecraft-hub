// Import the Express framework and Node.js utilities.
// Express makes it easy to build web servers and APIs.
const express = require('express');
const fs = require('fs');
const path = require('path');

// Create a new Express application instance.
const app = express();

// The port where the server will listen for requests.
const PORT = 5000;

// Middleware: automatically parse JSON request bodies.
// This means `req.body` will contain parsed JSON for POST/PUT requests.
app.use(express.json());

// Serve static files from the `public` folder.
// For example, `public/index.html` will be available at `/index.html`.
app.use(express.static(path.join(__dirname, 'public')));

// Import the router that handles course-related API routes.
// This keeps route logic organized in a separate file.
const courseRoutes = require('./routes/courses');

// Mount the course routes under `/api/courses`.
// Example: `GET /api/courses` will be handled by `routes/courses.js`.
app.use('/api', courseRoutes);

// Start the server and begin listening for incoming requests.
// The callback runs once the server is ready.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('CodeCraftHub API is starting...');
    console.log(`Data will be stored in: '${path.join(__dirname, 'data', 'courses.json')}'`);
    console.log(`API is available at: 'http://localhost:${PORT}'`);
  });
}

// Export the Express app for use in tests.
module.exports = app;