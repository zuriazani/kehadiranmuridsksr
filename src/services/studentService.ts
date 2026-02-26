
import { Student } from '../types';

const DEFAULT_STUDENT_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpH8HxIyKbpZL3l_kx5H7cDccO22n94C5UyFFIopcT-BytZFlX8svGZha2M6UUNvD-HuHQfFj9Zxt1/pub?output=csv';

export const fetchStudents = async (): Promise<Student[]> => {
  try {
    // Ambil URL dari localStorage jika ada, jika tidak guna default
    const savedUrl = localStorage.getItem('sksr_config_student_url');
    const targetUrl = savedUrl || DEFAULT_STUDENT_URL;

    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
    const csvData = await response.text();
    
    // Detect if response is HTML (Google Sheets error or wrong link)
    if (csvData.trim().startsWith('<!DOCTYPE') || csvData.includes('<script') || csvData.includes('<html')) {
      console.error('Received HTML instead of CSV. Check your Google Sheets Publish link.');
      return [];
    }

    const lines = csvData.split(/\r?\n/);
    const header = (lines[0] || '').toUpperCase();
    
    // Basic check if this is actually student data (should contain ID MURID or NAMA MURID)
    if (!header.includes('ID MURID') && !header.includes('NAMA MURID')) {
      console.error('CSV does not appear to be student data. Header:', header);
      return [];
    }

    const students = lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length < 3) return null; // Basic validation
      return {
        bil: values[0] || '',
        idMurid: values[1] || '',
        kelas: values[2] || '',
        kelasTerkini: values[3] || '',
        namaMurid: values[4] || '',
        noKP: values[5] || '',
        tarikhLahir: values[6] || '',
        tarikhMasukSekolah: values[7] || '',
        jantina: values[8] || '',
        kaum: values[9] || '',
        agama: values[10] || '',
      };
    }).filter(s => s !== null && s.idMurid && s.idMurid.length < 50) as Student[];

    // Deduplicate by idMurid
    const seen = new Set();
    return students.filter(s => {
      if (seen.has(s.idMurid)) return false;
      seen.add(s.idMurid);
      return true;
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    return [];
  }
};
