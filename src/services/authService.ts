import { Teacher } from '../types';

const AUTH_KEY = 'sksr_auth_teacher';
const TEACHERS_LOG_KEY = 'sksr_teachers_list';
const DEFAULT_PASS = 'jba2003';

export const loginTeacher = (nama: string, katalaluan: string): Teacher | null => {
  if (katalaluan === DEFAULT_PASS && nama.trim().length > 2) {
    const teacher: Teacher = { nama: nama.trim().toUpperCase(), lastLogin: new Date().toISOString() };
    localStorage.setItem(AUTH_KEY, JSON.stringify(teacher));
    
    // Log teacher into the users list
    const teachers = getTeachersList();
    const exists = teachers.find(t => t.nama.toLowerCase() === teacher.nama.toLowerCase());
    if (!exists) {
      teachers.push(teacher);
    } else {
      exists.lastLogin = teacher.lastLogin;
    }
    localStorage.setItem(TEACHERS_LOG_KEY, JSON.stringify(teachers));
    
    return teacher;
  }
  return null;
};

export const logoutTeacher = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const getCurrentTeacher = (): Teacher | null => {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
};

export const getTeachersList = (): Teacher[] => {
  const data = localStorage.getItem(TEACHERS_LOG_KEY);
  return data ? JSON.parse(data) : [];
};
