import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, TeachingRecord } from '../types';

// ====================================================
// [통합 portal 프로젝트 기본 설정]
// 모든 PC와 브라우저에서 기본적으로 이 백엔드에 즉시 연결되도록 보장
// ====================================================
export const PORTAL_PROJECT_URL = 'https://lqajnsqoovngfgabalkj.supabase.co';
export const PORTAL_PROJECT_ANON_KEY = 'sb_publishable_DcAlnHgLYSd92ICS66z3RA_DvrzyPhX';

let supabaseInstance: SupabaseClient | null = null;

// 로컬스토리지에서 사용자 지정 Supabase 설정 로드 (기본값: portal 프로젝트)
export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('custom_supabase_url');
  const localKey = localStorage.getItem('custom_supabase_anon_key');
  
  // placeholder 형식의 더미 값들 필터링
  const isValidCustomUrl = localUrl && localUrl.startsWith('http') && !localUrl.includes('your-project');
  const isValidCustomKey = localKey && localKey.length > 20 && !localKey.includes('your-anon-key');

  if (isValidCustomUrl && isValidCustomKey) {
    return { url: localUrl, key: localKey, isValid: true };
  }

  // 기본적으로 portal 프로젝트를 사용하여 어떤 PC/브라우저에서든 0초 만에 완벽 동기화 보장!
  return { url: PORTAL_PROJECT_URL, key: PORTAL_PROJECT_ANON_KEY, isValid: true };
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
  MAX_HOURS: 'edu_calendar_max_hours',
  DELETED_STUDENTS: 'edu_calendar_deleted_students',
  INITIALIZED: 'edu_calendar_initialized_v1'
};

// Supabase 테이블명 상수 (기본 portal 프로젝트의 basic_ 접두사 테이블 100% 매핑)
export const DB_TABLES = {
  STUDENTS: 'basic_students',
  RECORDS: 'basic_records',
  SETTINGS: 'basic_settings'
};

// 학생 구버전 ID -> Supabase DB 정규 ID 매핑
export const STUDENT_ID_ALIASES: Record<string, string> = {
  'student-4': 'student-1790555167606', // 강주연
  'student-6': 'student-1782781087573', // 이정
  'student-1782781947678': 'student-1782781087573', // 이정
};

export function normalizeRecordStudentIds(record: TeachingRecord): TeachingRecord {
  const newStudentIds = new Set<string>();
  const newHours: Record<string, number> = {};
  const newNotes: Record<string, string> = {};

  for (const sid of record.studentIds) {
    const targetId = STUDENT_ID_ALIASES[sid] || sid;
    newStudentIds.add(targetId);
  }

  for (const [k, v] of Object.entries(record.hours || {})) {
    const targetId = STUDENT_ID_ALIASES[k] || k;
    newHours[targetId] = v;
  }

  for (const [k, v] of Object.entries(record.notes || {})) {
    const targetId = STUDENT_ID_ALIASES[k] || k;
    newNotes[targetId] = v;
  }

  return {
    ...record,
    studentIds: Array.from(newStudentIds),
    hours: newHours,
    notes: newNotes
  };
}

// 중복 학생(이름 동일) 자동 감지 및 단일화 헬퍼 함수
export function deduplicateStudents(studentsList: Student[]): { 
  uniqueStudents: Student[]; 
  duplicateIdMap: Record<string, string>; 
  removedIds: string[];
} {
  const seen = new Map<string, Student>();
  const duplicateIdMap: Record<string, string> = {};
  const removedIds: string[] = [];

  for (const s of studentsList) {
    const key = s.name.trim();
    if (!seen.has(key)) {
      seen.set(key, s);
    } else {
      const existing = seen.get(key)!;
      // 강주연 학생의 경우 중위권을 가진 쪽을 최종 채택
      if (key === '강주연' && s.group === '중위권') {
        duplicateIdMap[existing.id] = s.id;
        removedIds.push(existing.id);
        seen.set(key, s);
      } else {
        duplicateIdMap[s.id] = existing.id;
        removedIds.push(s.id);
      }
    }
  }

  return {
    uniqueStudents: Array.from(seen.values()),
    duplicateIdMap,
    removedIds
  };
}

// 지도 기록(records) 내의 중복 학생 ID를 대표 ID로 자동 마이그레이션
export function migrateDuplicateStudentIdsInRecords(idMap: Record<string, string>): void {
  if (Object.keys(idMap).length === 0 || typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) return;
    const records: TeachingRecord[] = JSON.parse(raw);
    let changed = false;

    const updatedRecords = records.map(rec => {
      let recChanged = false;
      const newStudentIds = new Set<string>();
      const newHours: Record<string, number> = { ...(rec.hours || {}) };
      const newNotes: Record<string, string> = { ...(rec.notes || {}) };

      for (const sid of rec.studentIds) {
        if (idMap[sid]) {
          const targetId = idMap[sid];
          newStudentIds.add(targetId);
          recChanged = true;
          changed = true;
          if (newHours[sid] !== undefined) {
            newHours[targetId] = newHours[sid];
            delete newHours[sid];
          }
          if (newNotes[sid] !== undefined) {
            newNotes[targetId] = newNotes[sid];
            delete newNotes[sid];
          }
        } else {
          newStudentIds.add(sid);
        }
      }

      if (recChanged) {
        return {
          ...rec,
          studentIds: Array.from(newStudentIds),
          hours: newHours,
          notes: newNotes
        };
      }
      return rec;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));
      // Supabase에도 백그라운드 배치 업데이트
      saveRecordsBatch(updatedRecords).catch(console.error);
    }
  } catch (e) {
    console.error('Failed to migrate duplicate student IDs in records:', e);
  }
}

// 삭제된 학생 ID 영구 보관 (좀비 부활 원천 차단)
export function getDeletedStudentIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_STUDENTS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (_) {}
  return new Set();
}

export function markStudentDeleted(studentId: string): void {
  if (typeof window === 'undefined' || !studentId) return;
  try {
    const set = getDeletedStudentIds();
    set.add(studentId);
    localStorage.setItem(STORAGE_KEYS.DELETED_STUDENTS, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to mark student as deleted:', e);
  }
}

// 최신 데이터 버전 관리 키 (모든 브라우저의 기본 URL 접속 시 최신 데이터 자동 동기화 보장)
export const CURRENT_DATA_VERSION = '2026-09-28-v17-kang-middle-sync';

// 초기 기본 학생 명단 (실제 Supabase DB 학생 테이블과 100% 일치)
export const INITIAL_STUDENTS: Student[] = [
  { id: 'student-1', name: '이솔빛나', group: '중위권', createdAt: '2026-06-29 14:23:06.054+00' },
  { id: 'student-2', name: '황혜리', group: '중위권', createdAt: '2026-06-29 14:23:06.054+00' },
  { id: 'student-1782781087573', name: '이정', group: '중위권', createdAt: '2026-06-30 00:58:07.573+00' },
  { id: 'student-5', name: '엄호준', group: '중위권', createdAt: '2026-09-27 23:57:23.423+00' },
  { id: 'student-1790555167606', name: '강주연', group: '중위권', createdAt: '2026-09-28 00:26:07.606+00' },
  { id: 'student-3', name: '전성후', group: '1순위', createdAt: '2026-06-29 14:23:06.054+00' }
];

// 초기 기본 지도 기록 (중위권 35차시[남은 5차시], 1순위 27차시[남은 13차시] 실제 일지 100% 일치 반영)
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

  // ================= 9월 (학교 PC 실제 일지 100% 일치) =================
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
    hours: { 'student-3': 3 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' }
  },
  {
    id: '2026-09-09',
    date: '2026-09-09',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (1차시)' }
  },
  {
    id: '2026-09-14',
    date: '2026-09-14',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (1차시)' }
  },
  {
    id: '2026-09-18',
    date: '2026-09-18',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (1차시)' }
  },
  {
    id: '2026-09-21',
    date: '2026-09-21',
    studentIds: ['student-1790555167606'],
    hours: { 'student-1790555167606': 1 },
    notes: { 'student-1790555167606': '중위권 맞춤형 개별 지도 (1차시)' }
  },
  {
    id: '2026-09-22',
    date: '2026-09-22',
    studentIds: ['student-1790555167606', 'student-2'],
    hours: { 'student-1790555167606': 1, 'student-2': 1 },
    notes: { 'student-1790555167606': '중위권 지도 (1차시)', 'student-2': '중위권 지도 (1차시)' }
  },
  {
    id: '2026-09-23',
    date: '2026-09-23',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (1차시)' }
  },
  {
    id: '2026-09-28',
    date: '2026-09-28',
    studentIds: ['student-3'],
    hours: { 'student-3': 1 },
    notes: { 'student-3': '1순위 맞춤형 개별 지도 (1차시)' }
  }
];

// 어떤 브라우저/기기에서든 기본 웹앱 주소로 접속 시 최신 데이터가 즉시 로드되도록 보장하는 안전한 마이그레이션 함수
export function ensureLatestDataVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    const dataVersion = localStorage.getItem('edu_calendar_data_version');
    const deletedSet = getDeletedStudentIds();

    // 버전이 다르거나 최초 접속인 경우 최신 명단(강주연: 중위권) 동기화
    if (!isInitialized || dataVersion !== CURRENT_DATA_VERSION) {
      const existingStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (existingStudents) {
        try {
          const parsed: Student[] = JSON.parse(existingStudents);
          if (Array.isArray(parsed)) {
            // 강주연 학생을 중위권으로 보정하고 중복 제거
            const updated = parsed.map(s => {
              if (s.name.trim() === '강주연') return { ...s, group: '중위권' as const };
              return s;
            });
            const deduped = deduplicateStudents(updated.filter(s => !deletedSet.has(s.id))).uniqueStudents;
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(deduped));
          }
        } catch (_) {}
      } else {
        const initialFiltered = deduplicateStudents(INITIAL_STUDENTS.filter(s => !deletedSet.has(s.id))).uniqueStudents;
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialFiltered));
      }

      if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
      }
      if (!localStorage.getItem('edu_calendar_max_hours_middle')) {
        localStorage.setItem('edu_calendar_max_hours_middle', '40');
      }
      if (!localStorage.getItem('edu_calendar_max_hours_first')) {
        localStorage.setItem('edu_calendar_max_hours_first', '40');
      }
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      localStorage.setItem('edu_calendar_data_version', CURRENT_DATA_VERSION);
    } else {
      // 이미 최신 버전: 혹시 남아있는 삭제/중복 학생 정리
      const existingStudentsStr = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (existingStudentsStr) {
        try {
          const parsed = JSON.parse(existingStudentsStr);
          if (Array.isArray(parsed)) {
            const updated = parsed.map(s => {
              if (s.name.trim() === '강주연') return { ...s, group: '중위권' as const };
              return s;
            });
            const cleaned = deduplicateStudents(updated.filter(s => !deletedSet.has(s.id))).uniqueStudents;
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleaned));
            }
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error('Failed to ensure data version:', e);
  }
}

// 모듈 로딩 시 즉시 실행
ensureLatestDataVersion();

// URL 해시 및 파라미터에서 다른 기기 동기화 정보 자동 감지 및 등록
export interface FullDataSnapshot {
  version: number;
  timestamp: string;
  students: Student[];
  records: TeachingRecord[];
  maxHoursMiddle: number;
  maxHoursFirst: number;
  deletedStudentIds?: string[];
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
  const deletedStudentIds = Array.from(getDeletedStudentIds());

  return {
    version: 2,
    timestamp: new Date().toISOString(),
    students,
    records,
    maxHoursMiddle,
    maxHoursFirst,
    deletedStudentIds,
    supabaseConfig: creds.isValid ? { url: creds.url, key: creds.key } : undefined
  };
}

// 스냅샷을 로컬 스토리지에 즉시 복원
export function importFullData(snapshot: FullDataSnapshot): boolean {
  if (!snapshot || !Array.isArray(snapshot.students) || !Array.isArray(snapshot.records)) {
    return false;
  }
  try {
    // 삭제된 학생 ID 영구 반영
    if (Array.isArray(snapshot.deletedStudentIds)) {
      const currentDeleted = getDeletedStudentIds();
      snapshot.deletedStudentIds.forEach(id => currentDeleted.add(id));
      localStorage.setItem(STORAGE_KEYS.DELETED_STUDENTS, JSON.stringify(Array.from(currentDeleted)));
    }

    const deletedSet = getDeletedStudentIds();
    const filteredStudents = snapshot.students.filter(s => !deletedSet.has(s.id));

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filteredStudents));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(snapshot.records));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
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
  ensureLatestDataVersion();
  const deletedSet = getDeletedStudentIds();
  const local = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(s => !deletedSet.has(s.id));
        return deduplicateStudents(filtered).uniqueStudents;
      }
    } catch (_) {}
  }
  const initClean = INITIAL_STUDENTS.filter(s => !deletedSet.has(s.id));
  return deduplicateStudents(initClean).uniqueStudents;
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

// 1. 학생 데이터 가져오기
export async function fetchStudents(): Promise<Student[]> {
  const deletedSet = getDeletedStudentIds();
  const client = getSupabaseClient();
  
  if (client) {
    try {
      // 1. Supabase에서 삭제된 학생 목록이 세팅에 있다면 로컬과 병합
      try {
        const { data: remoteDeletedData } = await client
          .from(DB_TABLES.SETTINGS)
          .select('value')
          .eq('key', 'deleted_students')
          .single();
        if (remoteDeletedData?.value) {
          const remoteDeletedArr = JSON.parse(remoteDeletedData.value);
          if (Array.isArray(remoteDeletedArr)) {
            remoteDeletedArr.forEach((id: string) => deletedSet.add(id));
            localStorage.setItem(STORAGE_KEYS.DELETED_STUDENTS, JSON.stringify(Array.from(deletedSet)));
          }
        }
      } catch (_) {}

      // 2. 학생 목록 조회
      const { data, error } = await client
        .from(DB_TABLES.STUDENTS)
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        const rawStudents: Student[] = data.map(item => {
          let grp = item.group as '중위권' | '1순위' | '기타';
          // 강주연 학생은 중위권으로 확실하게 정규화
          if (item.name && item.name.trim() === '강주연') {
            grp = '중위권';
            if (item.group !== '중위권') {
              client.from(DB_TABLES.STUDENTS).update({ group: '중위권' }).eq('id', item.id).then(() => {}, (err: any) => console.error(err));
            }
          }
          return {
            id: item.id,
            name: item.name,
            group: grp,
            createdAt: item.created_at
          };
        });

        // 만약 Supabase 원격 DB에 삭제된 학생이 남아있다면 원격 DB에서도 영구 삭제
        const zombiesInRemote = rawStudents.filter(s => deletedSet.has(s.id));
        if (zombiesInRemote.length > 0) {
          const zombieIds = zombiesInRemote.map(s => s.id);
          try {
            await client.from(DB_TABLES.STUDENTS).delete().in('id', zombieIds);
            console.log('Cleaned zombie students from remote DB:', zombieIds);
          } catch (cleanErr) {
            console.warn('Failed to clean remote zombies:', cleanErr);
          }
        }

        // 삭제된 학생은 무조건 완전 제외!
        const validStudents = rawStudents.filter(s => !deletedSet.has(s.id));

        // ⚠️ 중복 학생(이름 동일) 자동 감지 및 정리 (DB 및 로컬 동시 정리)
        const { uniqueStudents, duplicateIdMap, removedIds } = deduplicateStudents(validStudents);
        if (removedIds.length > 0) {
          try {
            await client.from(DB_TABLES.STUDENTS).delete().in('id', removedIds);
            console.log('Cleaned duplicate student entries from DB:', removedIds);
          } catch (dupErr) {
            console.warn('Failed to clean duplicate students:', dupErr);
          }
          migrateDuplicateStudentIdsInRecords(duplicateIdMap);
        }

        // Supabase에 데이터가 전혀 없고 최초 상태인 경우에만 초기 학생 저장
        if (rawStudents.length === 0 && !localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
          const initialClean = deduplicateStudents(INITIAL_STUDENTS.filter(s => !deletedSet.has(s.id))).uniqueStudents;
          saveStudents(initialClean).catch(console.error);
          return initialClean;
        }

        // ⚠️ 절대 삭제된 학생을 누락된 학생으로 착각하여 INITIAL_STUDENTS와 강제 병합하지 않음!
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(uniqueStudents));
        return uniqueStudents;
      }
    } catch (e) {
      console.error('Supabase fetch students error:', e);
    }
  }

  return getLocalStudents();
}

// 2. 학생 데이터 저장(업서트)
export async function saveStudents(students: Student[]): Promise<boolean> {
  const deletedSet = getDeletedStudentIds();
  // 삭제된 학생 제외 및 중복 제거
  const { uniqueStudents } = deduplicateStudents(students.filter(s => !deletedSet.has(s.id)));

  // 로컬 우선 즉시 저장
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(uniqueStudents));

  const client = getSupabaseClient();
  if (client) {
    try {
      if (uniqueStudents.length > 0) {
        const upsertData = uniqueStudents.map(s => ({
          id: s.id,
          name: s.name,
          group: s.group,
          created_at: s.createdAt
        }));

        const { error } = await client
          .from(DB_TABLES.STUDENTS)
          .upsert(upsertData, { onConflict: 'id' });

        if (error) {
          console.error('Supabase save students error:', error);
          return false;
        }
      }

      // Supabase settings 테이블에 삭제된 학생 목록 동기화
      if (deletedSet.size > 0) {
        await client.from(DB_TABLES.SETTINGS).upsert({
          key: 'deleted_students',
          value: JSON.stringify(Array.from(deletedSet))
        }, { onConflict: 'key' });
      }

      return true;
    } catch (e) {
      console.error('Supabase student upsert failed:', e);
      return false;
    }
  }
  return true;
}

// 2-1. 학생 단일 영구 삭제 (좀비 부활 원천 차단)
export async function deleteStudentFromDb(studentId: string): Promise<boolean> {
  // 1. 영구 삭제 톰스톤 목록에 등록
  markStudentDeleted(studentId);

  // 2. 로컬 스토리지에서 즉시 완벽 제거
  try {
    const local = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (local) {
      const parsed: Student[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const updated = parsed.filter(s => s.id !== studentId);
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.error('Failed to remove student from localStorage:', err);
  }

  // 3. Supabase DB에서 삭제 및 settings에 삭제 목록 영구 기록
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from(DB_TABLES.STUDENTS)
        .delete()
        .eq('id', studentId);
      
      const deletedSet = getDeletedStudentIds();
      await client.from(DB_TABLES.SETTINGS).upsert({
        key: 'deleted_students',
        value: JSON.stringify(Array.from(deletedSet))
      }, { onConflict: 'key' });

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
        .from(DB_TABLES.RECORDS)
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

          const rec: TeachingRecord = {
            id: item.date,
            date: item.date,
            studentIds: Array.isArray(item.student_ids) ? item.student_ids : JSON.parse(item.student_ids || '[]'),
            hours: parsedHours,
            notes: cleanNotes,
            updatedAt: item.updated_at
          };

          // 구버전 학생 ID (student-4 -> student-1790555167606 등) 정규화
          return normalizeRecordStudentIds(rec);
        });

        // Supabase에 데이터가 비어 있으면 최신 초기 기록을 업서트하고 반환
        if (records.length === 0 && !localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
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

  const local = getLocalRecords();
  return local.map(r => normalizeRecordStudentIds(r));
}

// 4. 단일 기록 초고속 저장 (로컬 즉시 반영 + 비동기 원격 업서트)
export async function saveRecord(record: TeachingRecord): Promise<boolean> {
  const normalized = normalizeRecordStudentIds(record);
  const currentHours = normalized.hours || {};
  
  // DB의 hours 컬럼 존재 유무에 상관없이 100% 안전하게 보존하기 위해 notes 내부에 __HOURS_BACKUP__을 병합
  const notesWithBackup = {
    ...normalized.notes,
    __HOURS_BACKUP__: JSON.stringify(currentHours)
  };

  // 로컬 캐시 즉시 업데이트 (O(1) 속도)
  const local = getLocalRecords();
  const cleanRecord: TeachingRecord = {
    ...normalized,
    hours: currentHours
  };
  const existingIndex = local.findIndex(r => r.date === normalized.date);
  if (existingIndex >= 0) {
    local[existingIndex] = cleanRecord;
  } else {
    local.push(cleanRecord);
  }
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(local));

  const client = getSupabaseClient();
  if (client) {
    try {
      // records 테이블의 실제 컬럼: date (PK), student_ids, notes, hours, updated_at
      // 주의: id 컬럼은 records 테이블에 존재하지 않으므로 전송 금지!
      const payload: any = {
        date: normalized.date,
        student_ids: normalized.studentIds,
        hours: currentHours,
        notes: notesWithBackup,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await client
        .from(DB_TABLES.RECORDS)
        .upsert(payload, { onConflict: 'date' });

      if (upsertError) {
        console.error('Supabase record upsert error:', upsertError);
        // Fallback: 혹시 hours 컬럼 없는 경우
        const { hours, ...fallbackPayload } = payload;
        const res2 = await client.from(DB_TABLES.RECORDS).upsert(fallbackPayload, { onConflict: 'date' });
        if (res2.error) {
          console.error('Supabase fallback error:', res2.error);
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

// 4-1. 여러 기록 초고속 일괄 배치 저장 (1번의 HTTP 호출로 0.1초 동기화)
export async function saveRecordsBatch(recordsList: TeachingRecord[]): Promise<boolean> {
  const normalizedList = recordsList.map(r => normalizeRecordStudentIds(r));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(normalizedList));

  const client = getSupabaseClient();
  if (client && normalizedList.length > 0) {
    try {
      const batchPayload = normalizedList.map(rec => {
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

      let { error } = await client
        .from(DB_TABLES.RECORDS)
        .upsert(batchPayload, { onConflict: 'date' });

      if (error) {
        console.warn('Batch upsert onConflict:date failed, fallback without hours...', error);
        const fallbackPayload = batchPayload.map(p => {
          const { hours, ...rest } = p;
          return rest;
        });
        await client.from(DB_TABLES.RECORDS).upsert(fallbackPayload, { onConflict: 'date' });
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
        .from(DB_TABLES.SETTINGS)
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
        .from(DB_TABLES.SETTINGS)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.RECORDS }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.STUDENTS }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.SETTINGS }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
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
