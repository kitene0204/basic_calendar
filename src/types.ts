export interface Student {
  id: string;
  name: string;
  group: '중위권' | '1순위' | '기타';
  createdAt: string;
}

export interface TeachingRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  studentIds: string[]; // 지도받은 학생 ID들
  hours?: { [studentId: string]: number }; // 학생 ID별 지도 시수(차시/시간, 기본값 1)
  notes: { [studentId: string]: string }; // 학생 ID별 개별 지도 내용
  updatedAt: string;
}

export interface AppSettings {
  maxHoursMiddle: number; // 중위권 최대 지도 시수
  maxHoursFirst: number;  // 1순위 최대 지도 시수
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  isSupabaseEnabled: boolean;
}
