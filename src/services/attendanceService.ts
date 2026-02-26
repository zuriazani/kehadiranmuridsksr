
import { AttendanceRecord, AbsenceReason } from '../types';

const STORAGE_KEY = 'e_kehadiran_records';

// Default placeholders
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwflzWlW8bJMGSlclCtAQav9AXTWP-MbUhF77X6oQ9fxjXrhm1IzZp_HZ0pnh9r7y3u/exec'; 
const DEFAULT_RESULTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpH8HxIyKbpZL3l_kx5H7cDccO22n94C5UyFFIopcT-BytZFlX8svGZha2M6UUNvD-HuHQfFj9Zxt1/pub?output=csv'; 

export const getUrls = () => ({
  script: localStorage.getItem('sksr_config_script_url') || DEFAULT_SCRIPT_URL,
  results: localStorage.getItem('sksr_config_results_url') || DEFAULT_RESULTS_URL
});

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  // Handle DD/MM/YYYY or D/M/YYYY or M/D/YYYY
  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    let d, m, y;
    
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      y = parts[0];
      m = parts[1];
      d = parts[2];
    } else {
      // Could be DD/MM/YYYY or MM/DD/YYYY
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      
      if (p0 > 12) {
        // Definitely DD/MM/YYYY
        d = p0;
        m = p1;
      } else if (p1 > 12) {
        // Definitely MM/DD/YYYY
        m = p0;
        d = p1;
      } else {
        // Ambiguous, assume DD/MM/YYYY as default for Malaysia
        d = p0;
        m = p1;
      }
    }
    
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return trimmed;
};

export const saveAttendance = (records: AttendanceRecord[]) => {
  const existing = getAttendance();
  const recordMap = new Map<string, AttendanceRecord>();
  
  existing.forEach(r => {
    const normalizedDate = normalizeDate(r.tarikh);
    recordMap.set(`${r.idMurid}_${normalizedDate}`, { ...r, tarikh: normalizedDate });
  });
  
  records.forEach(r => {
    const normalizedDate = normalizeDate(r.tarikh);
    const key = `${r.idMurid}_${normalizedDate}`;
    const existingRec = recordMap.get(key);
    if (!existingRec || r.syncStatus === 'synced' || existingRec.syncStatus !== 'synced') {
      recordMap.set(key, { ...r, tarikh: normalizedDate, syncStatus: r.syncStatus || 'local' });
    }
  });
  
  const updated = Array.from(recordMap.values());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const getAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const fetchAttendanceFromCloud = async (): Promise<AttendanceRecord[]> => {
  const { results: targetUrl } = getUrls();
  if (!targetUrl || targetUrl.length < 30) return [];

  try {
    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (!response.ok) return [];
    
    let csvData = await response.text();
    
    // Detect if response is HTML
    if (csvData.trim().startsWith('<!DOCTYPE') || csvData.includes('<script') || csvData.includes('<html')) {
      console.error('Received HTML instead of CSV for attendance.');
      return [];
    }

    if (csvData.charCodeAt(0) === 0xFEFF) csvData = csvData.substr(1);
    const lines = csvData.split(/\r?\n/);
    const header = (lines[0] || '').toUpperCase();
    
    // Basic check if this is actually attendance data (should contain STATUS or SEBAB or TARIKH)
    if (!header.includes('STATUS') && !header.includes('TARIKH')) {
      console.error('CSV does not appear to be attendance data. Header:', header);
      return [];
    }
    
    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0] || '';
    const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
    
    return lines.slice(1).map(line => {
      if (!line.trim()) return null;
      
      let v: string[];
      if (delimiter === ';') {
        v = line.split(';').map(val => val.trim().replace(/^"|"$/g, ''));
      } else {
        v = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));
      }

      if (v.length < 6 || !v[0] || !v[1]) return null;
      const normalizedDate = normalizeDate(v[0]);
      return {
        tarikh: normalizedDate, idMurid: v[1], namaMurid: v[2], kelas: v[3], kelasTerkini: v[4],
        status: (v[5] === 'Hadir' ? 'Hadir' : 'Tidak Hadir') as any,
        sebab: (v[6] || '') as AbsenceReason, catatan: v[7] || '', syncStatus: 'synced' as const
      };
    }).filter(r => r !== null) as AttendanceRecord[];
  } catch { return []; }
};

export const syncToGoogleSheets = async (records: AttendanceRecord[]): Promise<boolean> => {
  const { script: targetUrl } = getUrls();
  if (!targetUrl || targetUrl.length < 20) return false;
  try {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(records)
    });
    return true; 
  } catch { return false; }
};

export const exportToCSV = (data: AttendanceRecord[], filename: string) => {
  const headers = ['Tarikh', 'ID Murid', 'Nama Murid', 'Aliran', 'Kelas Terkini', 'Status', 'Sebab', 'Catatan'];
  const rows = data.map(r => [r.tarikh, r.idMurid, r.namaMurid, r.kelas, r.kelasTerkini, r.status, r.sebab, r.catatan].map(v => `"${v}"`).join(','));
  const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `${filename}.csv`);
  link.click();
};
