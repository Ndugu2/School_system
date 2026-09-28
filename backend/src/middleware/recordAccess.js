const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const AcademicPermission = require('../models/AcademicPermission');

const isSchoolManager = (role) => ['super-admin', 'admin', 'headteacher', 'hod', 'supervisor', 'deputy-head', 'director-of-studies', 'academic-admin', 'registrar'].includes(role);

const teacherAssignments = async (userId) => {
  const teacher = await Teacher.findOne({ user: userId }).select('classes subjects departments');
  return {
    classIds: (teacher?.classes || []).map(String),
    subjectIds: (teacher?.subjects || []).map(String),
    departments: teacher?.departments || [],
  };
};

const academicScope = async (user) => {
  if (['super-admin', 'admin', 'supervisor', 'deputy-head', 'director-of-studies', 'academic-admin'].includes(user.role)) {
    return { unrestricted: true, classIds: [], subjectIds: [] };
  }

  const assignments = await teacherAssignments(user._id);
  if (user.role === 'hod') {
    const subjectQuery = [];
    if (assignments.subjectIds.length > 0) subjectQuery.push({ _id: { $in: assignments.subjectIds } });
    if (assignments.departments.length > 0) subjectQuery.push({ department: { $in: assignments.departments } });
    const subjects = subjectQuery.length > 0 ? await Subject.find({ $or: subjectQuery }).select('_id') : [];
    return {
      unrestricted: false,
      classIds: assignments.classIds,
      subjectIds: [...new Set(subjects.map(subject => String(subject._id)))],
    };
  }

  return { unrestricted: false, classIds: assignments.classIds, subjectIds: assignments.subjectIds };
};

const hasAcademicEntryPermission = async (user, { subjectId, classId, term, academicYear, examType }) => {
  if (!['teacher', 'class-teacher'].includes(user.role)) return true;
  const now = new Date();
  return AcademicPermission.exists({
    teacher: user._id,
    subject: subjectId,
    class: classId,
    term,
    academicYear: parseInt(academicYear, 10),
    assessmentTypes: examType,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    revokedAt: null,
  });
};

const canAccessStudent = async (user, studentId) => {
  if (isSchoolManager(user.role)) return true;
  const student = await Student.findById(studentId).select('user parentUser parentEmail currentClass');
  if (!student) return false;
  if (user.role === 'student') return String(student.user) === String(user._id);
  if (user.role === 'parent') {
    const linkedAccount = student.parentUser && String(student.parentUser) === String(user._id);
    const linkedEmail = student.parentEmail && user.email && student.parentEmail.toLowerCase() === user.email.toLowerCase();
    return Boolean(linkedAccount || linkedEmail);
  }
  if (['teacher', 'class-teacher'].includes(user.role)) {
    const { classIds } = await teacherAssignments(user._id);
    return classIds.includes(String(student.currentClass));
  }
  return false;
};

const canTeachSubjectInClass = async (user, classId, subjectId) => {
  if (!['teacher', 'class-teacher'].includes(user.role)) return true;
  const { classIds, subjectIds } = await teacherAssignments(user._id);
  return hasAssignedClass(classIds, classId) && subjectIds.includes(String(subjectId));
};

const hasAssignedClass = (classIds, classId) => classIds.includes(String(classId));

module.exports = { isSchoolManager, teacherAssignments, academicScope, hasAcademicEntryPermission, canAccessStudent, canTeachSubjectInClass, hasAssignedClass };
