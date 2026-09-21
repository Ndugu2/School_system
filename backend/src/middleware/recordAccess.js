const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const isSchoolManager = (role) => ['super-admin', 'admin', 'headteacher', 'hod', 'supervisor', 'deputy-head', 'director-of-studies', 'academic-admin', 'registrar'].includes(role);

const teacherAssignments = async (userId) => {
  const teacher = await Teacher.findOne({ user: userId }).select('classes subjects');
  return {
    classIds: (teacher?.classes || []).map(String),
    subjectIds: (teacher?.subjects || []).map(String),
  };
};

const canAccessStudent = async (user, studentId) => {
  if (isSchoolManager(user.role)) return true;
  const student = await Student.findById(studentId).select('user parentUser parentEmail currentClass');
  if (!student) return false;
  if (user.role === 'student') return String(student.user) === String(user._id);
  if (user.role === 'parent') return String(student.parentUser) === String(user._id) || student.parentEmail === user.email;
  if (['teacher', 'class-teacher'].includes(user.role)) {
    const { classIds } = await teacherAssignments(user._id);
    return classIds.includes(String(student.currentClass));
  }
  return false;
};

module.exports = { isSchoolManager, teacherAssignments, canAccessStudent };
