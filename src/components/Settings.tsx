
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, Info, Settings as SettingsIcon } from 'lucide-react';
import { DEFAULT_STUDENT_URL, DEFAULT_SCRIPT_URL, DEFAULT_RESULTS_URL } from '../constants';

interface SettingsProps {
  onReset?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onReset }) => {
  const [studentUrl, setStudentUrl] = useState(localStorage.getItem('sksr_config_student_url') || DEFAULT_STUDENT_URL);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('sksr_config_script_url') || DEFAULT_SCRIPT_URL);
  const [resultsUrl, setResultsUrl] = useState(localStorage.getItem('sksr_config_results_url') || DEFAULT_RESULTS_URL);
  const [saved, setSaved] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'zuriazani123') {
      setIsUnlocked(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  if (!isUnlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20"
      >
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 text-center">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <SettingsIcon size={32} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Akses Terhad</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Sila masukkan kata laluan untuk mengubah tetapan sistem</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Laluan..."
              className={`w-full bg-slate-50 border-2 rounded-2xl py-4 px-6 text-center font-black tracking-[0.3em] outline-none transition-all ${passError ? 'border-red-200 focus:ring-red-500' : 'border-slate-100 focus:ring-indigo-500'}`}
            />
            {passError && <p className="text-[9px] font-black text-red-500 uppercase">Kata laluan salah!</p>}
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all"
            >
              MASUK TETAPAN
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  const handleSave = () => {
    localStorage.setItem('sksr_config_student_url', studentUrl);
    localStorage.setItem('sksr_config_script_url', scriptUrl);
    localStorage.setItem('sksr_config_results_url', resultsUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    alert('Konfigurasi berjaya disimpan! Sila refresh halaman untuk kesan penuh.');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 pb-20"
    >
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Konfigurasi Sistem</h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Sesuaikan pangkalan data Google Sheets anda</p>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL CSV Murid (Publish to Web)</label>
            <input 
              type="text" 
              value={studentUrl} 
              onChange={(e) => setStudentUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL Google Script (Deployment Web App)</label>
            <input 
              type="text" 
              value={scriptUrl} 
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL CSV Keputusan Kehadiran (Publish to Web)</label>
            <input 
              type="text" 
              value={resultsUrl} 
              onChange={(e) => setResultsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="pt-4 space-y-3">
            <button 
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              SIMPAN TETAPAN
            </button>

            {onReset && (
              <div className="space-y-2">
                {!showConfirm ? (
                  <button 
                    onClick={() => setShowConfirm(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 border-red-100"
                  >
                    KOSONGKAN CACHE & RESET SISTEM
                  </button>
                ) : (
                  <div className="bg-red-600 p-4 rounded-2xl space-y-3 animate-pulse">
                    <p className="text-[10px] font-black text-white text-center uppercase tracking-widest">ANDA PASTI? SEMUA DATA AKAN PADAM!</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => onReset()}
                        className="bg-white text-red-600 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        YA, PADAM SEMUA
                      </button>
                      <button 
                        onClick={() => setShowConfirm(false)}
                        className="bg-red-800 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        BATAL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-[40px]">
        <h4 className="font-black text-amber-800 text-sm uppercase mb-4 flex items-center gap-2">
          <Info size={16} /> Panduan Ringkas
        </h4>
        <ul className="space-y-3 text-[11px] font-bold text-amber-700 uppercase tracking-tight">
          <li>1. Buka Fail Google Sheet anda.</li>
          <li>2. Klik "File" &gt; "Share" &gt; "Publish to web".</li>
          <li>3. Pilih "Entire Document" dan format "Comma-separated values (.csv)".</li>
          <li>4. Salin link tersebut dan tampal di ruangan di atas.</li>
          <li>5. Untuk Google Script, pastikan anda telah "Deploy" sebagai "Web App" dengan akses "Anyone".</li>
        </ul>
      </div>
    </motion.div>
  );
};
