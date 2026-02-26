
import React from 'react';
import { motion } from 'motion/react';
import { Teacher } from '../types';

interface TeacherListProps {
  teachers: Teacher[];
}

export const TeacherList: React.FC<TeacherListProps> = ({ teachers }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Senarai Pengguna Sistem</h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Guru-guru yang telah mendaftar masuk</p>
      </div>

      <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-5">Nama Guru</th>
              <th className="px-8 py-5 text-right">Log Masuk Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {teachers.sort((a,b) => (b.lastLogin || '').localeCompare(a.lastLogin || '')).map((teacher, i) => (
              <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                      {teacher.nama.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-black text-slate-700 text-sm uppercase">{teacher.nama}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {teacher.lastLogin ? new Date(teacher.lastLogin).toLocaleString('ms-MY') : 'Tiada Data'}
                  </span>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={2} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Tiada rekod pengguna</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
