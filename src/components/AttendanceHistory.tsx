
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Download, Search, Database } from 'lucide-react';
import { AttendanceRecord, Student } from '../types';
import { exportToCSV, fetchAttendanceFromCloud, saveAttendance } from '../services/attendanceService';

interface AttendanceHistoryProps {
  allAttendance: AttendanceRecord[];
  students: Student[];
  onRetrySync: () => void;
  onRefreshData: (newData: AttendanceRecord[]) => void;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ allAttendance, students, onRetrySync, onRefreshData }) => {
  const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [filterClass, setFilterClass] = useState('Semua');
  const [isPulling, setIsPulling] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());
  const [syncCount, setSyncCount] = useState(0);

  const isDefaultUrl = useMemo(() => {
    const resultsUrl = localStorage.getItem('sksr_config_results_url');
    return !resultsUrl || resultsUrl.includes('2PACX-1vRL_Gj0-C1-8wW8N6f9b8U5j7_j3I0-k5v8n0');
  }, []);

  const isAliran = (c: string): boolean => {
    const upper = c.toUpperCase();
    return upper.startsWith('TAHUN') || upper.startsWith('PRA');
  };

  const getAliran = (c: string): string => {
    if (!c) return 'Tiada Aliran';
    const upper = c.toUpperCase().trim();
    if (upper.startsWith('PRA')) return 'Prasekolah';
    if (upper.startsWith('TAHUN')) {
      const num = upper.match(/\d+/);
      return num ? `Tahun ${num[0]}` : upper;
    }
    const match = upper.match(/^(\d)/);
    if (match) return `Tahun ${match[1]}`;
    return c;
  };

  const isValidClass = (c: any): boolean => {
    if (!c || typeof c !== 'string') return false;
    const upperC = c.toUpperCase().trim();
    if (upperC.length < 1 || upperC.length > 30) return false;
    
    const words = upperC.split(/\s+/);
    
    // Names usually have BIN/BINTI or are very long
    const isNamePattern = upperC.includes('BIN ') || upperC.includes('BINTI ') || 
                          upperC.includes(' A/L ') || upperC.includes(' A/P ') ||
                          words.length > 5;
    if (isNamePattern) return false;

    // Strict header detection
    const headers = ['BIL', 'ID MURID', 'KELAS', 'KELAS TERKINI', 'NAMA MURID', 'NO. KP', 'TARIKH LAHIR', 'JANTINA', 'KAUM', 'AGAMA'];
    if (headers.includes(upperC)) return false;

    // Garbage detection
    const isGarbage = upperC.includes('SENARAI') || upperC.includes('RALAT') || 
                      upperC.includes('TIADA') || upperC.includes('EN-CA') ||
                      upperC.includes('KP/SURAT');
    if (isGarbage) return false;

    return !/[\\{}[\];]/.test(c);
  };

  const uniqueSubClasses = useMemo(() => {
    const fromStudents = students.map(s => s.kelasTerkini || s.kelas);
    const fromAttendance = allAttendance.map(r => r.kelasTerkini || r.kelas);
      
    const combined = [...fromStudents, ...fromAttendance];
    const classes = Array.from(new Set(combined))
      .filter(c => {
        if (!isValidClass(c)) return false;
        // A specific class is valid if it's NOT the Aliran name itself
        const aliranName = getAliran(c);
        return c !== aliranName;
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      
    return ['Semua', ...classes];
  }, [students, allAttendance]);

  const filteredRecords = useMemo(() => {
    return allAttendance.filter(r => {
      const matchDate = r.tarikh === filterDate;
      const matchClass = filterClass === 'Semua' || r.kelasTerkini === filterClass;
      return matchDate && matchClass;
    });
  }, [allAttendance, filterDate, filterClass]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter(r => r.status === 'Hadir').length;
    const absent = total - present;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    return { total, present, absent, percentage };
  }, [filteredRecords]);

  const tableRecords = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => (a.kelasTerkini || '').localeCompare(b.kelasTerkini || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [filteredRecords]);

  const handlePullFromCloud = async () => {
    setIsPulling(true);
    try {
      const cloudData = await fetchAttendanceFromCloud();
      if (cloudData.length > 0) {
        const updated = saveAttendance(cloudData);
        onRefreshData(updated);
        setLastSync(new Date().toLocaleTimeString());
        setSyncCount(cloudData.length);
      } else {
        setSyncCount(0);
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsPulling(false);
    }
  };

  useEffect(() => {
    handlePullFromCloud();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 md:space-y-8"
    >
      <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-xl border border-slate-100 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4 md:gap-6">
          <div className="w-full lg:w-auto flex flex-col md:flex-row gap-3 md:gap-4 flex-1">
            <div className="space-y-1 md:space-y-2 flex-1">
              <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase ml-1">Tarikh</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-2.5 md:py-3 px-3 md:px-5 text-[11px] md:text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div className="space-y-1 md:space-y-2 flex-1">
              <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase ml-1">Kelas</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-2.5 md:py-3 px-3 md:px-5 text-[11px] md:text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none">
                {uniqueSubClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 w-full lg:w-auto">
            <button onClick={handlePullFromCloud} disabled={isPulling} className="flex-1 lg:flex-none bg-indigo-600 text-white px-4 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
              <RefreshCw size={12} className={isPulling ? 'animate-spin' : ''} />
              {isPulling ? 'MENYEMAK...' : 'KEMASKINI'}
            </button>
            <button onClick={() => exportToCSV(filteredRecords, `Rekod_${filterClass}_${filterDate}`)} disabled={filteredRecords.length === 0} className="flex-1 lg:flex-none bg-slate-900 text-white px-4 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
              <Download size={12} /> EXPORT
            </button>
          </div>
        </div>
        <div className="mt-3 md:mt-4 flex flex-col gap-2">
           <div className="flex items-center gap-2">
             <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isPulling ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
             <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               Status: {isPulling ? 'Menyemak...' : `Data: ${syncCount} rekod`} ({lastSync})
             </p>
           </div>
           {isDefaultUrl && (
             <div className="flex items-center gap-2 bg-amber-50 p-1.5 md:p-2 rounded-lg border border-amber-100">
               <Database size={8} className="text-amber-600" />
               <p className="text-[7px] md:text-[8px] font-bold text-amber-700 uppercase">
                 Amaran: URL Default dikesan. Sila semak Tetapan.
               </p>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-3 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm text-center">
          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Jumlah</p>
          <p className="text-lg md:text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm text-center">
          <p className="text-[7px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5 md:mb-1">Hadir</p>
          <p className="text-lg md:text-2xl font-black text-emerald-600">{stats.present}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm text-center">
          <p className="text-[7px] md:text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5 md:mb-1">T. Hadir</p>
          <p className="text-lg md:text-2xl font-black text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm text-center">
          <p className="text-[7px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 md:mb-1">Peratus</p>
          <p className="text-lg md:text-2xl font-black text-indigo-600">{stats.percentage.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl">
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-2">
          <h3 className="font-black text-slate-800 text-[10px] md:text-xs tracking-widest uppercase">Pangkalan Data Pusat</h3>
          <span className="text-[7px] md:text-[9px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">{filterClass} • {filterDate}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                <th className="px-4 md:px-8 py-3 md:py-5">Nama Murid</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-center">Kelas</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-center">Kelas Terkini</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-center">Status</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-right">Sebab/Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {tableRecords.map((r, i) => (
                <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 md:px-8 py-3 md:py-4">
                    <span className="font-black text-slate-700 block text-[10px] md:text-xs uppercase truncate max-w-[150px] md:max-w-none">{r.namaMurid}</span>
                    <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">{r.idMurid}</span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-4 text-center">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase">{getAliran(r.kelas)}</span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-4 text-center">
                    <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase">{r.kelasTerkini}</span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-4 text-center">
                    <span className={`text-[8px] md:text-[10px] font-black px-2 py-1 rounded uppercase ${r.status === 'Hadir' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-4 text-right">
                    <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase italic">
                      {r.status === 'Tidak Hadir' ? (r.sebab || 'Tiada Sebab') : '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {tableRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 md:py-24 text-center">
                    <div className="flex flex-col items-center gap-2 md:gap-4">
                      <Search size={32} className="md:size-[48px] text-slate-200" />
                      <p className="text-slate-400 text-[9px] md:text-xs font-black uppercase tracking-widest">Tiada rekod</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
