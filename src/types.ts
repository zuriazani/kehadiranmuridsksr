
export enum AbsenceReason {
  PONTENG = "Tanpa Kenyataan",
  SAKIT = "Dengan Kenyataan",
  NONE = ""
}

export interface Student {
  bil: string;
  idMurid: string;
  kelas: string;
  kelasTerkini: string;
  namaMurid: string;
  noKP: string;
  tarikhLahir: string;
  tarikhMasukSekolah: string;
  jantina: string;
  kaum: string;
  agama: string;
}

export interface Teacher {
  nama: string;
  lastLogin?: string;
}

export interface TeacherLog {
  nama: string;
  loginAt: string;
  type: 'LOGIN';
}

export interface AttendanceRecord {
  idMurid: string;
  namaMurid: string;
  kelas: string;
  kelasTerkini: string;
  tarikh: string; // ISO Date
  status: 'Hadir' | 'Tidak Hadir';
  sebab: AbsenceReason;
  catatan: string;
  syncStatus?: 'local' | 'synced' | 'error';
  recordedBy?: string; // Nama Guru
  recordedAt?: string; // Timestamp ISO
}

export type PeriodType = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface AnalyticsData {
  label: string;
  hadir: number;
  ponteng: number;
  sakit: number;
}
