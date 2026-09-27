import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, TeachingRecord } from '../types';

// ============================================================================
// [통합 portal 프로젝트 설정] 무조건 이 주소와 키를 사용하여 연결하도록 강제 설정
// ============================================================================
const PORTAL_URL = 'https://lqajnsqoovngfgabalkj.supabase.co';
const PORTAL_ANON_KEY = 'sb_publishable_DcAlnHgLYSd92ICS66z3RA_DvrzyPhX';

let supabaseInstance: SupabaseClient | null = null;

// 로컬스토리지 무시하고 portal 값 강제 리턴
export function getSupabaseCredentials() {
  return { url: PORTAL_URL, key: PORTAL_ANON_KEY, isValid: true };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(PORTAL_URL, PORTAL_ANON_KEY, {
      auth: { persistSession: true }
    });
    return supabaseInstance;
  } catch (e) {
    console.error('Supabase Client initialization failed:', e);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

// ----------------------------------------------------
// DB Sync Helpers (Fallbacks to LocalStorage)
// ----------------------------------------------------

const STORAGE_KEYS = {
  STUDENTS: 'edu_calendar_students',
  RECORDS: 'edu_calendar_records',
  MAX_HOURS: 'edu_calendar_max_hours'
};

export const CURRENT_DATA_VERSION = '2026-08-28-v15-exact-middle-and-first-logs';

export const INITIAL_STUDENTS: Student[] = [
  { id: 'student-1', name: '이솔빛나', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-2', name: '황혜리', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-6', name: '이정', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-5', name: '엄호준', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-3', name: '전성후', group: '1순위', createdAt: new Date().toISOString() },
  { id: 'student-4', name: '강주연', group: '1순위', createdAt: new Date().toISOString() }
];

export const INITIAL_RECORDS: TeachingRecord[] = [
  // ================= 5월 (1순위 4차시) =================
  {
    id: '2026-05-06',
    date: '2026-05-06',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' }
  },
  {
    id: '2026-05-11',
    date: '2026-05-11',
    studentIds: ['student-4'],
    hours: { 'student-4': 1 },
    notes: { 'student-4': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-05-13',
    date: '2026-05-13',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' }
  },
  {
    id: '2026-05-20',
    date: '2026-05-20',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' }
  },

  // ================= 6월 (1순위 5차시 + 중위권 3차시) =================
  {
    id: '2026-06-01',
    date: '2026-06-01',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-06-05',
    date: '2026-06-05',
    studentIds: ['student-3', 'student-4'],
    hours: { 'student-3': 1, 'student-4': 1 },
    notes: { 'student-3': '1순위 지도 (14:40~15:30, 1차시)', 'student-4': '1순위 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-06-08',
    date: '2026-06-08',
    studentIds: ['student-2', 'student-6'],
    hours: { 'student-2': 1, 'student-6': 1 },
    notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-6': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' }
  },
  {
    id: '2026-06-10',
    date: '2026-06-10',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' }
  },
  {
    id: '2026-06-12',
    date: '2026-06-12',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-06-15',
    date: '2026-06-15',
    studentIds: ['student-2', 'student-6'],
    hours: { 'student-2': 1, 'student-6': 1 },
    notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-6': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' }
  },
  {
    id: '2026-06-18',
    date: '2026-06-18',
    studentIds: ['student-2', 'student-6'],
    hours: { 'student-2': 1, 'student-6': 1 },
    notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-6': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' }
  },
  {
    id: '2026-06-19',
    date: '2026-06-19',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },

  // ================= 7월 (1순위 2차시 + 중위권 4차시) =================
  {
    id: '2026-07-03',
    date: '2026-07-03',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-07-14',
    date: '2026-07-14',
    studentIds: ['student-4'],
    hours: { 'student-4': 1 },
    notes: { 'student-4': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' }
  },
  {
    id: '2026-07-31',
    date: '2026-07-31',
    studentIds: ['student-2', 'student-1'],
    hours: { 'student-2': 4, 'student-1': 4 },
    notes: { 'student-2': '중위권 지도 (09:00~12:10, 4차시)', 'student-1': '중위권 지도 (09:00~12:10, 4차시)' }
  },

  // ================= 8월 (1순위 8차시 + 중위권 28차시) =================
  {
    id: '2026-08-04',
    date: '2026-08-04',
    studentIds: ['student-2', 'student-1'],
    hours: { 'student-2': 4, 'student-1': 4 },
    notes: { 'student-2': '중위권 지도 (13:00~16:10, 4차시)', 'student-1': '중위권 지도 (13:00~16:10, 4차시)' }
  },
  {
    id: '2026-08-05',
    date: '2026-08-05',
    studentIds: ['student-2'],
    hours: { 'student-2': 4 },
    notes: { 'student-2': '중위권 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-08-06',
    date: '2026-08-06',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-08-07',
    date: '2026-08-07',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-08-18',
    date: '2026-08-18',
    studentIds: ['student-2'],
    hours: { 'student-2': 4 },
    notes: { 'student-2': '중위권 개별 지도 (13:00~16:10, 4차시)' }
  },
  {
    id: '2026-08-24',
    date: '2026-08-24',
    studentIds: ['student-1'],
    hours: { 'student-1': 4 },
    notes: { 'student-1': '중위권 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-08-26',
    date: '2026-08-26',
    studentIds: ['student-1'],
    hours: { 'student-1': 4 },
    notes: { 'student-1': '중위권 개별 지도 (13:00~16:10, 4차시)' }
  },
  {
    id: '2026-08-28',
    date: '2026-08-28',
    studentIds: ['student-5'],
    hours: { 'student-5': 4 },
    notes: { 'student-5': '중위권 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-08-31',
    date: '2026-08-31',
    studentIds: ['student-2', 'student-1'],
    hours: { 'student-2': 4, 'student-1': 4 },
    notes: { 'student-2': '중위권 지도 (09:00~12:10, 4차시)', 'student-1': '중위권 지도 (09:00~12:10, 4차시)' }
  },

  // ================= 9월 (1순위 8차시) =================
  {
    id: '2026-09-04',
    date: '2026-09-04',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-09-07',
    date: '2026-09-07',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' }
  }
];

export function ensureLatestDataVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    const version = localStorage.getItem('edu_calendar_data_version');
    if (version !== CURRENT_DATA_VERSION) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
      localStorage.setItem('edu_calendar_max_hours_middle', '40');
      localStorage.setItem('edu_calendar_max_hours_first', '40');
      localStorage.setItem('edu_calendar_data_version', CURRENT_DATA_VERSION);
    }
  } catch (e) {
    console.error('Failed to ensure data version:', e);
  }
}

ensureLatestDataVersion();

export interface FullDataSnapshot {
  version: number;
  timestamp: string;
  students: Student[];
  records: TeachingRecord[];
  maxHoursMiddle: number;
  maxHoursFirst: number;
  supabaseConfig?: {
    url: string;
    key: string;
  };
}

export function exportFullData(): FullDataSnapshot {
  const students = getLocalStudents();
  const records = getLocalRecords();
  const maxHoursMiddle = getLocalMaxHours('중위권');
  const maxHoursFirst = getLocalMaxHours('1순위');

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    students,
    records,
    maxHoursMiddle,
    maxHoursFirst,
    supabaseConfig: { url: PORTAL_URL, key: PORTAL_ANON_KEY }
  };
}

export function importFullData(snapshot: FullDataSnapshot): boolean {
  if (!snapshot || !Array.isArray(snapshot.students) || !Array.isArray(snapshot.records)) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(snapshot.students));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(snapshot.records));
    if (snapshot.maxHoursMiddle) {
      localStorage.setItem('edu_calendar_max_hours_middle', String(snapshot.maxHoursMiddle));
    }
    if (snapshot.maxHoursFirst) {
      localStorage.setItem('edu_calendar_max_hours_first', String(snapshot.maxHoursFirst));
    }
    return true;
  } catch (e) {
    console.error('Failed to import full data snapshot:', e);
    return false;
  }
}

export function generateDataSyncUrl(): string {
  const snapshot = exportFullData();
  const jsonStr = JSON.stringify(snapshot);
  const token = btoa(encodeURIComponent(jsonStr));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}#sync_data=${token}`;
}

export function checkAndApplySyncUrl(): { applied: boolean; message?: string; count?: number } {
  try {
    if (typeof window === 'undefined') return { applied: false };

    const hash = window.location.hash;
    if (hash.includes('sync_data=')) {
      const b64 = hash.split('sync_data=')[1].split('&')[0];
      if (b64) {
        const decoded = decodeURIComponent(atob(b64));
        const snapshot: FullDataSnapshot = JSON.parse(decoded);
        if (importFullData(snapshot)) {
          window.history.replaceState(null, '', window.location.pathname);
          return {
            applied: true,
            count: snapshot.records.length,
            message: `🎉 노트북의 최신 데이터가 100% 완벽하게 동기화되었습니다!`
          };
        }
      }
    }

    if (hash.includes('sync_sb=')) {
      window.history.replaceState(null, '', window.location.pathname);
      return {
        applied: true,
        message: '✨ Supabase 클라우드가 자동으로 연결되어 실시간 동기화가 활성화되었습니다!'
      };
    }

    const params = new URLSearchParams(window.location.search);
    const qData = params.get('sync_data');
    if (qData) {
      const decoded = decodeURIComponent(atob(qData));
      const snapshot: FullDataSnapshot = JSON.parse(decoded);
      if (importFullData(snapshot)) {
        window.history.replaceState(null, '', window.location.pathname);
        return {
          applied: true,
          count: snapshot.records.length,
          message: `🎉 노트북의 최신 데이터가 성공적으로 동기화되었습니다!`
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse sync token from URL:', e);
  }
  return { applied: false };
}

export function generateSyncUrl(): string {
  const token = btoa(encodeURIComponent(`${PORTAL_URL}|${PORTAL_ANON_KEY}`));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}#sync_sb=${token}`;
}

export const SUPABASE_SQL_SETUP = `-- 생략 (이미 위에서 생성 완료)`;

export function getLocalStudents(): Student[] {
  ensureLatestDataVersion();
  const local = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }
  return INITIAL_STUDENTS;
}

export function getLocalRecords(): TeachingRecord[] {
  ensureLatestDataVersion();
  const local = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }
  return INITIAL_RECORDS;
}

export function getLocalMaxHours(group: '중위권' | '1순위'): number {
  ensureLatestDataVersion();
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  const local = localStorage.getItem(storageKey);
  return local ? parseInt(local, 10) : 40;
}

// ----------------------------------------------------
// [수정 핵심] 좀비 자동 복구 방지
// ----------------------------------------------------
export async function fetchStudents(): Promise<Student[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('basic_students')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        const students: Student[] = data.map(item => ({
          id: item.id,
          name: item.name,
          group: item.group as '중위권' | '1순위' | '기타',
          createdAt: item.created_at
        }));
        
        // 데이터가 DB에 아예 0명일 때만 초기 세팅 동작
        if (students.length === 0) {
          saveStudents(INITIAL_STUDENTS).catch(console.error);
          return INITIAL_STUDENTS;
        }

        // --- 좀비 부활 코드 삭제 완료 ---

        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        return students;
      }
    } catch (e) {
      console.error('Supabase fetch students error:', e);
    }
  }

  return getLocalStudents();
}

export async function saveStudents(students: Student[]): Promise<boolean> {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

  const client = getSupabaseClient();
  if (client) {
    try {
      const upsertData = students.map(s => ({
        id: s.id,
        name: s.name,
        group: s.group,
        created_at: s.createdAt
      }));

      const { error } = await client
        .from('basic_students')
        .upsert(upsertData, { onConflict: 'id' });

      if (error) {
        console.error('Supabase save students error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase student upsert failed:', e);
      return false;
    }
  }
  return true;
}

// 삭제 시 로컬 캐시에서도 즉시 삭제하도록 수정
export async function deleteStudentFromDb(studentId: string): Promise<boolean> {
  // 1. 로컬에서 즉시 삭제 반영
  const localStudents = getLocalStudents().filter(s => s.id !== studentId);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(localStudents));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('basic_students')
        .delete()
        .eq('id', studentId);
      if (error) {
        console.error('Supabase delete student error:', error);
        return false;
      }
    } catch (e) {
      console.error('Supabase delete student failed:', e);
      return false;
    }
  }
  return true;
}

// ----------------------------------------------------
// [수정 핵심] 좀비 자동 복구 방지 (일지 기록)
// ----------------------------------------------------
export async function fetchRecords(): Promise<TeachingRecord[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('basic_records')
        .select('*');
      
      if (!error && data) {
        const records: TeachingRecord[] = data.map(item => {
          const rawNotes = typeof item.notes === 'object' && item.notes !== null 
            ? item.notes 
            : JSON.parse(item.notes || '{}');

          let parsedHours: Record<string, number> = {};
          if (typeof item.hours === 'object' && item.hours !== null && Object.keys(item.hours).length > 0) {
            parsedHours = item.hours;
          } else if (typeof item.hours === 'string' && item.hours && item.hours !== '{}') {
            try { parsedHours = JSON.parse(item.hours); } catch (_) {}
          } else if (rawNotes.__HOURS_BACKUP__) {
            try { parsedHours = JSON.parse(rawNotes.__HOURS_BACKUP__); } catch (_) {}
          }

          const cleanNotes: Record<string, string> = { ...rawNotes };
          delete cleanNotes.__HOURS_BACKUP__;

          return {
            id: item.date,
            date: item.date,
            studentIds: Array.isArray(item.student_ids) ? item.student_ids : JSON.parse(item.student_ids || '[]'),
            hours: parsedHours,
            notes: cleanNotes,
            updatedAt: item.updated_at
          };
        });

        // 데이터가 DB에 아예 0개일 때만 초기 세팅 동작
        if (records.length === 0) {
          saveRecordsBatch(INITIAL_RECORDS).catch(console.error);
          return INITIAL_RECORDS;
        }

        // --- 좀비 부활 코드 삭제 완료 ---

        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
        return records;
      }
    } catch (e) {
      console.error('Supabase fetch records error:', e);
    }
  }

  return getLocalRecords();
}

export async function saveRecord(record: TeachingRecord): Promise<boolean> {
  const currentHours = record.hours || {};
  
  const notesWithBackup = {
    ...record.notes,
    __HOURS_BACKUP__: JSON.stringify(currentHours)
  };

  const local = getLocalRecords();
  const cleanRecord: TeachingRecord = {
    ...record,
    hours: currentHours
  };
  const existingIndex = local.findIndex(r => r.date === record.date);
  if (existingIndex >= 0) {
    local[existingIndex] = cleanRecord;
  } else {
    local.push(cleanRecord);
  }
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(local));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error: upsertError } = await client
        .from('basic_records')
        .upsert({
          date: record.date,
          student_ids: record.studentIds,
          hours: currentHours,
          notes: notesWithBackup,
          updated_at: new Date().toISOString()
        }, { onConflict: 'date' });

      if (upsertError) {
        await client
          .from('basic_records')
          .upsert({
            date: record.date,
            student_ids: record.studentIds,
            notes: notesWithBackup,
            updated_at: new Date().toISOString()
          }, { onConflict: 'date' });
      }
      return true;
    } catch (e) {
      console.error('Supabase record upsert exception:', e);
      return false;
    }
  }
  return true;
}

export async function saveRecordsBatch(recordsList: TeachingRecord[]): Promise<boolean> {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(recordsList));

  const client = getSupabaseClient();
  if (client && recordsList.length > 0) {
    try {
      const batchPayload = recordsList.map(rec => {
        const currentHours = rec.hours || {};
        const notesWithBackup = {
          ...rec.notes,
          __HOURS_BACKUP__: JSON.stringify(currentHours)
        };
        return {
          date: rec.date,
          student_ids: rec.studentIds,
          hours: currentHours,
          notes: notesWithBackup,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await client
        .from('basic_records')
        .upsert(batchPayload, { onConflict: 'date' });

      if (error) {
        const fallbackPayload = batchPayload.map(p => {
          const { hours, ...rest } = p;
          return rest;
        });
        await client.from('basic_records').upsert(fallbackPayload, { onConflict: 'date' });
      }
      return true;
    } catch (e) {
      console.error('Supabase batch upsert failed:', e);
      return false;
    }
  }
  return true;
}

export async function fetchMaxHours(group: '중위권' | '1순위'): Promise<number> {
  const client = getSupabaseClient();
  const keyName = group === '중위권' ? 'max_hours_middle' : 'max_hours_first';
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  
  if (client) {
    try {
      const { data, error } = await client
        .from('basic_settings')
        .select('value')
        .eq('key', keyName)
        .single();
      
      if (!error && data) {
        const val = parseInt(data.value, 10);
        localStorage.setItem(storageKey, val.toString());
        return val;
      }
    } catch (e) {
      console.error('Supabase load settings error:', e);
    }
  }
  
  return getLocalMaxHours(group);
}

export async function saveMaxHours(group: '중위권' | '1순위', hours: number): Promise<boolean> {
  const keyName = group === '중위권' ? 'max_hours_middle' : 'max_hours_first';
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  localStorage.setItem(storageKey, hours.toString());
  
  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('basic_settings')
        .upsert({
          key: keyName,
          value: hours.toString()
        }, { onConflict: 'key' });
      return true;
    } catch (e) {
      console.error('Supabase settings upsert failed:', e);
      return false;
    }
  }
  return true;
}

export async function syncAllToCloud(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase 연동이 설정되어 있지 않습니다.' };
  }

  try {
    const students = getLocalStudents();
    const records = getLocalRecords();
    const middleHours = getLocalMaxHours('중위권');
    const firstHours = getLocalMaxHours('1순위');

    await Promise.all([
      saveStudents(students),
      saveRecordsBatch(records),
      saveMaxHours('중위권', middleHours),
      saveMaxHours('1순위', firstHours)
    ]);

    return { success: true, count: records.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || String(err) };
  }
}

export function subscribeToRealtimeChanges(onRemoteChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('edu_calendar_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'basic_records' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'basic_students' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'basic_settings' }, () => {
        onRemoteChange();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscription error:', e);
    return () => {};
  }
}
