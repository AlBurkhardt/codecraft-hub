const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COURSES_FILE_PATH = path.join(DATA_DIR, 'courses.json');
const BACKUP_FILE_PATH = path.join(DATA_DIR, 'courses.json.bak');

function writeCourses(courses) {
  fs.writeFileSync(COURSES_FILE_PATH, JSON.stringify(courses, null, 2), 'utf8');
}

function readCourses() {
  return JSON.parse(fs.readFileSync(COURSES_FILE_PATH, 'utf8'));
}

describe('Courses API', () => {
  beforeAll(() => {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(COURSES_FILE_PATH)) {
      fs.copyFileSync(COURSES_FILE_PATH, BACKUP_FILE_PATH);
    }
  });

  afterAll(() => {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      fs.copyFileSync(BACKUP_FILE_PATH, COURSES_FILE_PATH);
      fs.unlinkSync(BACKUP_FILE_PATH);
    } else if (fs.existsSync(COURSES_FILE_PATH)) {
      fs.unlinkSync(COURSES_FILE_PATH);
    }
  });

  beforeEach(() => {
    writeCourses([]);
  });

  test('GET /api/courses returns an empty list when no courses exist', async () => {
    const response = await request(app).get('/api/courses');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('POST /api/courses creates a new course and returns it', async () => {
    const newCourse = {
      name: 'Test Course',
      description: 'A course created by test suite',
      target_date: '2026-08-01',
      status: 'Not Started'
    };

    const response = await request(app)
      .post('/api/courses')
      .send(newCourse)
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      name: newCourse.name,
      description: newCourse.description,
      target_date: newCourse.target_date,
      status: newCourse.status
    });
    expect(response.body).toHaveProperty('created_at');

    const savedCourses = readCourses();
    expect(savedCourses).toHaveLength(1);
    expect(savedCourses[0].name).toBe(newCourse.name);
  });

  test('POST /api/courses rejects invalid status values', async () => {
    const invalidCourse = {
      name: 'Invalid Status',
      description: 'Status is not allowed',
      target_date: '2026-08-01',
      status: 'Done'
    };

    const response = await request(app)
      .post('/api/courses')
      .send(invalidCourse)
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Field "status" is required and must be one of')
      ])
    );
  });

  test('GET /api/courses/stats returns correct counts by status', async () => {
    writeCourses([
      { id: 1, name: 'First', description: 'First course', target_date: '2026-08-01', status: 'Not Started', created_at: new Date().toISOString() },
      { id: 2, name: 'Second', description: 'Second course', target_date: '2026-08-02', status: 'In Progress', created_at: new Date().toISOString() },
      { id: 3, name: 'Third', description: 'Third course', target_date: '2026-08-03', status: 'Completed', created_at: new Date().toISOString() },
      { id: 4, name: 'Fourth', description: 'Fourth course', target_date: '2026-08-04', status: 'Not Started', created_at: new Date().toISOString() }
    ]);

    const response = await request(app).get('/api/courses/stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalCourses: 4,
      statusCounts: {
        'Not Started': 2,
        'In Progress': 1,
        'Completed': 1
      }
    });
  });

  test('PUT /api/courses/:id updates an existing course', async () => {
    writeCourses([
      { id: 1, name: 'Original', description: 'Original text', target_date: '2026-08-01', status: 'Not Started', created_at: new Date().toISOString() }
    ]);

    const updateData = { status: 'In Progress' };
    const response = await request(app)
      .put('/api/courses/1')
      .send(updateData)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('In Progress');

    const courses = readCourses();
    expect(courses[0].status).toBe('In Progress');
  });

  test('DELETE /api/courses/:id removes a course', async () => {
    writeCourses([
      { id: 1, name: 'Delete Me', description: 'Remove this course', target_date: '2026-08-01', status: 'Not Started', created_at: new Date().toISOString() }
    ]);

    const response = await request(app).delete('/api/courses/1');

    expect(response.status).toBe(204);
    expect(readCourses()).toHaveLength(0);
  });

  test('GET /api/courses/:id returns 404 for missing course', async () => {
    const response = await request(app).get('/api/courses/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Course not found.');
  });
});
