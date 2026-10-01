const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const AcademicPermission = require('../models/AcademicPermission');
const { hasAssignedClass, canAccessStudent, hasAcademicEntryPermission } = require('./recordAccess');

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

const captureEntryQuery = async (user, scope = {}) => {
  let captured = null;
  const permissionLookup = mock.method(AcademicPermission, 'exists', async (query) => { captured = query; return true; });
  try {
    await hasAcademicEntryPermission(user, {
      subjectId: 'subject-1',
      classId: 'class-1',
      term: 'Term 1',
      academicYear: 2026,
      examType: 'EOT',
      ...scope,
    });
    return captured;
  } finally {
    permissionLookup.mock.restore();
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

test('marks entry window enforcement binds teacher scope to an unrevoked active permission', async () => {
  const user = { _id: 'teacher-1', role: 'teacher' };
  const query = await captureEntryQuery(user);
  assert.equal(query.teacher, 'teacher-1');
  assert.equal(query.subject, 'subject-1');
  assert.equal(query.class, 'class-1');
  assert.equal(query.term, 'Term 1');
  assert.equal(query.academicYear, 2026);
  assert.equal(query.assessmentTypes, 'EOT');
  assert.equal(query.revokedAt, null);
  assert.ok(query.startsAt.$lte instanceof Date);
  assert.ok(query.endsAt.$gte instanceof Date);
});

test('marks entry window must be active in real time for teachers', async () => {
  const user = { _id: 'teacher-1', role: 'teacher' };
  const active = await (async () => {
    let captured;
    const lookup = mock.method(AcademicPermission, 'exists', async (query) => { captured = query; return true; });
    try {
      await hasAcademicEntryPermission(user, { subjectId: 's', classId: 'c', term: 'Term 1', academicYear: 2026, examType: 'EOT' });
      const now = Date.now();
      return captured.startsAt.$lte.getTime() <= now && captured.endsAt.$gte.getTime() >= now;
    } finally { lookup.mock.restore(); }
  })();
  assert.equal(active, true);
});

test('an expired or not-yet-open window blocks teacher marks entry', async () => {
  const user = { _id: 'teacher-1', role: 'teacher' };
  const lookup = mock.method(AcademicPermission, 'exists', async () => false);
  try {
    assert.equal(await hasAcademicEntryPermission(user, { subjectId: 's', classId: 'c', term: 'Term 1', academicYear: 2026, examType: 'EOT' }), false);
  } finally { lookup.mock.restore(); }
});

test('non-teacher academic managers bypass the marks entry window check', async () => {
  for (const role of ['super-admin', 'admin', 'director-of-studies', 'academic-admin', 'hod']) {
    const lookup = mock.method(AcademicPermission, 'exists', async () => { throw new Error('should not query'); });
    try {
      assert.equal(await hasAcademicEntryPermission({ _id: 'u-1', role }, { subjectId: 's', classId: 'c', term: 'Term 1', academicYear: 2026, examType: 'EOT' }), true, role);
    } finally { lookup.mock.restore(); }
  }
});
