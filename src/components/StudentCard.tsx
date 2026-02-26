
import React from 'react';
import { motion } from 'motion/react';
import { UserX, RotateCcw } from 'lucide-react';
import { Student, AttendanceRecord, AbsenceReason } from '../types';

interface StudentCardProps {
  student: Student;
  record?: AttendanceRecord;
  onMarkAbsent: (id: string) => void;
  onMarkPresent: (id: string) => void;
  onSetReason: (id: string, reason: AbsenceReason) => void;
  onSetNote: (id: string, note: string) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  record,
  onMarkAbsent,
  onMarkPresent,
  onSetReason,
  onSetNote
}) => {
  const isAbsent = record?.status === 'Tidak Hadir';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative p-2.5 md:p-5 rounded-[16px] md:rounded-[32px] transition-all duration-500 border-2 ${
      isAbsent 
        ? 'bg-red-50 border-red-200 shadow-xl' 
        : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-2xl'
    }`}>
      {/* Selection Indicator */}
      {isAbsent && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 md:-top-3 md:-right-3 w-5 h-5 md:w-8 md:h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-20"
        >
          <UserX size={10} className="md:size-[16px]" />
        </motion.div>
      )}

      <div className="flex justify-between items-start mb-1.5 md:mb-4">
        <div className="flex-1">
          <span className="text-[6px] md:text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">{student.idMurid}</span>
          <h3 className="text-[10px] md:text-sm font-black text-slate-800 line-clamp-1 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">{student.namaMurid}</h3>
          <p className="text-[7px] md:text-[9px] text-slate-400 font-bold mt-0.5 md:mt-1 uppercase tracking-tighter">{student.noKP}</p>
        </div>
        <div className={`flex-shrink-0 px-1 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[6px] md:text-[7px] font-black shadow-sm text-white ${student.jantina === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
          {student.jantina === 'L' ? 'L' : 'P'}
        </div>
      </div>

      <div className="space-y-1.5 md:space-y-3">
        {!isAbsent ? (
          <div className="flex gap-1.5 md:gap-2">
            <button 
              onClick={() => onMarkAbsent(student.idMurid)}
              className="w-full py-2 md:py-3.5 rounded-lg md:rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all border border-slate-100 flex items-center justify-center gap-1.5 text-[7px] md:text-[9px] font-black uppercase tracking-widest"
              title="Tanda Tidak Hadir"
            >
              <UserX size={12} className="md:size-[16px]" />
              <span>TANDA TIDAK HADIR</span>
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5 md:space-y-3"
          >
            <div className="grid grid-cols-2 gap-1 md:gap-2">
              <button 
                onClick={() => onSetReason(student.idMurid, AbsenceReason.PONTENG)}
                className={`py-1.5 md:py-3 rounded-md md:rounded-xl text-[6px] md:text-[8px] font-black transition-all uppercase tracking-tighter ${
                  record?.sebab === AbsenceReason.PONTENG ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-orange-600 border border-orange-200'
                }`}
              >
                Tanpa Sebab
              </button>
              <button 
                onClick={() => onSetReason(student.idMurid, AbsenceReason.SAKIT)}
                className={`py-1.5 md:py-3 rounded-md md:rounded-xl text-[6px] md:text-[8px] font-black transition-all uppercase tracking-tighter ${
                  record?.sebab === AbsenceReason.SAKIT ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-blue-600 border border-blue-200'
                }`}
              >
                Bersebab
              </button>
            </div>
            <input 
              type="text"
              placeholder="Catatan..."
              value={record?.catatan || ''}
              onChange={(e) => onSetNote(student.idMurid, e.target.value)}
              className="w-full px-2 py-1.5 md:px-4 md:py-3 text-[8px] md:text-[10px] font-bold rounded-lg md:rounded-2xl border-2 border-red-100 focus:border-red-400 focus:ring-0 outline-none bg-white/50"
            />
            <button 
              onClick={() => onMarkPresent(student.idMurid)}
              className="w-full py-1 md:py-2 text-[6px] md:text-[8px] font-black text-red-500 hover:text-red-700 uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw size={8} className="md:size-[10px]" /> Batal & Set Hadir
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
