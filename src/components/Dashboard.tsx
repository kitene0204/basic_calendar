import React, { useState } from 'react';
import { Calendar, BookOpen, Users, Award, Search, ArrowRight, TrendingUp, Filter } from 'lucide-react';
import { Student, TeachingRecord } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface DashboardProps {
  students: Student[];
  records: TeachingRecord[];
  maxHoursMiddle: number;
  maxHoursFirst: number;
}

export default function Dashboard({
  students,
  records,
  maxHoursMiddle,
  maxHoursFirst
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'전체' | '중위권' | '1순위' | '기타'>('전체');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 1. 학생별 누적 지도 통계 계산 (차시/시간 합산)
  const studentStats = students.map(student => {
    // 해당 학생이 포함된 기록 수 및 누적 시수(시간) 계산
    const tutoredRecords = records.filter(r => r.studentIds.includes(student.id))
      .sort((a, b) => b.date.localeCompare(a.date)); // 최근 순 정렬

    const count = tutoredRecords.length;
    const totalHours = tutoredRecords.reduce((sum, r) => sum + (r.hours?.[student.id] ?? 1), 0);
    const maxLimit = student.group === '중위권' ? maxHoursMiddle : student.group === '1순위' ? maxHoursFirst : 10;
    const progress = Math.min(100, Math.round((totalHours / maxLimit) * 100));

    return {
      ...student,
      count,
      totalHours,
      maxLimit,
      progress,
      history: tutoredRecords.map(r => ({
        date: r.date,
        hours: r.hours?.[student.id] ?? 1,
        note: r.notes[student.id] || '지도 기록 내용이 없습니다.'
      }))
    };
  });

  // 2. 전체 통계 요약
  const totalStudents = students.length;
  const totalMiddleStudents = students.filter(s => s.group === '중위권').length;
  const totalFirstStudents = students.filter(s => s.group === '1순위').length;
  
  // 총 누적 지도 시수 (모든 학생이 이수한 총 수업 시간의 합)
  const totalTeachingHours = records.reduce((sum, r) => {
    return sum + r.studentIds.reduce((subSum, sid) => subSum + (r.hours?.[sid] ?? 1), 0);
  }, 0);

  // 3. 필터링된 학생 리스트
  const filteredStudents = studentStats.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroupFilter === '전체' ? true : s.group === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  // 4. Recharts용 데이터 구성 (차트용: 학생 이름별 누적 지도 시수)
  const chartData = studentStats.map(s => ({
    name: s.name,
    지도시간: s.totalHours,
    그룹: s.group
  }));

  // 현재 세부 기록을 볼 선택된 학생
  const currentSelectedStudent = studentStats.find(s => s.id === selectedStudentId) || (filteredStudents.length > 0 ? filteredStudents[0] : null);

  return (
    <div className="space-y-6" id="dashboard-container">
      
      {/* 1. 핵심 성과 카드 (KPI Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 등록 학생 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">총 관리 학생</span>
            <span className="text-xl font-black text-slate-800">{totalStudents}명</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">중위권 {totalMiddleStudents} / 1순위 {totalFirstStudents}</span>
          </div>
        </div>

        {/* 누적 지도 차시 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">누적 지도 차시</span>
            <span className="text-xl font-black text-slate-800">{totalTeachingHours}차시</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">총 {records.length}일간 진행됨</span>
          </div>
        </div>

        {/* 중위권 지도율 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-[#00B4D8]/10 text-[#00B4D8] rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">중위권 평균 진도율</span>
            <span className="text-xl font-black text-slate-800">
              {totalMiddleStudents > 0 
                ? Math.round(studentStats.filter(s => s.group === '중위권').reduce((acc, cur) => acc + cur.progress, 0) / totalMiddleStudents) 
                : 0}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">목표 {maxHoursMiddle}차시 기준</span>
          </div>
        </div>

        {/* 1순위 지도율 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-[#FF4D6D]/10 text-[#FF4D6D] rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">1순위 평균 진도율</span>
            <span className="text-xl font-black text-slate-800">
              {totalFirstStudents > 0 
                ? Math.round(studentStats.filter(s => s.group === '1순위').reduce((acc, cur) => acc + cur.progress, 0) / totalFirstStudents) 
                : 0}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">목표 {maxHoursFirst}차시 기준</span>
          </div>
        </div>
      </div>

      {/* 2. 누적 지도 데이터 시각화 차트 */}
      {students.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center space-x-1.5">
            <TrendingUp size={16} className="text-[#727CF5]" />
            <span>학생별 누적 운영 차시 비교</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} unit="차시" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#FFF' }}
                  labelStyle={{ fontWeight: 'bold' }}
                  formatter={(val: any) => [`${val}차시`, '누적 차시']}
                />
                <Bar dataKey="지도시간" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const barColor = entry.그룹 === '1순위' 
                      ? '#FF4D6D' 
                      : entry.그룹 === '중위권' 
                      ? '#00B4D8' 
                      : '#94A3B8';
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. 메인 상세 레이아웃 (필터 검색 + 학생 목록 & 아코디언 상세 보기) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 학생 목록 사이드바 (5/12 cols) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
              <Users size={16} className="text-[#727CF5]" />
              <span>지도 대상 리스트</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
              총 {filteredStudents.length}명
            </span>
          </div>

          {/* 검색 및 필터 컨트롤러 */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl pl-9.5 pr-4 py-2.5 text-slate-700 font-medium"
              />
            </div>

            <div className="flex space-x-1">
              {(['전체', '중위권', '1순위', '기타'] as const).map(f => {
                const isAct = selectedGroupFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedGroupFilter(f)}
                    className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isAct 
                        ? 'bg-[#727CF5] text-white border-[#727CF5] shadow-xs' 
                        : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 학생 통계 리스트 */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[400px] pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">해당 조건의 학생이 없습니다.</p>
            ) : (
              filteredStudents.map(student => {
                const isSel = currentSelectedStudent?.id === student.id;
                const dotColor = student.group === '1순위' 
                  ? 'bg-[#FF4D6D]' 
                  : student.group === '중위권' 
                  ? 'bg-[#00B4D8]' 
                  : 'bg-slate-400';

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all group cursor-pointer ${
                      isSel 
                        ? 'border-[#727CF5] bg-indigo-50/20 shadow-xs ring-1 ring-[#727CF5]/20' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 mr-3">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className="font-extrabold text-slate-800 text-sm">{student.name}</span>
                        <span className="text-[9px] text-slate-400 font-medium">({student.group})</span>
                      </div>
                      
                      {/* 프로그레스 바 */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>시수 달성</span>
                          <span className="font-bold text-slate-700">{student.totalHours} / {student.maxLimit}시간 ({student.progress}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              student.group === '1순위' ? 'bg-[#FF4D6D]' : student.group === '중위권' ? 'bg-[#00B4D8]' : 'bg-slate-400'
                            }`}
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <ArrowRight 
                      size={14} 
                      className={`text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 ${isSel ? 'text-[#727CF5] translate-x-1' : ''}`} 
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 학생별 지도 상세 피드 / 메모 타임라인 (7/12 cols) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-7 flex flex-col space-y-4">
          {currentSelectedStudent ? (
            <>
              {/* 상단 프로필 요약 */}
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-black text-slate-800">{currentSelectedStudent.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                      currentSelectedStudent.group === '1순위' 
                        ? 'bg-rose-50 text-[#FF4D6D] border-rose-100' 
                        : currentSelectedStudent.group === '중위권' 
                        ? 'bg-sky-50 text-[#00B4D8] border-sky-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {currentSelectedStudent.group}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">개별 지도 히스토리 및 대기 메모</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-semibold">총 지도 시수</span>
                  <span className="text-lg font-black text-indigo-600 font-sans">
                    {currentSelectedStudent.totalHours}시간
                    <span className="text-xs text-slate-400 font-normal ml-1">({currentSelectedStudent.count}일)</span>
                  </span>
                </div>
              </div>

              {/* 히스토리 피드 */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[420px]">
                <h4 className="text-xs font-bold text-slate-500 flex items-center space-x-1 mb-2">
                  <BookOpen size={14} />
                  <span>지도 내용 기록 타임라인</span>
                </h4>

                {currentSelectedStudent.history.length === 0 ? (
                  <div className="py-14 text-center">
                    <p className="text-xs text-slate-400 italic">아직 기록된 지도 내용이 없습니다.</p>
                    <p className="text-[10px] text-slate-400 mt-1">달력에서 날짜를 누르고 학생을 체크하면 실시간으로 여기에 누적됩니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative pl-4 border-l-2 border-indigo-50/60 ml-2">
                    {currentSelectedStudent.history.map((h, idx) => {
                      const [year, month, day] = h.date.split('-');
                      return (
                        <div key={idx} className="relative space-y-1.5">
                          {/* 타임라인 원형 포인트 */}
                          <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#727CF5] ring-4 ring-white" />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#727CF5] font-sans">
                              {year}년 {month}월 {day}일
                            </span>
                            <span className="text-[10px] font-black bg-indigo-50 text-[#727CF5] px-2 py-0.5 rounded-md border border-indigo-100">
                              {h.hours}시간(차시) 지도
                            </span>
                          </div>
                          
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                              {h.note}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-400 text-sm italic">
              대상을 선택하여 지도 히스토리를 확인하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
