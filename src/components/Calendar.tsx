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

  // 누적 지도 시수(시간) 계산
  // 날짜별로 중위권 학생 지도 시간 중 최대 시간(동시간 수업) 및 1순위 학생 지도 시간 중 최대 시간을 일자별 합산
  let middleTeachingHours = 0;
  let firstTeachingHours = 0;

  records.forEach(record => {
    let dayMiddleHours = 0;
    let dayFirstHours = 0;

    record.studentIds.forEach(sid => {
      const student = students.find(s => s.id === sid);
      const hours = record.hours?.[sid] ?? 1;
      if (student) {
        if (student.group === '중위권') {
          dayMiddleHours = Math.max(dayMiddleHours, hours);
        } else if (student.group === '1순위') {
          dayFirstHours = Math.max(dayFirstHours, hours);
        }
      }
    });

    middleTeachingHours += dayMiddleHours;
    firstTeachingHours += dayFirstHours;
  });

  const middleRemaining = Math.max(0, maxHoursMiddle - middleTeachingHours);
  const firstRemaining = Math.max(0, maxHoursFirst - firstTeachingHours);

  // 요일 헤더
  const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  // 달력 그리드를 채울 날짜 배열 생성
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden" id="calendar-container">
      {/* 1. 보라색 상단 헤더 바 */}
      <div className="bg-[#727CF5] px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 text-white">
        <div className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">지도 달력</h1>
            {isSupabaseEnabled ? (
              <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-emerald-400">
                Supabase 연동됨
              </span>
            ) : (
              <span className="bg-amber-400 text-yellow-950 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                로컬 모드
              </span>
            )}
          </div>
          
          <button 
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer sm:hidden"
            title="설정창 열기"
          >
            <Settings size={18} className="text-white" />
          </button>
        </div>

        {/* 월 이동 컨트롤러 */}
        <div className="flex items-center justify-between sm:justify-end space-x-3 bg-white/10 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-xl">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer active:scale-95"
            title="이전 달"
            id="btn-prev-month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-base sm:text-xl font-black min-w-[110px] text-center tracking-tight">
            {year}년 {month + 1}월
          </span>

          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer active:scale-95"
            title="다음 달"
            id="btn-next-month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 2. 요약 카드 행 */}
      <div className="bg-slate-50/80 px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-100 grid grid-cols-2 gap-2 sm:gap-4">
        {/* 중위권 요약 */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00B4D8] shrink-0" />
            <span className="font-black text-slate-800 text-xs sm:text-base">중위권</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
              진행 {middleTeachingHours}차시
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] sm:text-xs text-slate-400 block sm:inline mr-1">남은 차시:</span>
            <span className="font-extrabold text-[#00B4D8] text-sm sm:text-lg">{middleRemaining}차시</span>
            <span className="text-slate-400 text-xs sm:text-base"> / {maxHoursMiddle}차시</span>
          </div>
        </div>

        {/* 1순위 요약 */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF4D6D] shrink-0" />
            <span className="font-black text-slate-800 text-xs sm:text-base">1순위</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
              진행 {firstTeachingHours}차시
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] sm:text-xs text-slate-400 block sm:inline mr-1">남은 차시:</span>
            <span className="font-extrabold text-[#FF4D6D] text-sm sm:text-lg">{firstRemaining}차시</span>
            <span className="text-slate-400 text-xs sm:text-base"> / {maxHoursFirst}차시</span>
          </div>
        </div>
      </div>

      {/* 3. 달력 바디 */}
      <div className="p-2 sm:p-6">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-1.5 sm:mb-3">
          {DAYS_OF_WEEK.map((day, index) => (
            <div
              key={day}
              className={`text-xs sm:text-sm font-black py-1 ${
                index === 0 ? 'text-[#FF4D6D]' : index === 6 ? 'text-[#00B4D8]' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <div key={`blank-${index}`} className="min-h-[64px] sm:aspect-square bg-slate-50/30 rounded-lg sm:rounded-xl border border-dashed border-slate-100" />;
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
                className={`min-h-[72px] sm:min-h-0 sm:aspect-square p-1 sm:p-2 rounded-lg sm:rounded-xl border flex flex-col justify-between items-start text-left transition-all duration-150 relative group cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 sm:ring-3 ring-indigo-500/10 scale-[1.01] sm:scale-[1.02]'
                    : isToday
                    ? 'border-indigo-200 bg-slate-50'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                id={`calendar-day-${dateStr}`}
              >
                {/* 날짜 숫자 & 기록 완료 체크 아이콘 */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[11px] sm:text-sm font-black ${
                      isSelected ? 'text-indigo-600 font-extrabold' : dayColorClass
                    } ${isToday ? 'bg-[#727CF5] text-white w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 flex items-center justify-center rounded-full text-[10px] sm:text-[11px]' : ''}`}
                  >
                    {day}
                  </span>
                  {hasRecord && (
                    <CheckCircle2 size={12} className="text-emerald-500 fill-emerald-50 shrink-0" />
                  )}
                </div>

                {/* 그 날의 지도 학생 요약 */}
                <div className="w-full mt-1 overflow-hidden flex flex-col gap-0.5 sm:gap-1 pointer-events-none">
                  {record && record.studentIds.map(sid => {
                    const s = students.find(x => x.id === sid);
                    if (!s) return null;
                    
                    const hours = record.hours?.[sid] ?? 1;
                    const badgeColor = s.group === '1순위' 
                      ? 'bg-rose-50/90 text-rose-700 border-rose-200' 
                      : s.group === '중위권' 
                      ? 'bg-sky-50/90 text-sky-700 border-sky-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200';

                    // 성을 빼고 이름만 표시 (예: 황혜리 -> 혜리, 전성후 -> 성후, 엄호준 -> 호준, 이솔빛나 -> 솔빛나, 이정 -> 정)
                    const getDisplayName = (fullName: string) => {
                      if (!fullName) return '';
                      const trimmed = fullName.trim();
                      if (trimmed.length > 1) {
                        return trimmed.slice(1);
                      }
                      return trimmed;
                    };

                    const displayName = getDisplayName(s.name);

                    return (
                      <div 
                        key={sid} 
                        className={`text-[10px] sm:text-[12px] px-1 sm:px-1.5 py-0.5 rounded-md border leading-tight font-black text-center whitespace-nowrap overflow-hidden text-ellipsis ${badgeColor}`}
                        title={`${s.name} (${s.group}, ${hours}차시)`}
                      >
                        {/* 성을 뺀 이름만 크고 선명하게 표시 */}
                        <span className="font-black tracking-tight text-slate-800">
                          {displayName}
                        </span>
                      </div>
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
