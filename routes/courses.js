// This file defines the API for managing course data.
// It uses a JSON file as a simple data store and exports an Express router.
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const COURSES_FILE_PATH = path.join(__dirname, '..', 'data', 'courses.json');
const ALLOWED_STATUS = ['Not Started', 'In Progress', 'Completed'];

// Helper: make sure the courses data file exists before reading it.
// If the file does not exist, create it with an empty array.
function ensureCoursesFileExists(callback) {
  fs.access(COURSES_FILE_PATH, fs.constants.F_OK, (accessErr) => {
    if (!accessErr) {
      // File already exists, so we can continue normally.
      return callback(null);
    }

    if (accessErr.code !== 'ENOENT') {
      // A different error happened when checking for the file.
      return callback(accessErr);
    }

    // The file is missing. Create the directory and file first.
    const coursesDir = path.dirname(COURSES_FILE_PATH);
    fs.mkdir(coursesDir, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        return callback(mkdirErr);
      }

      fs.writeFile(COURSES_FILE_PATH, JSON.stringify([], null, 2), 'utf8', callback);
    });
  });
}

// Helper: read the courses file and parse JSON into a JavaScript array.
function readCoursesFile(callback) {
  ensureCoursesFileExists((ensureErr) => {
    if (ensureErr) {
      return callback(ensureErr);
    }

    fs.readFile(COURSES_FILE_PATH, 'utf8', (err, data) => {
      if (err) {
        return callback(err);
      }

      try {
        const courses = JSON.parse(data);
        callback(null, courses);
      } catch (parseError) {
        callback(new Error('Invalid courses file format'));
      }
    });
  });
}

// Helper: write the courses array back to the JSON file.
function writeCoursesFile(courses, callback) {
  fs.writeFile(COURSES_FILE_PATH, JSON.stringify(courses, null, 2), 'utf8', callback);
}

// Helper: validate a date string in YYYY-MM-DD format.
function isValidDate(value) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(value);
  return date instanceof Date && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Helper: validate body fields when creating a new course.
function validateCourseInput(course) {
  const errors = [];

  if (!course || typeof course !== 'object') {
    errors.push('Course data is required.');
    return errors;
  }

  if (!course.name || String(course.name).trim() === '') {
    errors.push('Field "name" is required.');
  }

  if (!course.description || String(course.description).trim() === '') {
    errors.push('Field "description" is required.');
  }

  if (!course.target_date || !isValidDate(course.target_date)) {
    errors.push('Field "target_date" is required and must be in YYYY-MM-DD format.');
  }

  if (!course.status || !ALLOWED_STATUS.includes(course.status)) {
    errors.push('Field "status" is required and must be one of: ' + ALLOWED_STATUS.join(', ') + '.');
  }

  return errors;
}

// Helper: validate body fields when updating a course.
// Updates can be partial, so each provided field is checked separately.
function validateCourseUpdateInput(course) {
  const errors = [];

  if (course.name !== undefined && String(course.name).trim() === '') {
    errors.push('Field "name" cannot be empty.');
  }

  if (course.description !== undefined && String(course.description).trim() === '') {
    errors.push('Field "description" cannot be empty.');
  }

  if (course.target_date !== undefined && !isValidDate(course.target_date)) {
    errors.push('Field "target_date" must be in YYYY-MM-DD format.');
  }

  if (course.status !== undefined && !ALLOWED_STATUS.includes(course.status)) {
    errors.push('Field "status" must be one of: ' + ALLOWED_STATUS.join(', ') + '.');
  }

  return errors;
}

// Helper: generate the next course ID, always starting from 1.
// This keeps IDs sequential even after courses are deleted.
function getNextCourseId(courses) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return 1;
  }
  return courses.reduce((maxId, course) => Math.max(maxId, course.id || 0), 0) + 1;
}

// Route: return the full list of courses.
router.get('/courses', (req, res) => {
  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    res.json(courses);
  });
});

// Route: return statistics for all courses.
router.get('/courses/stats', (req, res) => {
  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    const stats = {
      totalCourses: courses.length,
      statusCounts: {
        'Not Started': 0,
        'In Progress': 0,
        'Completed': 0
      }
    };

    courses.forEach((course) => {
      if (ALLOWED_STATUS.includes(course.status)) {
        stats.statusCounts[course.status] += 1;
      }
    });

    res.json(stats);
  });
});

// Route: return a single course by its numeric ID.
router.get('/courses/:id', (req, res) => {
  const courseId = parseInt(req.params.id, 10);

  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    res.json(course);
  });
});

// Route: create a new course using values from the request body.
router.post('/courses', (req, res) => {
  const courseInput = req.body;
  const validationErrors = validateCourseInput(courseInput);

  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    const newCourse = {
      id: getNextCourseId(courses),
      name: String(courseInput.name).trim(),
      description: String(courseInput.description).trim(),
      target_date: courseInput.target_date,
      status: courseInput.status,
      created_at: new Date().toISOString()
    };

    courses.push(newCourse);

    writeCoursesFile(courses, (writeErr) => {
      if (writeErr) {
        console.error('Write courses file failed:', writeErr);
        return res.status(500).json({ error: 'Unable to save course.' });
      }

      res.status(201).json(newCourse);
    });
  });
});

// Route: update an existing course by ID.
// Only provided fields are overwritten; existing values are kept.
router.put('/courses/:id', (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const updateInput = req.body;
  const validationErrors = validateCourseUpdateInput(updateInput);

  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const existingCourse = courses[courseIndex];
    const updatedCourse = {
      ...existingCourse,
      ...updateInput,
      id: existingCourse.id,
      created_at: existingCourse.created_at
    };

    courses[courseIndex] = updatedCourse;

    writeCoursesFile(courses, (writeErr) => {
      if (writeErr) {
        console.error('Write courses file failed:', writeErr);
        return res.status(500).json({ error: 'Unable to update course.' });
      }

      res.json(updatedCourse);
    });
  });
});

// Route: delete a course by ID.
router.delete('/courses/:id', (req, res) => {
  const courseId = parseInt(req.params.id, 10);

  readCoursesFile((err, courses) => {
    if (err) {
      console.error('Read courses file failed:', err);
      return res.status(500).json({ error: 'Unable to read courses file.' });
    }

    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    courses.splice(courseIndex, 1);

    writeCoursesFile(courses, (writeErr) => {
      if (writeErr) {
        console.error('Write courses file failed:', writeErr);
        return res.status(500).json({ error: 'Unable to delete course.' });
      }

      res.status(204).send();
    });
  });
});

module.exports = router;
