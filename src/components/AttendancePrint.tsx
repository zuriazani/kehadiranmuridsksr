
import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Calendar, Printer, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
import { AttendanceRecord, Student, PeriodType } from '../types';

interface AttendancePrintProps {
  records: AttendanceRecord[];
  students: Student[];
  referenceDate: string;
}

export const AttendancePrint: React.FC<AttendancePrintProps> = ({ records, students, referenceDate }) => {
  const [period, setPeriod] = useState<PeriodType>('Daily');
  const [reportType, setReportType] = useState<'Summary' | 'Absentee'>('Summary');
  const [selectedPrintDate, setSelectedPrintDate] = useState(referenceDate);
  const reportRef = useRef<HTMLDivElement>(null);

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
    const refDate = new Date(selectedPrintDate);
    
    const matchedRecords = records.filter(r => {
      const recordDate = new Date(r.tarikh);
      if (period === 'Daily') return r.tarikh === selectedPrintDate;
      if (period === 'Weekly') {
        const diffTime = Math.abs(refDate.getTime() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (period === 'Monthly') return recordDate.getMonth() === refDate.getMonth() && recordDate.getFullYear() === refDate.getFullYear();
      if (period === 'Yearly') return recordDate.getFullYear() === refDate.getFullYear();
      return false;
    });

    if (reportType === 'Summary') {
      const stats: Record<string, { aliran: string; kelas: string; hadir: number; tidakHadir: number; total: number }> = {};

      matchedRecords.forEach(r => {
        const key = r.kelasTerkini || r.kelas;
        const aliran = getAliran(r.kelas);
        if (!stats[key]) {
          stats[key] = { aliran: aliran, kelas: key, hadir: 0, tidakHadir: 0, total: 0 };
        }
        stats[key].total++;
        if (r.status === 'Hadir') stats[key].hadir++;
        else stats[key].tidakHadir++;
      });

      return Object.values(stats).sort((a, b) => a.kelas.localeCompare(b.kelas));
    } else {
      // Absentee Analysis
      const absenteeMap: Record<string, { idMurid: string; namaMurid: string; aliran: string; kelasTerkini: string; absentCount: number }> = {};
      
      matchedRecords.forEach(r => {
        if (r.status === 'Tidak Hadir') {
          if (!absenteeMap[r.idMurid]) {
            absenteeMap[r.idMurid] = {
              idMurid: r.idMurid,
              namaMurid: r.namaMurid,
              aliran: getAliran(r.kelas),
              kelasTerkini: r.kelasTerkini,
              absentCount: 0
            };
          }
          absenteeMap[r.idMurid].absentCount++;
        }
      });

      return Object.values(absenteeMap).sort((a, b) => {
        // Sort by absentCount descending
        if (b.absentCount !== a.absentCount) {
          return b.absentCount - a.absentCount;
        }
        // Then by class
        const classComp = a.kelasTerkini.localeCompare(b.kelasTerkini);
        if (classComp !== 0) return classComp;
        // Then by name
        return a.namaMurid.localeCompare(b.namaMurid);
      });
    }
  }, [records, selectedPrintDate, period, reportType]);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    if (typeof window !== 'undefined') {
      // Set title for the PDF filename
      const originalTitle = document.title;
      const reportTitle = `Laporan_${reportType === 'Summary' ? 'Ringkasan' : 'Analisa_Ketidakhadiran'}_${period}_${selectedPrintDate}`;
      document.title = reportTitle;
      
      // Ensure window is focused
      window.focus();
      
      // Small delay to ensure title is registered and UI responds
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
        
        // Restore title after a delay
        setTimeout(() => {
          document.title = originalTitle;
        }, 1000);
      }, 250);
    }
  };

  const handleDownloadCSV = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reportData.length === 0) return;
    
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'Summary') {
      headers = ['Aliran', 'Kelas Terkini', 'Hadir', 'Tidak Hadir', 'Jumlah Sesi', 'Peratus (%)'];
      rows = (reportData as any[]).map(d => {
        const perc = d.total > 0 ? ((d.hadir / d.total) * 100).toFixed(2) : "0.00";
        return [d.aliran, d.kelas, d.hadir, d.tidakHadir, d.total, perc];
      });
    } else {
      headers = ['ID Murid', 'Nama Murid', 'Aliran', 'Kelas Terkini', 'Bilangan Tidak Hadir'];
      rows = (reportData as any[]).map(d => [d.idMurid, d.namaMurid, d.aliran, d.kelasTerkini, d.absentCount.toString()]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.map(r => r.map(v => `"${v}"`).join(',')).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_${reportType}_${period}_${selectedPrintDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content { padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
          .print-break-avoid { break-inside: avoid !important; }
        }
      ` }} />
      {/* Control Panel (Hidden on Print) */}
      <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[40px] shadow-xl border border-slate-100 no-print">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6 items-end">
          <div className="lg:col-span-3 w-full">
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">Pilihan Cetakan</h2>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sediakan laporan fizikal</p>
          </div>

          <div className="lg:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarikh Laporan</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input 
                type="date" 
                value={selectedPrintDate} 
                onChange={(e) => setSelectedPrintDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-[10px] md:text-[11px] font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="lg:col-span-3 flex bg-slate-100 p-1 rounded-xl w-full">
            {(['Summary', 'Absentee'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setReportType(type)}
                className={`flex-1 py-2.5 rounded-lg text-[8px] font-black transition-all ${
                  reportType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'Summary' ? 'RINGKASAN' : 'ANALISA TH'}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex bg-slate-100 p-1 rounded-xl w-full">
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as PeriodType[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-lg text-[8px] font-black transition-all ${
                  period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'Daily' ? 'HARI' : p === 'Weekly' ? 'MGG' : p === 'Monthly' ? 'BLN' : 'THN'}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex gap-2 w-full">
            <button 
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className={`flex-1 ${isPrinting ? 'bg-slate-400' : 'bg-slate-900 hover:bg-black'} text-white px-4 py-3 rounded-xl text-[8px] md:text-[9px] font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95`}
            >
              <FileText size={12} className={isPrinting ? 'animate-pulse' : ''} /> 
              {isPrinting ? 'SILA TUNGGU...' : 'PDF / CETAK'}
            </button>
            <button 
              type="button"
              onClick={handleDownloadCSV}
              className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl text-[8px] md:text-[9px] font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <FileSpreadsheet size={12} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview / Print View */}
      <div ref={reportRef} className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[48px] shadow-2xl border border-slate-100 print:shadow-none print:border-none print:p-0 print-content">
        <div className="text-center mb-8 md:mb-12 border-b-4 border-double border-slate-100 pb-8 md:pb-10">
          <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase mb-2">
            {reportType === 'Summary' ? 'Laporan Analisa Kehadiran Murid' : 'Laporan Analisa Murid Tidak Hadir'}
          </h1>
          <h2 className="text-lg md:text-xl font-bold text-slate-600 uppercase mb-4">SK SIMPANG RENGAM</h2>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Jenis: {reportType === 'Summary' ? 'RINGKASAN KELAS' : 'ANALISA KETIDAKHADIRAN'}</span>
            <span>Tempoh: {period === 'Daily' ? 'HARIAN' : period === 'Weekly' ? 'MINGGUAN' : period === 'Monthly' ? 'BULANAN' : 'TAHUNAN'}</span>
            <span>Tarikh: {new Date(selectedPrintDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>Dijana: {new Date().toLocaleString('ms-MY')}</span>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Bil</th>
                {reportType === 'Summary' ? (
                  <>
                    <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Aliran</th>
                    <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Kelas Terkini</th>
                    <th className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-black uppercase tracking-tighter">Hadir</th>
                    <th className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-black uppercase tracking-tighter">T. Hadir</th>
                    <th className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-black uppercase tracking-tighter">Jumlah</th>
                    <th className="py-4 px-2 md:px-4 text-right text-[9px] md:text-xs font-black uppercase tracking-tighter">Peratus (%)</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Nama Murid</th>
                    <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Aliran</th>
                    <th className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-tighter">Kelas Terkini</th>
                    <th className="py-4 px-2 md:px-4 text-right text-[9px] md:text-xs font-black uppercase tracking-tighter">Bil. T. Hadir</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((d: any, i: number) => {
                if (reportType === 'Summary') {
                  const perc = d.total > 0 ? (d.hadir / d.total) * 100 : 0;
                  return (
                    <tr key={i} className="print:break-inside-avoid">
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-bold text-slate-400">{i + 1}</td>
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black text-slate-800 uppercase">{d.aliran}</td>
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-bold text-indigo-600 uppercase">{d.kelas}</td>
                      <td className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-black text-emerald-600">{d.hadir}</td>
                      <td className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-black text-red-500">{d.tidakHadir}</td>
                      <td className="py-4 px-2 md:px-4 text-center text-[9px] md:text-xs font-bold text-slate-500">{d.total}</td>
                      <td className="py-4 px-2 md:px-4 text-right text-[10px] md:text-sm font-black text-slate-900">{perc.toFixed(1)}%</td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={i} className="print:break-inside-avoid">
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-bold text-slate-400">{i + 1}</td>
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-black text-slate-800 uppercase">{d.namaMurid}</td>
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-bold text-slate-500 uppercase">{d.aliran}</td>
                      <td className="py-4 px-2 md:px-4 text-[9px] md:text-xs font-bold text-indigo-600 uppercase">{d.kelasTerkini}</td>
                      <td className="py-4 px-2 md:px-4 text-right text-[10px] md:text-sm font-black text-red-600">{d.absentCount} Hari</td>
                    </tr>
                  );
                }
              })}
            </tbody>
            {reportType === 'Summary' && reportData.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50">
                  <td colSpan={3} className="py-6 px-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-widest">Jumlah Keseluruhan</td>
                  <td className="py-6 px-2 md:px-4 text-center text-[9px] md:text-xs font-black">{(reportData as any[]).reduce((a, b) => a + b.hadir, 0)}</td>
                  <td className="py-6 px-2 md:px-4 text-center text-[9px] md:text-xs font-black">{(reportData as any[]).reduce((a, b) => a + b.tidakHadir, 0)}</td>
                  <td className="py-6 px-2 md:px-4 text-center text-[9px] md:text-xs font-black">{(reportData as any[]).reduce((a, b) => a + b.total, 0)}</td>
                  <td className="py-6 px-2 md:px-4 text-right text-[10px] md:text-sm font-black">
                    {(() => {
                      const totalH = (reportData as any[]).reduce((a, b) => a + b.hadir, 0);
                      const totalT = (reportData as any[]).reduce((a, b) => a + b.total, 0);
                      return totalT > 0 ? ((totalH / totalT) * 100).toFixed(1) : "0.0";
                    })()}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {reportData.map((d: any, i: number) => (
            <div key={i} className="py-4 space-y-2">
              {reportType === 'Summary' ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-800 uppercase">{d.kelas}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{d.aliran}</p>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600">
                      {((d.hadir / d.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex gap-3 text-[8px] font-black uppercase">
                    <span className="text-emerald-600">H: {d.hadir}</span>
                    <span className="text-red-500">TH: {d.tidakHadir}</span>
                    <span className="text-slate-400">J: {d.total}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-800 uppercase leading-tight">{d.namaMurid}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{d.idMurid}</p>
                    </div>
                    <span className="text-[10px] font-black text-red-600">
                      {d.absentCount} HARI
                    </span>
                  </div>
                  <div className="flex gap-2 text-[8px] font-bold uppercase text-slate-400">
                    <span>{d.aliran}</span>
                    <span>•</span>
                    <span className="text-indigo-600">{d.kelasTerkini}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {reportData.length === 0 && (
          <div className="py-20 text-center text-slate-400 font-black uppercase text-[10px]">Tiada data untuk tarikh/tempoh ini</div>
        )}

        <div className="mt-16 md:mt-20 grid grid-cols-2 gap-10 md:gap-20 text-center opacity-0 print:opacity-100 h-0 overflow-hidden print:h-auto print:overflow-visible">
          <div className="border-t border-black pt-4">
            <p className="text-[10px] font-black uppercase">Disediakan Oleh:</p>
            <p className="mt-12 font-bold text-xs uppercase">Guru Bertugas</p>
          </div>
          <div className="border-t border-black pt-4">
            <p className="text-[10px] font-black uppercase">Disahkan Oleh:</p>
            <p className="mt-12 font-bold text-xs uppercase">Guru Besar / PK HEM</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
