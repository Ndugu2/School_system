// Creates a small, repeatable local dataset for checking teacher assignment
// and academic entry permission enforcement. It never deletes existing data.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Teacher = require('../src/models/Teacher');
const AcademicYear = require('../src/models/AcademicYear');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const Student = require('../src/models/Student');
const AcademicPermission = require('../src/models/AcademicPermission');

const findOrCreateUser = async (email, name, role) => {
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, role, password: 'LocalDemoPass2026!' });
  return user;
};

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in backend/.env');
  await mongoose.connect(process.env.MONGODB_URI);

  const yearNumber = new Date().getFullYear();
  const year = await AcademicYear.findOneAndUpdate(
    { year: yearNumber },
    { $setOnInsert: { year: yearNumber, label: `${yearNumber} Demo Academic Year`, isActive: false, terms: [] } },
    { upsert: true, new: true }
  );
  const teacherUser = await findOrCreateUser('teacher.authz.demo@school.dev', 'Authorization Demo Teacher', 'teacher');
  const adminUser = await findOrCreateUser('admin.authz.demo@school.dev', 'Authorization Demo Admin', 'admin');
  const teacher = await Teacher.findOneAndUpdate(
    { user: teacherUser._id },
    { $set: { qualification: 'Demo qualification', phoneNumber: '+256700000001' } },
    { upsert: true, new: true }
  );

  const allowedClass = await Class.findOneAndUpdate(
    { name: 'Authorization Demo S1', academicYear: year._id },
    { $set: { name: 'Authorization Demo S1', level: 'S1', academicYear: year._id, academicYearValue: yearNumber, isActive: true } },
    { upsert: true, new: true }
  );
  const otherClass = await Class.findOneAndUpdate(
    { name: 'Authorization Demo S2', academicYear: year._id },
    { $set: { name: 'Authorization Demo S2', level: 'S2', academicYear: year._id, academicYearValue: yearNumber, isActive: true } },
    { upsert: true, new: true }
  );
  const allowedSubject = await Subject.findOneAndUpdate(
    { code: 'AUTHZ-DEMO' },
    { $set: { name: 'Authorization Demo Subject', code: 'AUTHZ-DEMO', department: 'Demo', type: 'compulsory', isCompulsory: true } },
    { upsert: true, new: true }
  );
  const otherSubject = await Subject.findOneAndUpdate(
    { code: 'AUTHZ-OTHER' },
    { $set: { name: 'Unassigned Demo Subject', code: 'AUTHZ-OTHER', department: 'Demo', type: 'compulsory', isCompulsory: true } },
    { upsert: true, new: true }
  );

  teacher.classes = [allowedClass._id];
  teacher.subjects = [allowedSubject._id];
  await teacher.save();

  const allowedStudentUser = await findOrCreateUser('student.authz.allowed@school.dev', 'Allowed Demo Student', 'student');
  const deniedStudentUser = await findOrCreateUser('student.authz.other@school.dev', 'Other Class Demo Student', 'student');
  const studentData = (user, studentId, studentClass, level) => ({
    user: user._id,
    studentId,
    currentClass: studentClass._id,
    currentClassLevel: level,
    dob: new Date('2012-01-01'),
    gender: 'Male',
    parentName: 'Demo Guardian',
    parentPhone: '+256700000002',
  });
  const allowedStudent = await Student.findOneAndUpdate(
    { studentId: 'AUTHZ-DEMO-STUDENT' },
    { $set: studentData(allowedStudentUser, 'AUTHZ-DEMO-STUDENT', allowedClass, 'S1') },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  const otherStudent = await Student.findOneAndUpdate(
    { studentId: 'AUTHZ-OTHER-STUDENT' },
    { $set: studentData(deniedStudentUser, 'AUTHZ-OTHER-STUDENT', otherClass, 'S2') },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const now = new Date();
  const permission = await AcademicPermission.findOneAndUpdate(
    { teacher: teacherUser._id, subject: allowedSubject._id, class: allowedClass._id, academicYear: yearNumber, term: 'Term 1' },
    { $set: { assessmentTypes: ['BOT', 'MOT', 'EOT'], startsAt: new Date(now.getTime() - 60_000), endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), grantedBy: adminUser._id, revokedAt: null } },
    { upsert: true, new: true }
  );

  console.log(JSON.stringify({
    teacher: { email: teacherUser.email, password: 'LocalDemoPass2026!', id: teacherUser._id },
    permission: { id: permission._id, class: allowedClass._id, subject: allowedSubject._id, term: permission.term, academicYear: yearNumber },
    students: { allowed: { id: allowedStudent._id, class: allowedClass._id }, otherClass: { id: otherStudent._id, class: otherClass._id } },
    unassignedSubject: otherSubject._id,
    expected: { allowedEntry: 'HTTP 200 when updating or 201 when creating /api/exam-results with assigned student/class/subject and EOT', deniedUnassignedSubject: 'HTTP 403', deniedOtherClassStudent: 'HTTP 403' },
  }, null, 2));
}

seed().catch(error => {
  console.error('Failed to seed teacher authorization demo:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
