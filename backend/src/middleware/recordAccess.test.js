const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { hasAssignedClass, canAccessStudent } = require('./recordAccess');

const checkStudentAccess = async ({ user, student, classes = [] }) => {
  const studentLookup = mock.method(Student, 'findById', () => ({ select: async () => student }));
  const teacherLookup = mock.method(Teacher, 'findOne', () => ({ select: async () => ({ classes }) }));
  try {
    return await canAccessStudent(user, 'student-1');
  } finally {
    studentLookup.mock.restore();
    teacherLookup.mock.restore();
  }
};

test('teacher can access an assigned class across ObjectId and string values', () => {
  const classId = { toString: () => 'class-1' };
  assert.equal(hasAssignedClass(['class-1'], classId), true);
});

test('teacher cannot access an unassigned or missing class', () => {
  assert.equal(hasAssignedClass(['class-1'], 'class-2'), false);
  assert.equal(hasAssignedClass([], 'class-1'), false);
});

test('a student can access their own record only', async () => {
  const student = { user: 'user-1', currentClass: 'class-1' };
  assert.equal(await checkStudentAccess({ user: { _id: 'user-1', role: 'student' }, student }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'user-2', role: 'student' }, student }), false);
});

test('a parent can access a linked child record by account or email', async () => {
  assert.equal(await checkStudentAccess({ user: { _id: 'parent-1', role: 'parent' }, student: { parentUser: 'parent-1' } }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'parent-2', email: 'parent@example.test', role: 'parent' }, student: { parentEmail: 'parent@example.test' } }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'parent-2', role: 'parent' }, student: { parentUser: 'parent-1' } }), false);
});

test('a teacher can access students in assigned classes only', async () => {
  const student = { currentClass: 'class-1' };
  assert.equal(await checkStudentAccess({ user: { _id: 'teacher-1', role: 'teacher' }, student, classes: ['class-1'] }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'teacher-1', role: 'teacher' }, student, classes: ['class-2'] }), false);
});
