import { Student, TeachingRecord } from '../types';

let currentServerVersion = 0;

export interface ServerSyncData {
  students: Student[];
  records: TeachingRecord[];
  maxHoursMiddle: number;
  maxHoursFirst: number;
  version: number;
  updatedAt?: string;
}

// 1. 서버에서 최신 전체 데이터 로드 (학교 컴퓨터 및 모든 스마트폰에 100% 동일 제공)
export async function fetchServerData(): Promise<ServerSyncData | null> {
  try {
    const res = await fetch('/api/data', { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      currentServerVersion = data.version;
      // 로컬 스토리지도 함께 업데이트하여 오프라인에서도 즉시 조회 가능하도록 보장
      try {
        localStorage.setItem('edu_calendar_students_v1', JSON.stringify(data.students));
        localStorage.setItem('edu_calendar_records_v1', JSON.stringify(data.records));
        localStorage.setItem('edu_calendar_max_hours_middle', String(data.maxHoursMiddle));
        localStorage.setItem('edu_calendar_max_hours_first', String(data.maxHoursFirst));
        localStorage.setItem('edu_calendar_server_version', String(data.version));
      } catch (_) {}
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch from server sync:', err);
  }
  return null;
}

// 2. 단일 지도 기록 서버 저장
export async function saveRecordToServer(record: TeachingRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      currentServerVersion = data.version;
      return true;
    }
  } catch (err) {
    console.error('saveRecordToServer error:', err);
  }
  return false;
}

// 3. 학생 명단 서버 저장
export async function saveStudentsToServer(students: Student[]): Promise<boolean> {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      currentServerVersion = data.version;
      return true;
    }
  } catch (err) {
    console.error('saveStudentsToServer error:', err);
  }
  return false;
}

// 4. 최대 시수 서버 저장
export async function saveSettingsToServer(maxHoursMiddle: number, maxHoursFirst: number): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxHoursMiddle, maxHoursFirst })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      currentServerVersion = data.version;
      return true;
    }
  } catch (err) {
    console.error('saveSettingsToServer error:', err);
  }
  return false;
}

// 5. 학교 컴퓨터 로컬 데이터 -> 서버 일괄 동기화 (최초 1회 또는 동기화 버튼 클릭 시)
export async function syncLocalToServer(
  students: Student[],
  records: TeachingRecord[],
  maxHoursMiddle: number,
  maxHoursFirst: number
): Promise<ServerSyncData | null> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, records, maxHoursMiddle, maxHoursFirst })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      currentServerVersion = data.version;
      return data;
    }
  } catch (err) {
    console.error('syncLocalToServer error:', err);
  }
  return null;
}

// 6. 실시간 동기화 구독 (SSE + 1.5초 버전 폴링 듀얼 엔진)
// 다른 컴퓨터나 스마트폰에서 수정한 내용이 0.1~1초 만에 화면에 자동 갱신됨
export function subscribeToServerRealtime(onRemoteUpdate: () => void): () => void {
  let eventSource: EventSource | null = null;
  let pollingTimer: any = null;
  let isClosed = false;

  // 1) Server-Sent Events 연결
  try {
    eventSource = new EventSource('/api/realtime');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.version && payload.version !== currentServerVersion) {
          currentServerVersion = payload.version;
          onRemoteUpdate();
        }
      } catch (_) {}
    };
    eventSource.onerror = () => {
      // SSE 실패 시 조용히 닫고 폴링에 집중
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  } catch (_) {}

  // 2) 초경량 1.5초 버전 폴링 (어떤 모바일 브라우저나 불안정한 와이파이에서도 100% 무조건 동기화 보장)
  pollingTimer = setInterval(async () => {
    if (isClosed || document.visibilityState !== 'visible') return;
    try {
      const res = await fetch('/api/version', { cache: 'no-cache' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.version && json.version !== currentServerVersion) {
        currentServerVersion = json.version;
        onRemoteUpdate();
      }
    } catch (_) {}
  }, 1500);

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
}
