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

// 초기 기본 학생 명단
const INITIAL_STUDENTS: Student[] = [
  { id: 'student-1', name: '이솔빛나', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-2', name: '황혜리', group: '중위권', createdAt: new Date().toISOString() },
  { id: 'student-3', name: '전성후', group: '1순위', createdAt: new Date().toISOString() },
  { id: 'student-4', name: '강주연', group: '1순위', createdAt: new Date().toISOString() }
];

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
          await saveStudents(INITIAL_STUDENTS);
          return INITIAL_STUDENTS;
        }
        // 로컬 캐시 동기화
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        return students;
      } else {
        console.warn('Supabase fetch students error, using local fallback:', error);
      }
    } catch (e) {
      console.error('Supabase connection failed:', e);
    }
  }

  // Fallback: LocalStorage
  const local = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (local) {
    return JSON.parse(local);
  }
  // 기본값 저장 및 반환
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  return INITIAL_STUDENTS;
}

// 2. 학생 데이터 저장(업서트)
export async function saveStudents(students: Student[]): Promise<boolean> {
  // 로컬 우선 저장
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
            id: item.date, // date를 id로도 취급
            date: item.date,
            studentIds: Array.isArray(item.student_ids) ? item.student_ids : JSON.parse(item.student_ids || '[]'),
            hours: parsedHours,
            notes: cleanNotes,
            updatedAt: item.updated_at
          };
        });

        // 로컬 캐시 동기화
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
        return records;
      } else {
        console.warn('Supabase fetch records error, using local fallback:', error);
      }
    } catch (e) {
      console.error('Supabase connection failed:', e);
    }
  }

  // Fallback: LocalStorage
  const local = localStorage.getItem(STORAGE_KEYS.RECORDS);
  return local ? JSON.parse(local) : [];
}

// 4. 기록 저장(단일 일자 업서트)
export async function saveRecord(record: TeachingRecord): Promise<boolean> {
  const currentHours = record.hours || {};
  
  // DB의 hours 컬럼 존재 유무에 상관없이 100% 안전하게 보존하기 위해 notes 내부에 __HOURS_BACKUP__을 병합
  const notesWithBackup = {
    ...record.notes,
    __HOURS_BACKUP__: JSON.stringify(currentHours)
  };

  // 로컬 저장 (클라이언트 상태 동기화)
  const localRecords = await fetchRecords();
  const cleanRecord: TeachingRecord = {
    ...record,
    hours: currentHours
  };
  const existingIndex = localRecords.findIndex(r => r.date === record.date);
  if (existingIndex >= 0) {
    localRecords[existingIndex] = cleanRecord;
  } else {
    localRecords.push(cleanRecord);
  }
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(localRecords));

  const client = getSupabaseClient();
  if (client) {
    try {
      // 1차 시도: hours 컬럼을 포함하여 업서트
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
        console.warn('Supabase record upsert with hours column failed, retrying with notes-backup fallback:', upsertError.message);
        
        // 2차 시도 (Fallback): DB에 hours 컬럼이 아직 없는 경우 hours 컬럼을 제외하고 notes 백업으로 저장
        const { error: fallbackError } = await client
          .from('records')
          .upsert({
            date: record.date,
            student_ids: record.studentIds,
            notes: notesWithBackup,
            updated_at: new Date().toISOString()
          }, { onConflict: 'date' });

        if (fallbackError) {
          console.error('Supabase fallback record upsert failed:', fallbackError);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Supabase record upsert exception:', e);
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
  const defaultVal = group === '중위권' ? 20 : 30;

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
      console.error('Supabase load settings failed:', e);
    }
  }
  
  const local = localStorage.getItem(storageKey);
  return local ? parseInt(local, 10) : defaultVal;
}

// 6. 최대 지도 시수 저장
export async function saveMaxHours(group: '중위권' | '1순위', hours: number): Promise<boolean> {
  const keyName = group === '중위권' ? 'max_hours_middle' : 'max_hours_first';
  const storageKey = group === '중위권' ? 'edu_calendar_max_hours_middle' : 'edu_calendar_max_hours_first';
  localStorage.setItem(storageKey, hours.toString());
  
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('settings')
        .upsert({
          key: keyName,
          value: hours.toString()
        }, { onConflict: 'key' });
      
      if (error) {
        console.error('Supabase save settings error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase settings upsert failed:', e);
      return false;
    }
  }
  return true;
}
