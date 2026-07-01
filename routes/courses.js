const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const COURSES_FILE_PATH = path.join(__dirname, '..', 'data', 'courses.json');

// Get all courses
router.get('/', (req, res) => {
  fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading courses file');
    }
    const courses = JSON.parse(data);
    res.json(courses);
  });
});

// Get a specific course by ID
router.get('/:id', (req, res) => {
  fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading courses file');
    }
    const courses = JSON.parse(data);
    const course = courses.find(c => c.id === parseInt(req.params.id, 10));
    if (!course) {
      return res.status(404).send('Course not found');
    }
    res.json(course);
  });
});

// Create a new course
router.post('/', (req, res) => {
  const newCourse = req.body;
  fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading courses file');
    }
    const courses = JSON.parse(data);
    newCourse.id = courses.length + 1; // Simple ID assignment
    courses.push(newCourse);
    fs.writeFile(COURSES_FILE_PATH, JSON.stringify(courses, null, 2), (err) => {
      if (err) {
        return res.status(500).send('Error saving course');
      }
      res.status(201).json(newCourse);
    });
  });
});

// Update a course
router.put('/:id', (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const updatedCourse = req.body;
  fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading courses file');
    }
    let courses = JSON.parse(data);
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).send('Course not found');
    }
    courses[courseIndex] = { ...courses[courseIndex], ...updatedCourse };
    fs.writeFile(COURSES_FILE_PATH, JSON.stringify(courses, null, 2), (err) => {
      if (err) {
        return res.status(500).send('Error updating course');
      }
      res.json(courses[courseIndex]);
    });
  });
});

// Delete a course
router.delete('/:id', (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading courses file');
    }
    let courses = JSON.parse(data);
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).send('Course not found');
    }
    courses.splice(courseIndex, 1);
    fs.writeFile(COURSES_FILE_PATH, JSON.stringify(courses, null, 2), (err) => {
      if (err) {
        return res.status(500).send('Error deleting course');
      }
      res.status(204).send();
    });
  });
});

module.exports = router;
