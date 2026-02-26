
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  PieChart, 
  FileText, 
  Database, 
  Printer, 
  Users, 
  Settings as SettingsIcon,
  Calendar,
  Search,
  CloudUpload,
  Loader2,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { fetchStudents } from './services/studentService';
import { saveAttendance, getAttendance, syncToGoogleSheets, fetchAttendanceFromCloud } from './services/attendanceService';
import { loginTeacher, logoutTeacher, getCurrentTeacher, getTeachersList } from './services/authService';
import { Student, AttendanceRecord, AbsenceReason, Teacher } from './types';
import { StudentCard } from './components/StudentCard';
import { AttendanceAnalytics } from './components/AttendanceAnalytics';
import { AttendanceReport } from './components/AttendanceReport';
import { AttendancePrint } from './components/AttendancePrint';
import { AttendanceHistory } from './components/AttendanceHistory';
import { TeacherList } from './components/TeacherList';
import { Settings } from './components/Settings';

const SCHOOL_BADGE_URL = "https://i.postimg.cc/7hQ5cNkC/LENCANA.png";

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedSubClass, setSelectedSubClass] = useState('Semua');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [activeTab, setActiveTab] = useState<'attendance' | 'analytics' | 'history' | 'report' | 'print' | 'teachers' | 'settings'>('attendance');
  const [tempRecords, setTempRecords] = useState<Record<string, AttendanceRecord>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const todayDisplay = useMemo(() => {
    return new Date().toLocaleDateString('ms-MY', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
  }, []);

  const [configError, setConfigError] = useState<{type: 'student' | 'attendance', message: string} | null>(null);

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

    // Strict header detection
    const headers = ['BIL', 'ID MURID', 'KELAS', 'KELAS TERKINI', 'NAMA MURID', 'NO. KP', 'TARIKH LAHIR', 'JANTINA', 'KAUM', 'AGAMA'];
    if (headers.includes(upperC)) return false;

    const isGarbage = upperC.includes('SENARAI') || upperC.includes('RALAT') || 
                      upperC.includes('TIADA') || upperC.includes('EN-CA') ||
                      upperC.includes('KP/SURAT');
    if (isGarbage) return false;

    return !/[\\{}[\];]/.test(c);
  };

  const loadData = async (isInitial = false) => {
    setIsSyncing(true);
    setConfigError(null);
    try {
      const studentData = await fetchStudents();
      setStudents(studentData);
      
      let attendanceData = getAttendance();
      
      // Smart Healing: If we have students, try to fix corrupted attendance records
      if (studentData.length > 0) {
        let needsRepair = false;
        const repaired = attendanceData.map(r => {
          if (!isValidClass(r.kelas) || !isValidClass(r.kelasTerkini)) {
            const student = studentData.find(s => s.idMurid === r.idMurid);
            if (student) {
              needsRepair = true;
              return {
                ...r,
                kelas: student.kelas,
                kelasTerkini: student.kelasTerkini || student.kelas
              };
            }
          }
          return r;
        });
        
        if (needsRepair) {
          attendanceData = saveAttendance(repaired);
        }
      }
      
      setAllAttendance(attendanceData);

      const cloudData = await fetchAttendanceFromCloud();
      if (cloudData && cloudData.length > 0) {
        setAllAttendance(saveAttendance(cloudData));
        setSyncError(false);
      }
      setLastSyncTime(new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      setSyncError(true);
    } finally {
      if (isInitial) setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const auth = getCurrentTeacher();
    if (auth) setCurrentTeacher(auth);
    
    loadData(true);
    const interval = setInterval(() => loadData(false), 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const classRecs = allAttendance.filter(r => r.tarikh === selectedDate);
    const recMap: Record<string, AttendanceRecord> = {};
    classRecs.forEach(r => { recMap[r.idMurid] = r; });
    setTempRecords(recMap);
  }, [selectedDate, allAttendance]);

  const markedClasses = useMemo(() => {
    const dailyRecords = allAttendance.filter(r => r.tarikh === selectedDate);
    const marked = new Set<string>();
    dailyRecords.forEach(r => {
      marked.add(r.kelasTerkini || r.kelas);
    });
    return marked;
  }, [allAttendance, selectedDate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = loginTeacher(loginName, loginPass);
    if (teacher) {
      setCurrentTeacher(teacher);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    logoutTeacher();
    setCurrentTeacher(null);
    setLoginPass('');
  };


  useEffect(() => {
    if (['attendance', 'history', 'report', 'print', 'analytics'].includes(activeTab)) {
      loadData(false);
    }
  }, [activeTab]);

  const classes = useMemo(() => {
    const alirans = students.map(s => getAliran(s.kelas)).filter(isValidClass);
    const unique = Array.from(new Set(alirans)).sort((a, b) => {
      if (a.toUpperCase().includes('PRA')) return -1;
      if (b.toUpperCase().includes('PRA')) return 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return ['Semua', ...unique];
  }, [students]);

  const subClasses = useMemo(() => {
    const filtered = selectedClass === 'Semua' 
      ? students 
      : students.filter(s => getAliran(s.kelas) === selectedClass);
    
    const unique = Array.from(new Set(filtered.map(s => s.kelasTerkini).filter(isValidClass)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      
    return ['Semua', ...unique];
  }, [students, selectedClass]);

  const filteredAndGroupedStudents = useMemo(() => {
    let filtered = selectedClass === 'Semua' 
      ? students 
      : students.filter(s => getAliran(s.kelas) === selectedClass);
      
    if (selectedSubClass !== 'Semua') {
      filtered = filtered.filter(s => s.kelasTerkini === selectedSubClass);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.namaMurid.toLowerCase().includes(q) || s.idMurid.toLowerCase().includes(q)
      );
    }

    const groups: Record<string, Student[]> = {};
    filtered.forEach(s => {
      const key = s.kelasTerkini || s.kelas;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.keys(groups).sort().map(name => ({ name, list: groups[name] }));
  }, [students, selectedClass, selectedSubClass, searchQuery]);

  const liveSummary = useMemo(() => {
    const currentList = filteredAndGroupedStudents.flatMap(g => g.list);
    const total = currentList.length;
    let absent = 0;

    currentList.forEach(s => {
      const rec = tempRecords[s.idMurid];
      if (rec && rec.status === 'Tidak Hadir') {
        absent++;
      }
    });

    const present = total - absent;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    return { total, present, absent, percentage };
  }, [filteredAndGroupedStudents, tempRecords]);

  const handleMarkAbsent = (id: string) => {
    const student = students.find(s => s.idMurid === id);
    if (!student) return;
    setTempRecords(prev => ({
      ...prev,
      [id]: {
        idMurid: id, namaMurid: student.namaMurid, kelas: student.kelas, kelasTerkini: student.kelasTerkini,
        tarikh: selectedDate, status: 'Tidak Hadir', sebab: AbsenceReason.PONTENG, catatan: '', syncStatus: 'local',
        recordedBy: currentTeacher?.nama, recordedAt: new Date().toISOString()
      }
    }));
  };

  const handleMarkPresent = (id: string) => {
    setTempRecords(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSave = async () => {
    const currentList = filteredAndGroupedStudents.flatMap(g => g.list);
    if (currentList.length === 0) return;
    
    // Filter out students from classes that are already marked
    const listToSave = currentList.filter(s => !markedClasses.has(s.kelasTerkini || s.kelas));
    
    if (listToSave.length === 0) {
      alert('Semua kelas dalam senarai ini telah pun ditanda kehadiran.');
      return;
    }

    setIsCloudSyncing(true);
    const now = new Date().toISOString();
    const sessionRecords: AttendanceRecord[] = listToSave.map(s => {
      if (tempRecords[s.idMurid]) return tempRecords[s.idMurid];
      return {
        idMurid: s.idMurid, namaMurid: s.namaMurid, kelas: s.kelas, kelasTerkini: s.kelasTerkini,
        tarikh: selectedDate, status: 'Hadir', sebab: AbsenceReason.NONE, catatan: '', syncStatus: 'local',
        recordedBy: currentTeacher?.nama, recordedAt: now
      };
    });

    const cloudSuccess = await syncToGoogleSheets(sessionRecords);
    const finalRecords = sessionRecords.map(r => ({ ...r, syncStatus: (cloudSuccess ? 'synced' : 'local') as any }));
    setAllAttendance(saveAttendance(finalRecords));
    setIsCloudSyncing(false);
    
    alert(cloudSuccess ? 'Berjaya dihantar ke Google Sheets!' : 'Tersimpan secara lokal. Internet bermasalah.');
    setActiveTab('history');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"
        />
        <p className="text-indigo-400 font-black text-xs tracking-[0.5em] uppercase animate-pulse">MEMUAT SISTEM SKSR</p>
      </div>
    );
  }

  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-futuristic flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card w-full max-w-md p-8 rounded-[40px] shadow-2xl border-white/20"
        >
          <div className="text-center mb-8">
            <img src={SCHOOL_BADGE_URL} alt="SKSR" className="w-24 h-24 mx-auto mb-4 drop-shadow-xl" style={{ mixBlendMode: 'multiply' }} />
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Log Masuk Guru</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">E-Kehadiran SK Simpang Rengam</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Guru</label>
              <input type="text" required value={loginName} onChange={(e) => setLoginName(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-5 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Contoh: CIKGU AHMAD" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Katalaluan (Default)</label>
              <input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-5 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
            </div>
            {loginError && (
              <motion.p 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-red-500 text-[10px] font-black uppercase text-center"
              >
                Katalaluan Salah atau Nama Terlalu Pendek
              </motion.p>
            )}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-1 active:scale-95">Mula Menggunakan Sistem</button>
          </form>
          <p className="text-center text-[8px] text-slate-300 font-bold uppercase mt-8 tracking-widest">Sistem Kehadiran Murid Digital • Professional Tool</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-gradient-futuristic pt-2 pb-6 md:pt-4 md:pb-10 px-4 md:px-8 rounded-b-[12px] md:rounded-b-[30px] shadow-2xl relative overflow-hidden no-print">
        <div className="absolute top-[-40px] left-[-40px] w-48 h-48 bg-white/10 rounded-full blur-[60px]"></div>
        <div className="absolute bottom-[-40px] right-[-40px] w-56 h-56 bg-indigo-900/20 rounded-full blur-[60px]"></div>

        <div className="max-w-7xl mx-auto flex flex-col items-center text-white relative z-10">
          
          <div className="absolute top-0 left-0 p-1 no-print hidden md:block">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
              <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
              <span className="text-[7px] font-black uppercase tracking-widest">{syncError ? 'RALAT' : isSyncing ? 'SINKRON' : 'SISTEM STABIL'}</span>
            </div>
          </div>

          <div className="absolute top-0 right-0 p-1 no-print hidden md:flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase opacity-60">Log Masuk Sebagai</span>
              <span className="text-[10px] font-black uppercase">{currentTeacher.nama}</span>
            </div>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-white/20 text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
              <LogOut size={10} />
              Log Keluar
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-1 md:mb-2 relative group">
              <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <div className="w-12 h-12 md:w-20 md:h-20 relative z-10 flex items-center justify-center overflow-hidden">
                <img src={SCHOOL_BADGE_URL} alt="SKSR" className="w-full h-full object-contain drop-shadow-2xl" style={{ mixBlendMode: 'multiply' }} />
              </div>
            </div>
            <h1 className="text-base md:text-2xl font-black tracking-tighter uppercase mb-0.5 drop-shadow-md">e-KEHADIRAN MURID</h1>
            <p className="text-indigo-200 font-bold tracking-[0.2em] text-[7px] md:text-[11px] uppercase opacity-90 mb-1.5 md:mb-2">SK SIMPANG RENGAM • DIGITAL HUB</p>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md">
              <p className="text-[8px] md:text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                <Calendar size={10} className="text-indigo-300" /> {todayDisplay}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 relative z-20 flex-grow pb-12">
        <div className="glass-card rounded-[16px] md:rounded-[24px] p-1 grid grid-cols-4 sm:flex sm:gap-1 mb-4 md:mb-5 shadow-2xl max-w-6xl mx-auto no-print border-white/50">
          {[
            { id: 'attendance', label: 'TANDA', icon: UserCheck },
            { id: 'analytics', label: 'ANALISA', icon: PieChart },
            { id: 'report', label: 'LAPORAN', icon: FileText },
            { id: 'history', label: 'ARKIB', icon: Database },
            { id: 'print', label: 'CETAK', icon: Printer },
            { id: 'teachers', label: 'GURU', icon: Users },
            { id: 'settings', label: 'TETAPAN', icon: SettingsIcon }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] md:rounded-[20px] transition-all duration-500 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/60 hover:text-slate-700'}`}
            >
              <tab.icon size={12} className="mb-0.5 md:mb-1 md:size-[18px]" />
              <span className="text-[6px] md:text-[8px] font-black tracking-widest uppercase">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'attendance' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {students.length === 0 && !loading && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase">Amaran: Senarai Murid Kosong</p>
                  <p className="text-[9px] font-bold uppercase opacity-70">Sila semak URL Google Sheets di menu Tetapan atau pastikan internet anda stabil.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 no-print">
              <div className="lg:col-span-8 bg-white rounded-[20px] md:rounded-[24px] p-3 md:p-4 shadow-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-spin' : 'bg-emerald-500'}`}></div>
                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      {isSyncing ? 'Menyemak...' : `Data: ${lastSyncTime || 'Sedia'}`}
                    </p>
                  </div>
                  <button onClick={() => loadData(false)} disabled={isSyncing} className="text-[7px] md:text-[8px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1">
                    <RefreshCw size={8} className={isSyncing ? 'animate-spin' : ''} /> KEMASKINI
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className="space-y-1">
                    <label className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Aliran</label>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-[9px] md:text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none">
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                    <select value={selectedSubClass} onChange={(e) => setSelectedSubClass(e.target.value)} disabled={selectedClass === 'Semua'} className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-[9px] md:text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                      {subClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Carian</label>
                    <div className="relative">
                      <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="Nama/ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg py-1.5 md:py-2 pl-7 md:pl-8 pr-2 md:pr-3 text-[9px] md:text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setTempRecords({})} className="w-full md:w-1/3 bg-slate-50 text-slate-400 border border-slate-100 py-2 rounded-lg text-[7px] md:text-[8px] font-black hover:bg-slate-200 transition-all uppercase tracking-[0.1em]">RESET TANDAAN</button>
                </div>
              </div>
              <div className="lg:col-span-4 bg-indigo-900 rounded-[20px] md:rounded-[24px] p-3 md:p-4 shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={32} className="md:size-[40px]" /></div>
                <h3 className="text-[8px] md:text-[9px] font-black tracking-[0.15em] uppercase opacity-60 mb-2">Statistik Langsung</h3>
                <div className="grid grid-cols-4 lg:grid-cols-4 gap-1.5 md:gap-2">
                  <div className="bg-white/10 p-1 md:p-2 rounded-lg text-center">
                    <p className="text-[5px] md:text-[7px] font-black opacity-60 uppercase mb-0.5">Jumlah</p>
                    <p className="text-sm md:text-lg font-black">{liveSummary.total}</p>
                  </div>
                  <div className="bg-emerald-500/20 p-1 md:p-2 rounded-lg border border-emerald-500/30 text-center">
                    <p className="text-[5px] md:text-[7px] font-black text-emerald-300 uppercase mb-0.5">Hadir</p>
                    <p className="text-sm md:text-lg font-black text-emerald-400">{liveSummary.present}</p>
                  </div>
                  <div className="bg-red-500/20 p-1 md:p-2 rounded-lg border border-red-500/30 text-center">
                    <p className="text-[5px] md:text-[7px] font-black text-red-300 uppercase mb-0.5">T. Hadir</p>
                    <p className="text-sm md:text-lg font-black text-red-400">{liveSummary.absent}</p>
                  </div>
                  <div className="bg-indigo-500/20 p-1 md:p-2 rounded-lg border border-indigo-500/30 text-center">
                    <p className="text-[5px] md:text-[7px] font-black text-indigo-300 uppercase mb-0.5">Peratus</p>
                    <p className="text-sm md:text-lg font-black text-indigo-300">{liveSummary.percentage.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {filteredAndGroupedStudents.map((group) => {
                const isAlreadyMarked = markedClasses.has(group.name);
                const markerInfo = isAlreadyMarked ? allAttendance.find(r => r.tarikh === selectedDate && (r.kelasTerkini === group.name || r.kelas === group.name)) : null;

                return (
                  <div key={group.name} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-900 text-white px-3 py-1 rounded-md text-[8px] font-black tracking-widest uppercase shadow-sm">{group.name}</div>
                        {isAlreadyMarked && (
                          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-[7px] font-black tracking-widest uppercase flex items-center gap-1.5 border border-emerald-200">
                            <CheckCircle2 size={10} /> SUDAH DITANDA {markerInfo?.recordedBy ? `OLEH ${markerInfo.recordedBy.toUpperCase()}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>
                    
                    {isAlreadyMarked ? (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-center">
                        <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 text-emerald-500">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Kehadiran Selesai</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Rekod untuk kelas ini telah dihantar ke pangkalan data pusat.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {group.list.map((s) => (
                          <StudentCard key={s.idMurid} student={s} record={tempRecords[s.idMurid]} onMarkAbsent={handleMarkAbsent} onMarkPresent={handleMarkPresent} onSetReason={(id, reason) => setTempRecords(p => ({ ...p, [id]: { ...p[id], sebab: reason }}))} onSetNote={(id, note) => setTempRecords(p => ({ ...p, [id]: { ...p[id], catatan: note }}))} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredAndGroupedStudents.length > 0 && (
              <div className="mobile-sticky-bottom no-print">
                <div className="max-w-7xl mx-auto">
                  <button 
                    onClick={handleSave} 
                    disabled={isCloudSyncing} 
                    className={`w-full flex items-center justify-center gap-2.5 px-8 py-4 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-2xl transition-all transform active:scale-95 ${isCloudSyncing ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    {isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                    <span>{isCloudSyncing ? 'MENGHANTAR...' : 'HANTAR KEHADIRAN SEKARANG'}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && <AttendanceHistory allAttendance={allAttendance} students={students} onRetrySync={() => loadData(false)} onRefreshData={(newData) => setAllAttendance(newData)} />}
        {activeTab === 'analytics' && <AttendanceAnalytics records={allAttendance} students={students} selectedClass={selectedClass} />}
        {activeTab === 'report' && <AttendanceReport records={allAttendance} students={students} referenceDate={selectedDate} />}
        {activeTab === 'print' && <AttendancePrint records={allAttendance} students={students} referenceDate={selectedDate} />}
        {activeTab === 'teachers' && <TeacherList teachers={getTeachersList()} />}
        {activeTab === 'settings' && <Settings onReset={() => {
          localStorage.clear();
          window.location.reload();
        }} />}
      </main>

      <footer className="neon-footer pt-3 pb-28 md:pb-3 px-4 no-print mt-auto">
        <div className="neon-line absolute top-0 left-0 right-0"></div>
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-2">
          <div className="space-y-0">
            <h4 className="text-[9px] md:text-[11px] font-black tracking-widest uppercase text-white">
              <span className="text-yellow-400">e-KEHADIRAN</span> MURID SKSR
            </h4>
            <p className="text-white/60 font-bold text-[6px] md:text-[7px] tracking-[0.2em] uppercase">Digital Attendance Management System</p>
          </div>
          
          <div className="w-6 h-px bg-white/10"></div>
          
          <div className="space-y-0.5">
            <p className="text-white/40 text-[6px] md:text-[8px] font-black uppercase tracking-widest">Hak Cipta Terpelihara © : ZURI 2026</p>
            <p className="text-white/20 text-[5px] md:text-[7px] font-black uppercase tracking-widest">SK SIMPANG REGGAM, JALAN RENGGAM KLUANG JOHOR</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
