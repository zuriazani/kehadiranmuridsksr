
import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Palette, Users, PieChart as PieChartIcon, Calendar, Printer } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { AttendanceRecord, Student, AbsenceReason, PeriodType } from '../types';

interface AnalyticsProps {
  records: AttendanceRecord[];
  students: Student[];
  selectedClass: string;
}

// Vibrant Palette for Colorful Bars
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#fb923c', // Orange
  '#2dd4bf', // Teal
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export const AttendanceAnalytics: React.FC<AnalyticsProps> = ({ records, students, selectedClass }) => {
  const [viewMode, setViewMode] = useState<'Aliran' | 'Kelas'>('Aliran');
  const [period, setPeriod] = useState<PeriodType>('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

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
    const isNamePattern = upperC.includes('BIN ') || upperC.includes('BINTI ') || 
                          upperC.includes(' A/L ') || upperC.includes(' A/P ') ||
                          words.length > 5;
    if (isNamePattern) return false;
    const headers = ['BIL', 'ID MURID', 'KELAS', 'KELAS TERKINI', 'NAMA MURID', 'NO. KP', 'TARIKH LAHIR', 'JANTINA', 'KAUM', 'AGAMA'];
    if (headers.includes(upperC)) return false;
    const isGarbage = upperC.includes('SENARAI') || upperC.includes('RALAT') || 
                      upperC.includes('TIADA') || upperC.includes('EN-CA') ||
                      upperC.includes('KP/SURAT');
    if (isGarbage) return false;
    return !/[\\{}[\];]/.test(c);
  };

  const stats = useMemo(() => {
    const refDate = new Date(selectedDate);
    
    // Filter records based on period
    const periodRecords = records.filter(r => {
      const recordDate = new Date(r.tarikh);
      if (period === 'Daily') return r.tarikh === selectedDate;
      if (period === 'Weekly') {
        const diffTime = refDate.getTime() - recordDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      if (period === 'Monthly') {
        return recordDate.getMonth() === refDate.getMonth() && recordDate.getFullYear() === refDate.getFullYear();
      }
      if (period === 'Yearly') {
        return recordDate.getFullYear() === refDate.getFullYear();
      }
      return false;
    });

    // 1. Data Perbandingan (Bar Chart)
    const comparisonMap: Record<string, { name: string; total: number; hadir: number }> = {};
    
    periodRecords.forEach(r => {
      const key = viewMode === 'Aliran' ? getAliran(r.kelas) : r.kelasTerkini;
      if (!key || !isValidClass(key)) return;
      
      if (!comparisonMap[key]) {
        comparisonMap[key] = { name: key, total: 0, hadir: 0 };
      }
      comparisonMap[key].total++;
      if (r.status === 'Hadir') comparisonMap[key].hadir++;
    });

    const comparisonData = Object.values(comparisonMap)
      .map(item => ({
        ...item,
        peratus: item.total > 0 ? Number(((item.hadir / item.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 2. Data Timeline (Trend)
    const dateMap: Record<string, any> = {};
    const filteredRecords = selectedClass === 'Semua' 
      ? records 
      : records.filter(r => getAliran(r.kelas) === selectedClass || getAliran(r.kelasTerkini) === selectedClass);

    filteredRecords.forEach(r => {
      if (!dateMap[r.tarikh]) {
        dateMap[r.tarikh] = { date: r.tarikh, hadir: 0, ponteng: 0, sakit: 0 };
      }
      if (r.status === 'Hadir') dateMap[r.tarikh].hadir++;
      else if (r.sebab === AbsenceReason.PONTENG) dateMap[r.tarikh].ponteng++;
      else if (r.sebab === AbsenceReason.SAKIT) dateMap[r.tarikh].sakit++;
    });

    const timeline = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter(item => new Date(item.date) <= refDate)
      .slice(-14);

    // 3. Status Distribution (Pie Chart)
    const distributionRecords = selectedClass === 'Semua' 
      ? periodRecords 
      : periodRecords.filter(r => getAliran(r.kelas) === selectedClass || getAliran(r.kelasTerkini) === selectedClass);

    const totalPresent = distributionRecords.filter(r => r.status === 'Hadir').length;
    const totalPonteng = distributionRecords.filter(r => r.sebab === AbsenceReason.PONTENG).length;
    const totalSakit = distributionRecords.filter(r => r.sebab === AbsenceReason.SAKIT).length;

    const distribution = [
      { name: 'Hadir', value: totalPresent },
      { name: 'Dengan Kenyataan', value: totalSakit },
      { name: 'Tanpa Kenyataan', value: totalPonteng }
    ];

    // 4. Gender Data
    const genderMap: Record<string, { name: string; total: number; hadir: number }> = {
      'LELAKI': { name: 'Lelaki', total: 0, hadir: 0 },
      'PEREMPUAN': { name: 'Perempuan', total: 0, hadir: 0 }
    };

    const studentGenderMap: Record<string, string> = {};
    students.forEach(s => {
      if (s.idMurid) {
        studentGenderMap[s.idMurid.trim().toUpperCase()] = (s.jantina || '').toUpperCase();
      }
    });

    distributionRecords.forEach(r => {
      const studentId = r.idMurid ? r.idMurid.trim().toUpperCase() : '';
      const rawGender = studentGenderMap[studentId];
      if (!rawGender) return;
      
      const gender = rawGender.trim().toUpperCase();
      let targetKey = '';
      
      if (gender === 'LELAKI' || gender === 'L' || gender.startsWith('LEL')) targetKey = 'LELAKI';
      else if (gender === 'PEREMPUAN' || gender === 'P' || gender === 'PEREM' || gender.startsWith('PER')) targetKey = 'PEREMPUAN';
      
      if (targetKey && genderMap[targetKey]) {
        genderMap[targetKey].total++;
        if (r.status === 'Hadir') genderMap[targetKey].hadir++;
      }
    });

    const genderData = Object.values(genderMap).map(g => ({
      name: g.name,
      hadir: g.hadir,
      tidakHadir: g.total - g.hadir,
      peratus: g.total > 0 ? Number(((g.hadir / g.total) * 100).toFixed(1)) : 0
    }));

    return { timeline, distribution, comparisonData, genderData };
  }, [records, students, viewMode, selectedClass, period, selectedDate]);

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
      className="space-y-4 md:space-y-8 mt-4 md:mt-6"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .chart-container { break-inside: avoid !important; }
          body { background: white !important; }
          .glass-card, .bg-white { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      ` }} />
      {/* View Switcher & Period Selector Card */}
      <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-xl border border-slate-100 no-print">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6 items-end">
          <div className="lg:col-span-3 w-full">
            <h3 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight">Analisa Prestasi</h3>
            <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Konfigurasi Laporan</p>
          </div>

          <div className="lg:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarikh Rujukan</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-[10px] md:text-[11px] font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="lg:col-span-3 flex bg-slate-100 p-1 rounded-xl w-full">
            {(['Daily', 'Weekly', 'Monthly'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-lg text-[8px] font-black transition-all ${
                  period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'Daily' ? 'HARIAN' : p === 'Weekly' ? 'MINGGU' : 'BULAN'}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex bg-slate-100 p-1 rounded-xl w-full">
            {(['Aliran', 'Kelas'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2.5 rounded-lg text-[8px] font-black transition-all ${
                  viewMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'Aliran' ? 'ALIRAN' : 'KELAS'}
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
              {isPrinting ? 'SILA TUNGGU...' : 'CETAK ANALISA'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparison Chart */}
      <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-2xl border border-slate-100">
        <div className="flex justify-between items-start mb-6 md:mb-10">
          <div>
            <h3 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight">Perbandingan Kehadiran ({viewMode})</h3>
            <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              Data {period === 'Daily' ? 'Harian' : period === 'Weekly' ? 'Mingguan' : 'Bulanan'} ({selectedDate})
            </p>
          </div>
        </div>
        
        <div className="h-[300px] md:h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={8} 
                fontWeight="black" 
                axisLine={false}
                tickLine={false}
                dy={10}
                angle={viewMode === 'Kelas' ? -45 : 0}
                textAnchor={viewMode === 'Kelas' ? 'end' : 'middle'}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={8} 
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px' }}
                itemStyle={{ fontWeight: 'black', fontSize: '10px' }}
                formatter={(value: any) => [`${value}%`, 'Kadar']}
              />
              <Bar 
                dataKey="peratus" 
                radius={[8, 8, 0, 0]} 
                barSize={viewMode === 'Kelas' ? 15 : 40}
              >
                {stats.comparisonData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  />
                ))}
                <LabelList 
                  dataKey="peratus" 
                  position="top" 
                  style={{ fill: '#475569', fontSize: '8px', fontWeight: 'black' }} 
                  formatter={(val: number) => `${val}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 pb-12">
        <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4 md:mb-8">
            <Users size={16} className="text-indigo-500" />
            <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight">Kehadiran Mengikut Jantina</h3>
          </div>
          <div className="h-48 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.genderData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="black" 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 10px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="hadir" name="Hadir" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={30} />
                <Bar dataKey="tidakHadir" name="Tidak Hadir" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={30}>
                  <LabelList 
                    dataKey="peratus" 
                    position="right" 
                    style={{ fill: '#475569', fontSize: '10px', fontWeight: 'black' }} 
                    formatter={(val: number) => `${val}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4 md:mb-8">
            <PieChartIcon size={16} className="text-indigo-500" />
            <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight">Status Kehadiran</h3>
          </div>
          <div className="h-48 md:h-72 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.distribution}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 10px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={30} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
