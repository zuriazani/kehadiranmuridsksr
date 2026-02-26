
import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Archive, TrendingUp, BarChart3, Printer } from 'lucide-react';
import { AttendanceRecord, Student, PeriodType } from '../types';

interface AttendanceReportProps {
  records: AttendanceRecord[];
  students: Student[];
  referenceDate: string;
}

interface StatItem {
  total: number;
  present: number;
  students: number;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ records, students, referenceDate }) => {
  const [period, setPeriod] = useState<PeriodType>('Daily');
  const [reportDate, setReportDate] = useState(referenceDate);

  const filteredRecords = useMemo(() => {
    const refDate = new Date(reportDate);
    
    return records.filter(r => {
      const recordDate = new Date(r.tarikh);
      
      if (period === 'Daily') {
        return r.tarikh === reportDate;
      } else if (period === 'Weekly') {
        const diffTime = Math.abs(refDate.getTime() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (period === 'Monthly') {
        return recordDate.getMonth() === refDate.getMonth() && recordDate.getFullYear() === refDate.getFullYear();
      } else if (period === 'Yearly') {
        return recordDate.getFullYear() === refDate.getFullYear();
      }
      return false;
    });
  }, [records, reportDate, period]);

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

  const reportData = useMemo(() => {
    const classStats: Record<string, StatItem> = {};
    const streamStats: Record<string, StatItem> = {};

    students.forEach(s => {
      const aliran = getAliran(s.kelas);
      const kelas = s.kelasTerkini || s.kelas;

      if (!streamStats[aliran]) streamStats[aliran] = { total: 0, present: 0, students: 0 };
      if (!classStats[kelas]) classStats[kelas] = { total: 0, present: 0, students: 0 };
      
      streamStats[aliran].students++;
      classStats[kelas].students++;
    });

    filteredRecords.forEach(r => {
      const aliran = getAliran(r.kelas);
      const kelas = r.kelasTerkini || r.kelas;

      if (!streamStats[aliran]) streamStats[aliran] = { total: 0, present: 0, students: 0 };
      if (!classStats[kelas]) classStats[kelas] = { total: 0, present: 0, students: 0 };

      streamStats[aliran].total++;
      if (r.status === 'Hadir') streamStats[aliran].present++;
      
      classStats[kelas].total++;
      if (r.status === 'Hadir') classStats[kelas].present++;
    });

    return { classStats, streamStats };
  }, [filteredRecords, students]);

  const getPercentage = (present: number, total: number) => {
    if (total === 0) return 0;
    return (present / total) * 100;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (percentage >= 85) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-emerald-500';
    if (percentage >= 85) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.focus();
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 250);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .bg-white { border: none !important; box-shadow: none !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
        }
      ` }} />
      {/* Header & Filter */}
      <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Laporan Kehadiran</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Analisa Prestasi Aliran & Kelas</p>
          </div>

          <div className="lg:col-span-4">
             <div className="relative group">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10" />
                <input 
                  type="date" 
                  value={reportDate} 
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-10 pr-4 text-[11px] font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
             </div>
          </div>
          
          <div className="lg:col-span-4 flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 px-4 py-3 rounded-xl text-[9px] whitespace-nowrap font-black transition-all ${
                  period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'Daily' ? 'HARIAN' : p === 'Weekly' ? 'MINGGU' : p === 'Monthly' ? 'BULAN' : 'TAHUN'}
              </button>
            ))}
          </div>

          <div className="lg:col-span-12 mt-2">
            <button 
              onClick={handlePrint}
              disabled={isPrinting}
              className={`w-full md:w-auto ${isPrinting ? 'bg-slate-400' : 'bg-slate-900 hover:bg-black'} text-white px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95`}
            >
              <Printer size={14} className={isPrinting ? 'animate-pulse' : ''} /> 
              {isPrinting ? 'SILA TUNGGU...' : 'CETAK LAPORAN'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Rumusan Aliran */}
        <div className="lg:col-span-5 bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Rumusan Aliran</h3>
            <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">Global</span>
          </div>
          <div className="p-4 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-4 text-left">Aliran</th>
                    <th className="px-2 py-4 text-center">Hadir</th>
                    <th className="px-2 py-4 text-center">T. Hadir</th>
                    <th className="px-4 py-4 text-right">Peratus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(Object.entries(reportData.streamStats) as [string, StatItem][]).sort((a, b) => a[0].localeCompare(b[0])).map(([aliran, stat]) => {
                    const perc = getPercentage(stat.present, stat.total);
                    const absent = stat.total - stat.present;
                    return (
                      <tr key={aliran} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-5">
                          <span className="font-black text-slate-700 block text-sm">{aliran}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{stat.students} Murid</span>
                        </td>
                        <td className="px-2 py-5 text-center">
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{stat.present}</span>
                        </td>
                        <td className="px-2 py-5 text-center">
                          <span className={`text-xs font-black ${absent > 0 ? 'text-red-600 bg-red-50' : 'text-slate-300 bg-slate-50'} px-2 py-1 rounded-lg`}>{absent}</span>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 ${getStatusColor(perc)}`}>
                            {perc.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Object.keys(reportData.streamStats).length === 0 && (
              <div className="py-20 text-center">
                <Archive size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tiada rekod statistik</p>
              </div>
            )}
          </div>
        </div>

        {/* Analisa Setiap Kelas */}
        <div className="lg:col-span-7 bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Analisa Setiap Kelas</h3>
            <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">Spesifik</span>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto custom-scrollbar">
            {(Object.entries(reportData.classStats) as [string, StatItem][]).sort((a, b) => a[0].localeCompare(b[0])).map(([kelas, stat]) => {
              const perc = getPercentage(stat.present, stat.total);
              const absent = stat.total - stat.present;
              return (
                <div key={kelas} className="p-5 rounded-3xl border-2 border-slate-50 hover:border-indigo-100 hover:shadow-md transition-all group bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-slate-800 text-base group-hover:text-indigo-600 transition-colors uppercase tracking-tighter leading-tight">{kelas}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-md uppercase">H: {stat.present}</span>
                        <span className={`text-[9px] font-black px-2 rounded-md uppercase ${absent > 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'}`}>TH: {absent}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${perc >= 85 ? 'text-slate-800' : 'text-red-600'}`}>
                      {perc.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getBarColor(perc)} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{stat.students} Murid Berdaftar</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${getStatusColor(perc)}`}>
                      {perc >= 95 ? 'Cemerlang' : perc >= 85 ? 'Memuaskan' : 'Perhatian'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
