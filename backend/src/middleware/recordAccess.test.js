const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const AcademicPermission = require('../models/AcademicPermission');
const { hasAssignedClass, canAccessStudent, hasAcademicEntryPermission, parentStudentFilter } = require('./recordAccess');

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
  assert.equal(await checkStudentAccess({ user: { _id: 'parent-3', email: 'second@example.test', role: 'parent' }, student: { guardians: [{ user: 'parent-3', email: 'second@example.test' }] } }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'parent-2', role: 'parent' }, student: { parentUser: 'parent-1' } }), false);
});

test('parent student filters include linked guardian account and email records', () => {
  const filter = parentStudentFilter({ _id: 'parent-3', email: 'second@example.test' });
  assert.deepEqual(filter.$or, [
    { parentUser: 'parent-3' },
    { 'guardians.user': 'parent-3' },
    { parentEmail: 'second@example.test' },
    { 'guardians.email': 'second@example.test' },
  ]);
});

test('a teacher can access students in assigned classes only', async () => {
  const student = { currentClass: 'class-1' };
  assert.equal(await checkStudentAccess({ user: { _id: 'teacher-1', role: 'teacher' }, student, classes: ['class-1'] }), true);
  assert.equal(await checkStudentAccess({ user: { _id: 'teacher-1', role: 'teacher' }, student, classes: ['class-2'] }), false);
});

test('marks entry window query enforces exact teacher scope and active dates', async () => {
  let query;
  const lookup = mock.method(AcademicPermission, 'exists', async value => { query = value; return true; });
  try {
    await hasAcademicEntryPermission({ _id: 'teacher-1', role: 'teacher' }, { subjectId: 's1', classId: 'c1', term: 'Term 1', academicYear: 2026, examType: 'EOT' });
    assert.equal(query.teacher, 'teacher-1'); assert.equal(query.subject, 's1'); assert.equal(query.class, 'c1');
    assert.equal(query.assessmentTypes, 'EOT'); assert.equal(query.revokedAt, null);
    assert.ok(query.startsAt.$lte instanceof Date); assert.ok(query.endsAt.$gte instanceof Date);
  } finally { lookup.mock.restore(); }
});

test('expired or not-yet-open marks windows block teachers while DOS and academic admins bypass them', async () => {
  const lookup = mock.method(AcademicPermission, 'exists', async () => false);
  try {
    const entry = { subjectId: 's1', classId: 'c1', term: 'Term 1', academicYear: 2026, examType: 'EOT' };
    assert.equal(await hasAcademicEntryPermission({ _id: 't1', role: 'teacher' }, entry), false);
    for (const role of ['director-of-studies', 'academic-admin']) assert.equal(await hasAcademicEntryPermission({ _id: 'm1', role }, entry), true);
  } finally { lookup.mock.restore(); }
});
