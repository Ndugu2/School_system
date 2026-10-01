const ROLES = Object.freeze({
  SUPER_ADMIN: 'super-admin', ADMIN: 'admin', SUPERVISOR: 'supervisor',
  HEADTEACHER: 'headteacher', HOD: 'hod', DIRECTOR_OF_STUDIES: 'director-of-studies',
  DEPUTY_HEAD: 'deputy-head', BURSAR: 'bursar', INVENTORY_MANAGER: 'inventory-manager',
  REGISTRAR: 'registrar', ACADEMIC_ADMIN: 'academic-admin', CLASS_TEACHER: 'class-teacher',
  TEACHER: 'teacher', STUDENT: 'student', PARENT: 'parent',
});

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HEADTEACHER];
const ACADEMIC_ROLES = [...ADMIN_ROLES, ROLES.SUPERVISOR, ROLES.DEPUTY_HEAD, ROLES.HOD, ROLES.DIRECTOR_OF_STUDIES, ROLES.ACADEMIC_ADMIN, ROLES.CLASS_TEACHER, ROLES.TEACHER];
const STUDENT_MANAGEMENT_ROLES = [...ADMIN_ROLES, ROLES.REGISTRAR];
const FINANCE_ROLES = [...ADMIN_ROLES, ROLES.BURSAR];

const roleMatches = (role, allowedRoles) => {
  if (allowedRoles.includes(role)) return true;
  const inheritedRole = { [ROLES.HEADTEACHER]: ROLES.ADMIN, [ROLES.HOD]: ROLES.ACADEMIC_ADMIN, [ROLES.DIRECTOR_OF_STUDIES]: ROLES.ACADEMIC_ADMIN }[role];
  return Boolean(inheritedRole && allowedRoles.includes(inheritedRole));
};
const hasRole = (user, roles) => Boolean(user && roleMatches(user.role, roles));

// Server-authoritative post-login landing. The frontend must honor this value
// returned by /auth/login and /auth/me (falling back to its own copy of the
// map only when it is missing) so that every role is routed to its dedicated
// portal view instead of a client-only heuristic.
const DEFAULT_HOME = 'dashboard';
const ROLE_HOME = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'dashboard',
  [ROLES.ADMIN]: 'dashboard',
  [ROLES.HEADTEACHER]: 'dashboard',
  [ROLES.DIRECTOR_OF_STUDIES]: 'dashboard',
  [ROLES.HOD]: 'dashboard',
  [ROLES.TEACHER]: 'dashboard',
  [ROLES.CLASS_TEACHER]: 'dashboard',
  [ROLES.STUDENT]: 'dashboard',
  [ROLES.PARENT]: 'parent_portal',
  [ROLES.BURSAR]: 'dashboard',
  [ROLES.SUPERVISOR]: 'dashboard',
  [ROLES.DEPUTY_HEAD]: 'dashboard',
  [ROLES.REGISTRAR]: 'dashboard',
  [ROLES.ACADEMIC_ADMIN]: 'dashboard',
  [ROLES.INVENTORY_MANAGER]: 'dashboard',
});
const getLandingForRole = (role) => ROLE_HOME[role] || DEFAULT_HOME;

module.exports = { ROLES, ADMIN_ROLES, ACADEMIC_ROLES, STUDENT_MANAGEMENT_ROLES, FINANCE_ROLES, hasRole, roleMatches, getLandingForRole, ROLE_HOME, DEFAULT_HOME };
