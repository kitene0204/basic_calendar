import { Student, TeachingRecord } from '../types';

export interface TeachingHoursSummary {
  // 날짜별 동시간 지도 반영 시수 (선생님의 실제 수업 운영 시수)
  middleTeachingHours: number;   // 중위권 실제 운영 시수
  firstTeachingHours: number;    // 1순위 실제 운영 시수
  otherTeachingHours: number;    // 기타 실제 운영 시수
  totalTeachingHours: number;    // 총 운영 시수 = middle + first + other

  // 남은 시수 (남은 시간 = Math.max(0, 목표 - 진행))
  middleRemaining: number;
  firstRemaining: number;

  // 진도율 (%)
  middleProgress: number;
  firstProgress: number;
}

/**
 * 기초학력 지도 시수 계산 규칙:
 * 동일한 날짜에 같은 그룹의 학생 여러 명을 지도하더라도 (예: 중위권 강주연 1시간, 황혜리 1시간),
 * 이는 동시간대 분반/그룹 지도이므로 해당 그룹의 해당 일자 지도 시간은 1시간(그 날 해당 그룹 학생들 중 최대 시간)으로 카운팅합니다.
 * 날짜별로 (중위권 최대시간 + 1순위 최대시간)을 각각 일자별로 합산하여 누적 시수를 정확히 계산합니다.
 */
export function calculateTeachingHours(
  records: TeachingRecord[],
  students: Student[],
  maxHoursMiddle: number = 40,
  maxHoursFirst: number = 40
): TeachingHoursSummary {
  const studentMap = new Map<string, Student>();
  students.forEach(s => {
    studentMap.set(s.id, s);
    // 레거시 ID alias 방어
    if (s.name.trim() === '강주연') studentMap.set('student-4', s);
    if (s.name.trim() === '이정') {
      studentMap.set('student-6', s);
      studentMap.set('student-1782781947678', s);
    }
  });

  let middleTeachingHours = 0;
  let firstTeachingHours = 0;
  let otherTeachingHours = 0;

  records.forEach(record => {
    if (!record.studentIds || record.studentIds.length === 0) return;

    let dayMiddleHours = 0;
    let dayFirstHours = 0;
    let dayOtherHours = 0;

    record.studentIds.forEach(sid => {
      const student = studentMap.get(sid);
      const hours = record.hours?.[sid] ?? 1;

      if (student) {
        if (student.group === '중위권') {
          dayMiddleHours = Math.max(dayMiddleHours, hours);
        } else if (student.group === '1순위') {
          dayFirstHours = Math.max(dayFirstHours, hours);
        } else {
          dayOtherHours = Math.max(dayOtherHours, hours);
        }
      }
    });

    middleTeachingHours += dayMiddleHours;
    firstTeachingHours += dayFirstHours;
    otherTeachingHours += dayOtherHours;
  });

  const middleRemaining = Math.max(0, maxHoursMiddle - middleTeachingHours);
  const firstRemaining = Math.max(0, maxHoursFirst - firstTeachingHours);

  const middleProgress = maxHoursMiddle > 0 ? Math.min(100, Math.round((middleTeachingHours / maxHoursMiddle) * 100)) : 0;
  const firstProgress = maxHoursFirst > 0 ? Math.min(100, Math.round((firstTeachingHours / maxHoursFirst) * 100)) : 0;

  return {
    middleTeachingHours,
    firstTeachingHours,
    otherTeachingHours,
    totalTeachingHours: middleTeachingHours + firstTeachingHours + otherTeachingHours,
    middleRemaining,
    firstRemaining,
    middleProgress,
    firstProgress
  };
}

/**
 * 특정 일자(모달 또는 하루 기준)의 지도 시수 계산:
 * 하루에 중위권 학생 강주연, 황혜리를 1시간씩 지도해도 해당 일자의 중위권 시수는 1시간(최대 시간)으로 계산
 */
export function calculateDayHours(
  studentIds: string[],
  hoursMap: Record<string, number> = {},
  students: Student[]
): {
  dayMiddleHours: number;
  dayFirstHours: number;
  dayOtherHours: number;
  totalDayHours: number;
  selectedMiddleCount: number;
  selectedFirstCount: number;
  selectedOtherCount: number;
} {
  const studentMap = new Map<string, Student>();
  students.forEach(s => {
    studentMap.set(s.id, s);
    if (s.name.trim() === '강주연') studentMap.set('student-4', s);
    if (s.name.trim() === '이정') {
      studentMap.set('student-6', s);
      studentMap.set('student-1782781947678', s);
    }
  });

  let dayMiddleHours = 0;
  let dayFirstHours = 0;
  let dayOtherHours = 0;
  let selectedMiddleCount = 0;
  let selectedFirstCount = 0;
  let selectedOtherCount = 0;

  studentIds.forEach(sid => {
    const student = studentMap.get(sid);
    const hours = hoursMap[sid] || 1;
    if (student) {
      if (student.group === '중위권') {
        dayMiddleHours = Math.max(dayMiddleHours, hours);
        selectedMiddleCount++;
      } else if (student.group === '1순위') {
        dayFirstHours = Math.max(dayFirstHours, hours);
        selectedFirstCount++;
      } else {
        dayOtherHours = Math.max(dayOtherHours, hours);
        selectedOtherCount++;
      }
    }
  });

  return {
    dayMiddleHours,
    dayFirstHours,
    dayOtherHours,
    totalDayHours: dayMiddleHours + dayFirstHours + dayOtherHours,
    selectedMiddleCount,
    selectedFirstCount,
    selectedOtherCount
  };
}
