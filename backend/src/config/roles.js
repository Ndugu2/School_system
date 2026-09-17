const ROLES = Object.freeze({
  SUPER_ADMIN: 'super-admin', ADMIN: 'admin', SUPERVISOR: 'supervisor',
  HEADTEACHER: 'headteacher', DIRECTOR_OF_STUDIES: 'director-of-studies',
  DEPUTY_HEAD: 'deputy-head', BURSAR: 'bursar', INVENTORY_MANAGER: 'inventory-manager',
  REGISTRAR: 'registrar', ACADEMIC_ADMIN: 'academic-admin', CLASS_TEACHER: 'class-teacher',
  TEACHER: 'teacher', STUDENT: 'student', PARENT: 'parent',
});

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HEADTEACHER];
const ACADEMIC_ROLES = [...ADMIN_ROLES, ROLES.SUPERVISOR, ROLES.DEPUTY_HEAD, ROLES.DIRECTOR_OF_STUDIES, ROLES.ACADEMIC_ADMIN, ROLES.CLASS_TEACHER, ROLES.TEACHER];
const STUDENT_MANAGEMENT_ROLES = [...ADMIN_ROLES, ROLES.REGISTRAR];
const FINANCE_ROLES = [...ADMIN_ROLES, ROLES.BURSAR];

const roleMatches = (role, allowedRoles) => {
  if (allowedRoles.includes(role)) return true;
  const inheritedRole = { [ROLES.HEADTEACHER]: ROLES.ADMIN, [ROLES.DIRECTOR_OF_STUDIES]: ROLES.ACADEMIC_ADMIN }[role];
  return Boolean(inheritedRole && allowedRoles.includes(inheritedRole));
};
const hasRole = (user, roles) => Boolean(user && roleMatches(user.role, roles));

module.exports = { ROLES, ADMIN_ROLES, ACADEMIC_ROLES, STUDENT_MANAGEMENT_ROLES, FINANCE_ROLES, hasRole, roleMatches };
