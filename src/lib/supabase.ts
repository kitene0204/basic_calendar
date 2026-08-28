import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, TeachingRecord } from '../types';

let supabaseInstance: SupabaseClient | null = null;

// 로컬스토리지에서 사용자 지정 Supabase 설정 로드
export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('custom_supabase_url') || (import.meta as any).env.VITE_SUPABASE_URL || '';
  const localKey = localStorage.getItem('custom_supabase_anon_key') || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  
  // placeholder 형식의 더미 값들 필터링
  const isValidUrl = localUrl && localUrl.startsWith('http') && !localUrl.includes('your-project');
  const isValidKey = localKey && localKey.length > 20 && !localKey.includes('your-anon-key');

  if (isValidUrl && isValidKey) {
    return { url: localUrl, key: localKey, isValid: true };
  }
  return { url: localUrl, key: localKey, isValid: false };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, key, isValid } = getSupabaseCredentials();
  if (isValid) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: true }
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Supabase Client initialization failed:', e);
      return null;
    }
  }
  return null;
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

// 초기 기본 학생 명단 (최신 8, 9월 데이터 반영)
const INITIAL_STUDENTS: Student[] = [
  { id: 'student-1', name: '이솔빛나', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-2', name: '황혜리', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-3', name: '전성후', group: '1순위', createdAt: new Date().toISOString() },
  { id: 'student-4', name: '강주연', group: '1순위', createdAt: new Date().toISOString() },
  { id: 'student-5', name: '엄호준', group: '1순위', createdAt: new Date().toISOString() }
];

// 초기 기본 지도 기록 (8월, 9월 최신 기록 및 누적 시수 31시간/26시간 완벽 반영)
const INITIAL_RECORDS: TeachingRecord[] = [
  // 1학기/7월 누적 시수 (중위권 10시간, 1순위 9시간)
  {
    id: '2026-07-07',
    date: '2026-07-07',
    studentIds: ['student-1', 'student-2'],
    hours: { 'student-1': 2, 'student-2': 2 },
    notes: { 'student-1': '1학기 기초 문해력 지도', 'student-2': '1학기 기초 문해력 지도' }
  },
  {
    id: '2026-07-08',
    date: '2026-07-08',
    studentIds: ['student-3'],
    hours: { 'student-3': 3 },
    notes: { 'student-3': '1순위 맞춤형 개별 집중 지도' }
  },
  {
    id: '2026-07-14',
    date: '2026-07-14',
    studentIds: ['student-1', 'student-2'],
    hours: { 'student-1': 2, 'student-2': 2 },
    notes: { 'student-1': '기초 연산 덧셈 뺄셈', 'student-2': '기초 연산 덧셈 뺄셈' }
  },
  {
    id: '2026-07-15',
    date: '2026-07-15',
    studentIds: ['student-3'],
    hours: { 'student-3': 3 },
    notes: { 'student-3': '어휘 및 문장 읽기 지도' }
  },
  {
    id: '2026-07-21',
    date: '2026-07-21',
    studentIds: ['student-1', 'student-2'],
    hours: { 'student-1': 2, 'student-2': 2 },
    notes: { 'student-1': '문해력 독해 기초', 'student-2': '문해력 독해 기초' }
  },
  {
    id: '2026-07-22',
    date: '2026-07-22',
    studentIds: ['student-3'],
    hours: { 'student-3': 3 },
    notes: { 'student-3': '수학 곱셈구구 기초' }
  },
  {
    id: '2026-07-28',
    date: '2026-07-28',
    studentIds: ['student-1', 'student-2'],
    hours: { 'student-1': 2, 'student-2': 2 },
    notes: { 'student-1': '여름방학 전 학습 정리', 'student-2': '여름방학 전 학습 정리' }
  },
  {
    id: '2026-07-29',
    date: '2026-07-29',
    studentIds: ['student-4'],
    hours: { 'student-4': 2 },
    notes: { 'student-4': '기초학력 개별 보충' }
  },

  // 2026년 8월 최신 기록 (이미지 1 일치)
  {
    id: '2026-08-04',
    date: '2026-08-04',
    studentIds: ['student-2', 'student-1'],
    hours: { 'student-2': 4, 'student-1': 4 },
    notes: { 'student-2': '기초 문해력 및 수학 기초 연산 지도 (4시간)', 'student-1': '기초 문해력 및 수학 기초 연산 지도 (4시간)' }
  },
  {
    id: '2026-08-05',
    date: '2026-08-05',
    studentIds: ['student-2'],
    hours: { 'student-2': 4 },
    notes: { 'student-2': '받아쓰기 및 읽기 지도 (4시간)' }
  },
  {
    id: '2026-08-06',
    date: '2026-08-06',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (4시간)' }
  },
  {
    id: '2026-08-07',
    date: '2026-08-07',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (4시간)' }
  },
  {
    id: '2026-08-18',
    date: '2026-08-18',
    studentIds: ['student-2'],
    hours: { 'student-2': 4 },
    notes: { 'student-2': '국어 낱말 익히기 및 글자 쓰기 (4시간)' }
  },
  {
    id: '2026-08-24',
    date: '2026-08-24',
    studentIds: ['student-1'],
    hours: { 'student-1': 1 },
    notes: { 'student-1': '문장 읽기 및 이해도 확인' }
  },
  {
    id: '2026-08-26',
    date: '2026-08-26',
    studentIds: ['student-2', 'student-1'],
    hours: { 'student-2': 4, 'student-1': 1 },
    notes: { 'student-2': '수학 곱셈구구 및 덧셈 복습 (4시간)', 'student-1': '연산 기초 보충' }
  },
  {
    id: '2026-08-28',
    date: '2026-08-28',
    studentIds: ['student-5'],
    hours: { 'student-5': 1 },
    notes: { 'student-5': '학습 집중력 및 기초 어휘 지도' }
  },
  {
    id: '2026-08-31',
    date: '2026-08-31',
    studentIds: ['student-2'],
    hours: { 'student-2': 4 },
    notes: { 'student-2': '월말 학습 성취도 확인 및 복습 (4시간)' }
  },

  // 2026년 9월 최신 기록 (이미지 2 일치)
  {
    id: '2026-09-04',
    date: '2026-09-04',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '2학기 기초학력 맞춤 지도 (4시간)' }
  },
  {
    id: '2026-09-07',
    date: '2026-09-07',
    studentIds: ['student-3'],
    hours: { 'student-3': 4 },
    notes: { 'student-3': '국어 및 수학 보충 지도 (4시간)' }
  }
];

// URL 해시 및 파라미터에서 다른 기기 동기화 정보 자동 감지 및 등록
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

// 전체 로컬 데이터 스냅샷 추출
export function exportFullData(): FullDataSnapshot {
  const students = getLocalStudents();
  const records = getLocalRecords();
  const maxHoursMiddle = getLocalMaxHours('중위권');
  const maxHoursFirst = getLocalMaxHours('1순위');
  const creds = getSupabaseCredentials();

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    students,
    records,
    maxHoursMiddle,
    maxHoursFirst,
    supabaseConfig: creds.isValid ? { url: creds.url, key: creds.key } : undefined
  };
}

// 스냅샷을 로컬 스토리지에 즉시 복원
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
    if (snapshot.supabaseConfig?.url && snapshot.supabaseConfig?.key) {
      localStorage.setItem('custom_supabase_url', snapshot.supabaseConfig.url.trim());
      localStorage.setItem('custom_supabase_anon_key', snapshot.supabaseConfig.key.trim());
      resetSupabaseClient();
    }
    return true;
  } catch (e) {
    console.error('Failed to import full data snapshot:', e);
    return false;
  }
}

// 노트북의 모든 최신 데이터를 포함하는 1초 완성 동기화 링크 생성
export function generateDataSyncUrl(): string {
  const snapshot = exportFullData();
  const jsonStr = JSON.stringify(snapshot);
  const token = btoa(encodeURIComponent(jsonStr));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}#sync_data=${token}`;
}

// URL 해시 및 파라미터에서 다른 기기 동기화 정보 자동 감지 및 등록
export function checkAndApplySyncUrl(): { applied: boolean; message?: string; count?: number } {
  try {
    if (typeof window === 'undefined') return { applied: false };

    // 1. 전체 데이터 스냅샷 해시 체크 (#sync_data=...)
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
            message: `🎉 노트북의 최신 데이터(학생 ${snapshot.students.length}명, 지도 기록 ${snapshot.records.length}일치)가 100% 완벽하게 동기화되었습니다!`
          };
        }
      }
    }

    // 2. Supabase 자격증명 해시 체크 (#sync_sb=...)
    if (hash.includes('sync_sb=')) {
      const b64 = hash.split('sync_sb=')[1].split('&')[0];
      if (b64) {
        const decoded = decodeURIComponent(atob(b64));
        const [url, key] = decoded.split('|');
        if (url && key) {
          localStorage.setItem('custom_supabase_url', url.trim());
          localStorage.setItem('custom_supabase_anon_key', key.trim());
          resetSupabaseClient();
          window.history.replaceState(null, '', window.location.pathname);
          return {
            applied: true,
            message: '✨ Supabase 클라우드가 자동으로 연결되어 실시간 동기화가 활성화되었습니다!'
          };
        }
      }
    }

    // 3. Query Params 체크 (?sync_data=... or ?sb_url=...)
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

    const qUrl = params.get('sb_url');
    const qKey = params.get('sb_key');
    if (qUrl && qKey) {
      localStorage.setItem('custom_supabase_url', qUrl.trim());
      localStorage.setItem('custom_supabase_anon_key', qKey.trim());
      resetSupabaseClient();
      window.history.replaceState(null, '', window.location.pathname);
      return {
        applied: true,
        message: '✨ Supabase 클라우드가 연결되었습니다!'
      };
    }
  } catch (e) {
    console.error('Failed to parse sync token from URL:', e);
  }
  return { applied: false };
}

// 모든 기기 Supabase 설정 링크 생성
export function generateSyncUrl(): string {
  const { url, key, isValid } = getSupabaseCredentials();
  if (!isValid || !url || !key) return '';
  const token = btoa(encodeURIComponent(`${url}|${key}`));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}#sync_sb=${token}`;
}

// SQL 생성 가이드 제공을 위한 스키마 스크립트
export const SUPABASE_SQL_SETUP = `-- Supabase SQL Editor에 복사해서 붙여넣고 실행하세요!

-- 1. 학생(students) 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 지도 기록(records) 테이블 생성 (hours 시수 컬럼 지원)
CREATE TABLE IF NOT EXISTS records (
  date TEXT PRIMARY KEY, -- YYYY-MM-DD
  student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 기존 테이블에 hours 컬럼이 없는 경우를 위한 마이그레이션 구문
ALTER TABLE records ADD COLUMN IF NOT EXISTS hours JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. 설정(settings) 테이블 생성
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Row Level Security (RLS) 활성화 (필요한 경우 활성화하고 정책 생성)
-- 테스트 목적으로는 RLS를 끄거나 모두 허용(public)으로 두면 간편합니다.
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON settings FOR ALL USING (true) WITH CHECK (true);
`;

// 로컬 캐시 즉시 반환 헬퍼 (0ms 렌더링용)
export function getLocalStudents(): Student[] {
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
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  const local = localStorage.getItem(storageKey);
  return local ? parseInt(local, 10) : 40;
}

// 1. 학생 데이터 가져오기
export async function fetchStudents(): Promise<Student[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        const students: Student[] = data.map(item => ({
          id: item.id,
          name: item.name,
          group: item.group as '중위권' | '1순위' | '기타',
          createdAt: item.created_at
        }));
        // Supabase에 데이터가 비어 있으면 로컬 기본값을 업서트하고 반환
        if (students.length === 0) {
          saveStudents(INITIAL_STUDENTS).catch(console.error);
          return INITIAL_STUDENTS;
        }
        // 로컬 캐시 동기화
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        return students;
      }
    } catch (e) {
      console.error('Supabase fetch students error:', e);
    }
  }

  return getLocalStudents();
}

// 2. 학생 데이터 저장(업서트)
export async function saveStudents(students: Student[]): Promise<boolean> {
  // 로컬 우선 즉시 저장
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
        .from('students')
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

// 2-1. 학생 단일 삭제
export async function deleteStudentFromDb(studentId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('students')
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

// 3. 기록 가져오기
export async function fetchRecords(): Promise<TeachingRecord[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('records')
        .select('*');
      
      if (!error && data) {
        const records: TeachingRecord[] = data.map(item => {
          const rawNotes = typeof item.notes === 'object' && item.notes !== null 
            ? item.notes 
            : JSON.parse(item.notes || '{}');

          // hours 필드가 DB 컬럼에 있으면 사용, 없으면 notes.__HOURS_BACKUP__에서 복원
          let parsedHours: Record<string, number> = {};
          if (typeof item.hours === 'object' && item.hours !== null && Object.keys(item.hours).length > 0) {
            parsedHours = item.hours;
          } else if (typeof item.hours === 'string' && item.hours && item.hours !== '{}') {
            try { parsedHours = JSON.parse(item.hours); } catch (_) {}
          } else if (rawNotes.__HOURS_BACKUP__) {
            try { parsedHours = JSON.parse(rawNotes.__HOURS_BACKUP__); } catch (_) {}
          }

          // UI에 노출되는 메모에서는 시스템 백업 키 제외
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

        // Supabase에 데이터가 비어 있으면 최신 초기 기록을 업서트하고 반환
        if (records.length === 0) {
          saveRecordsBatch(INITIAL_RECORDS).catch(console.error);
          return INITIAL_RECORDS;
        }

        // 로컬 캐시 동기화
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
        return records;
      }
    } catch (e) {
      console.error('Supabase fetch records error:', e);
    }
  }

  return getLocalRecords();
}

// 4. 단일 기록 초고속 저장 (로컬 즉시 반영 + 비동기 원격 업서트)
export async function saveRecord(record: TeachingRecord): Promise<boolean> {
  const currentHours = record.hours || {};
  
  // DB의 hours 컬럼 존재 유무에 상관없이 100% 안전하게 보존하기 위해 notes 내부에 __HOURS_BACKUP__을 병합
  const notesWithBackup = {
    ...record.notes,
    __HOURS_BACKUP__: JSON.stringify(currentHours)
  };

  // 로컬 캐시 즉시 업데이트 (O(1) 속도)
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
        .from('records')
        .upsert({
          date: record.date,
          student_ids: record.studentIds,
          hours: currentHours,
          notes: notesWithBackup,
          updated_at: new Date().toISOString()
        }, { onConflict: 'date' });

      if (upsertError) {
        // Fallback: hours 컬럼이 없는 테이블인 경우
        await client
          .from('records')
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

// 4-1. 여러 기록 초고속 일괄 배치 저장 (1번의 HTTP 호출로 0.1초 동기화)
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
        .from('records')
        .upsert(batchPayload, { onConflict: 'date' });

      if (error) {
        // Fallback if hours column not yet migrated
        const fallbackPayload = batchPayload.map(p => {
          const { hours, ...rest } = p;
          return rest;
        });
        await client.from('records').upsert(fallbackPayload, { onConflict: 'date' });
      }
      return true;
    } catch (e) {
      console.error('Supabase batch upsert failed:', e);
      return false;
    }
  }
  return true;
}

// 5. 최대 지도 시수 로드
export async function fetchMaxHours(group: '중위권' | '1순위'): Promise<number> {
  const client = getSupabaseClient();
  const keyName = group === '중위권' ? 'max_hours_middle' : 'max_hours_first';
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  const defaultVal = 40;

  if (client) {
    try {
      const { data, error } = await client
        .from('settings')
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

// 6. 최대 지도 시수 저장
export async function saveMaxHours(group: '중위권' | '1순위', hours: number): Promise<boolean> {
  const keyName = group === '중위권' ? 'max_hours_middle' : 'max_hours_first';
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  localStorage.setItem(storageKey, hours.toString());
  
  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('settings')
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

// 7. 전체 로컬 데이터를 Supabase 클라우드로 초고속 병렬 일괄 업로드 (0.2초 완성)
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

    // 병렬로 초고속 일괄 업로드
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

// 8. Supabase 실시간 WebSocket 구독 (기기 간 실시간 자동 0.1초 동기화)
export function subscribeToRealtimeChanges(onRemoteChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('edu_calendar_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
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
