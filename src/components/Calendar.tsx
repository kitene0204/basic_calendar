import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Settings } from 'lucide-react';
import { Student, TeachingRecord } from '../types';

interface CalendarProps {
  students: Student[];
  records: TeachingRecord[];
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  maxHoursMiddle: number;
  maxHoursFirst: number;
  isSupabaseEnabled: boolean;
  onOpenSettings: () => void;
}

export default function Calendar({
  students,
  records,
  selectedDate,
  onSelectDate,
  maxHoursMiddle,
  maxHoursFirst,
  isSupabaseEnabled,
  onOpenSettings
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // 해당 월의 첫 번째 날의 요일
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // 해당 월의 총 일수
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // 이전 달 버튼
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 다음 달 버튼
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 'YYYY-MM-DD' 형태로 날짜 포맷팅
  const formatDateString = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // 오늘 날짜 문자열
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayString();

  // 특정 날짜의 기록 가져오기
  const getRecordForDate = (dateStr: string) => {
    return records.find(r => r.date === dateStr);
  };

  // 중위권, 1순위 학생 필터
  const middleStudents = students.filter(s => s.group === '중위권');
  const firstStudents = students.filter(s => s.group === '1순위');

  // 누적 지도 횟수 계산 (하루에 같은 그룹 여러 명을 지도하더라도 해당 일자는 1회로 산출)
  let middleTeachingCount = 0;
  let firstTeachingCount = 0;

  records.forEach(record => {
    let hasMiddle = false;
    let hasFirst = false;
    record.studentIds.forEach(sid => {
      const student = students.find(s => s.id === sid);
      if (student) {
        if (student.group === '중위권') {
          hasMiddle = true;
        } else if (student.group === '1순위') {
          hasFirst = true;
        }
      }
    });
    if (hasMiddle) middleTeachingCount++;
    if (hasFirst) firstTeachingCount++;
  });

  const middleRemaining = Math.max(0, maxHoursMiddle - middleTeachingCount);
  const firstRemaining = Math.max(0, maxHoursFirst - firstTeachingCount);

  // 요일 헤더
  const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  // 달력 그리드를 채울 날짜 배열 생성
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden" id="calendar-container">
      {/* 1. 보라색 상단 헤더 바 */}
      <div className="bg-[#727CF5] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">기초학력 지도 달력</h1>
          {isSupabaseEnabled ? (
            <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-400 animate-pulse">
              클라우드 저장 (Supabase)
            </span>
          ) : (
            <span className="bg-amber-400 text-yellow-950 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
              로컬 저장 모드 (기기에만 저장됨)
            </span>
          )}
          
          <button 
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="설정창 열기"
            id="btn-settings"
          >
            <Settings size={20} className="text-white" />
          </button>
        </div>

        {/* 월 이동 컨트롤러 */}
        <div className="flex items-center justify-end space-x-4">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="이전 달"
            id="btn-prev-month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-lg sm:text-xl font-bold min-w-[120px] text-center">
            {year}년 {month + 1}월
          </span>

          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="다음 달"
            id="btn-next-month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 2. 요약 카드 행 */}
      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 중위권 요약 */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#00B4D8]" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">중위권</span>
            <span className="text-xs text-slate-400">지도 {middleTeachingCount}회</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block sm:inline mr-2">남은 시수:</span>
            <span className="font-extrabold text-[#00B4D8] text-base sm:text-lg">{middleRemaining}</span>
            <span className="text-slate-400 text-sm sm:text-base"> / {maxHoursMiddle}</span>
          </div>
        </div>

        {/* 1순위 요약 */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#FF4D6D]" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">1순위</span>
            <span className="text-xs text-slate-400">지도 {firstTeachingCount}회</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block sm:inline mr-2">남은 시수:</span>
            <span className="font-extrabold text-[#FF4D6D] text-base sm:text-lg">{firstRemaining}</span>
            <span className="text-slate-400 text-sm sm:text-base"> / {maxHoursFirst}</span>
          </div>
        </div>
      </div>

      {/* 3. 달력 바디 */}
      <div className="p-6">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-2 text-center mb-3">
          {DAYS_OF_WEEK.map((day, index) => (
            <div
              key={day}
              className={`text-sm font-bold py-1.5 ${
                index === 0 ? 'text-[#FF4D6D]' : index === 6 ? 'text-[#00B4D8]' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <div key={`blank-${index}`} className="aspect-square bg-slate-50/30 rounded-xl border border-dashed border-slate-100" />;
            }

            const dateStr = formatDateString(day);
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;
            const record = getRecordForDate(dateStr);
            const hasRecord = record && record.studentIds.length > 0;

            const dayOfWeek = index % 7;
            let dayColorClass = 'text-slate-700';
            if (dayOfWeek === 0) dayColorClass = 'text-[#FF4D6D]';
            if (dayOfWeek === 6) dayColorClass = 'text-[#00B4D8]';

            return (
              <button
                key={`day-${day}`}
                onClick={() => onSelectDate(dateStr)}
                className={`aspect-square p-2 rounded-xl border flex flex-col justify-between items-start text-left transition-all duration-150 relative group ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-3 ring-indigo-500/10 scale-[1.02]'
                    : isToday
                    ? 'border-indigo-200 bg-slate-50'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                id={`calendar-day-${dateStr}`}
              >
                {/* 날짜 숫자 & 기록 완료 체크 아이콘 */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isSelected ? 'text-indigo-600 font-extrabold' : dayColorClass
                    } ${isToday ? 'bg-[#727CF5] text-white w-5.5 h-5.5 flex items-center justify-center rounded-full text-[11px]' : ''}`}
                  >
                    {day}
                  </span>
                  {hasRecord && (
                    <CheckCircle2 size={13} className="text-emerald-500 fill-emerald-50" />
                  )}
                </div>

                {/* 그 날의 지도 학생 요약 */}
                <div className="w-full mt-1.5 overflow-hidden flex flex-col gap-0.5 pointer-events-none">
                  {record && record.studentIds.map(sid => {
                    const s = students.find(x => x.id === sid);
                    if (!s) return null;
                    
                    const badgeColor = s.group === '1순위' 
                      ? 'bg-rose-50 text-[#FF4D6D] border-rose-100' 
                      : s.group === '중위권' 
                      ? 'bg-sky-50 text-[#00B4D8] border-sky-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-100';

                    return (
                      <span 
                        key={sid} 
                        className={`text-[11px] sm:text-[12.5px] px-1.5 py-0.5 rounded border leading-none truncate font-extrabold ${badgeColor}`}
                      >
                        {s.name}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
