import React from 'react';
import { X, CheckCircle, BookOpen, Clock, Plus, Minus } from 'lucide-react';
import { Student, TeachingRecord } from '../types';

interface TeachingRecordPanelProps {
  selectedDate: string; // 'YYYY-MM-DD'
  students: Student[];
  record: TeachingRecord | undefined;
  onSaveRecord: (record: TeachingRecord) => void;
  onClose: () => void;
}

export default function TeachingRecordPanel({
  selectedDate,
  students,
  record,
  onSaveRecord,
  onClose,
}: TeachingRecordPanelProps) {
  // 날짜 한글 포맷팅 (예: 2026년 06월 02일)
  const formatDateKorean = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${month}월 ${day}일`;
  };

  const currentStudentIds = record?.studentIds || [];
  const currentHours = record?.hours || {};
  const currentNotes = record?.notes || {};

  // 학생 선택 토글 함수
  const handleToggleStudent = (studentId: string) => {
    let newStudentIds = [...currentStudentIds];
    let newHours = { ...currentHours };
    let newNotes = { ...currentNotes };

    if (newStudentIds.includes(studentId)) {
      newStudentIds = newStudentIds.filter(id => id !== studentId);
      delete newHours[studentId];
      delete newNotes[studentId]; // 선택 해제 시 메모 정리
    } else {
      newStudentIds.push(studentId);
      newHours[studentId] = newHours[studentId] || 1; // 기본 1시간(1차시) 설정
      newNotes[studentId] = newNotes[studentId] || ''; // 빈 메모로 초기화
    }

    onSaveRecord({
      id: selectedDate,
      date: selectedDate,
      studentIds: newStudentIds,
      hours: newHours,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 개별 학생 지도 시수(시간) 변경 함수
  const handleHoursChange = (studentId: string, hours: number) => {
    const validHours = Math.max(1, Math.min(24, Math.round(hours) || 1));
    const newHours = {
      ...currentHours,
      [studentId]: validHours,
    };

    onSaveRecord({
      id: selectedDate,
      date: selectedDate,
      studentIds: currentStudentIds,
      hours: newHours,
      notes: currentNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 선택된 모든 학생 일괄 시수 적용 함수 (방학 집중 4시간 수업 등에 매우 유용)
  const handleBulkHoursChange = (hours: number) => {
    const validHours = Math.max(1, Math.min(24, Math.round(hours) || 1));
    const newHours = { ...currentHours };
    currentStudentIds.forEach(id => {
      newHours[id] = validHours;
    });

    onSaveRecord({
      id: selectedDate,
      date: selectedDate,
      studentIds: currentStudentIds,
      hours: newHours,
      notes: currentNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 학생별 개별 지도 내용 업데이트 함수
  const handleNoteChange = (studentId: string, noteText: string) => {
    const newNotes = {
      ...currentNotes,
      [studentId]: noteText,
    };

    onSaveRecord({
      id: selectedDate,
      date: selectedDate,
      studentIds: currentStudentIds,
      hours: currentHours,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 그룹별 학생 필터
  const middleStudents = students.filter(s => s.group === '중위권');
  const firstStudents = students.filter(s => s.group === '1순위');
  const otherStudents = students.filter(s => s.group === '기타');

  // 오늘 지도 총 시수 계산
  const totalDayHours = currentStudentIds.reduce((sum, id) => sum + (currentHours[id] || 1), 0);

  return (
    <div className="bg-white h-full rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]" id="record-panel">
      {/* 패널 헤더 */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
              {formatDateKorean(selectedDate)}
            </h2>
            {currentStudentIds.length > 0 && (
              <span className="bg-indigo-50 text-[#727CF5] font-black text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center space-x-1">
                <Clock size={11} className="stroke-[2.5]" />
                <span>총 {currentStudentIds.length}명 · {totalDayHours}시간</span>
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">지도한 학생과 수업 시수를 선택하세요.</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
          title="저장 및 닫기"
          id="btn-close-panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* 패널 본문 (학생 선택 & 시수 설정 & 지도내용 작성) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* 일괄 시수 변경 툴바 (학생이 1명 이상 선택되었을 때 노출) */}
        {currentStudentIds.length > 0 && (
          <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-1.5">
              <Clock size={15} className="text-[#727CF5] shrink-0" />
              <span className="text-xs font-black text-indigo-950">선택 학생 운영 차시 일괄 지정:</span>
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleBulkHoursChange(h)}
                  className="px-2.5 py-1 text-xs font-black rounded-lg bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {h}차시
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. 중위권 학생 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B4D8]" />
              <h3 className="text-sm font-bold text-[#00B4D8]">중위권</h3>
            </div>
            <span className="text-[11px] text-slate-400">클릭하여 선택/해제</span>
          </div>
          
          {middleStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 pl-4">등록된 중위권 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {middleStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                const hours = currentHours[student.id] || 1;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-between space-x-2 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 text-[#00B4D8] border-[#00B4D8] ring-2 ring-sky-100 scale-[1.01]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span className="text-sm font-extrabold truncate">{student.name}</span>
                    {isSelected ? (
                      <span className="inline-flex items-center space-x-1 bg-[#00B4D8] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                        <span>{hours}차시</span>
                        <CheckCircle size={12} className="stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-normal">미선택</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 1순위 학생 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D]" />
              <h3 className="text-sm font-bold text-[#FF4D6D]">1순위</h3>
            </div>
            <span className="text-[11px] text-slate-400">클릭하여 선택/해제</span>
          </div>
          
          {firstStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 pl-4">등록된 1순위 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {firstStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                const hours = currentHours[student.id] || 1;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-between space-x-2 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 text-[#FF4D6D] border-[#FF4D6D] ring-2 ring-rose-100 scale-[1.01]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span className="text-sm font-extrabold truncate">{student.name}</span>
                    {isSelected ? (
                      <span className="inline-flex items-center space-x-1 bg-[#FF4D6D] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                        <span>{hours}차시</span>
                        <CheckCircle size={12} className="stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-normal">미선택</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 기타 학생 (있는 경우) */}
        {otherStudents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="text-sm font-bold text-slate-500">기타 대상 학생</h3>
              </div>
              <span className="text-[11px] text-slate-400">클릭하여 선택/해제</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {otherStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                const hours = currentHours[student.id] || 1;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-between space-x-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-700 border-slate-400 scale-[1.01]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span className="text-sm font-extrabold truncate">{student.name}</span>
                    {isSelected ? (
                      <span className="inline-flex items-center space-x-1 bg-slate-700 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                        <span>{hours}시간</span>
                        <CheckCircle size={12} />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-normal">미선택</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 개별 지도 내용 및 수업 시수 조절 */}
        {currentStudentIds.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-700">학생별 수업 시수(시간) 및 지도 내용</h3>
              </div>
              <span className="text-[11px] text-slate-400">각 학생별 시간 조정 가능</span>
            </div>
            
            <div className="space-y-3.5">
              {currentStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);
                if (!student) return null;

                const studentHours = currentHours[studentId] || 1;
                const tagColor = student.group === '1순위' 
                  ? 'bg-rose-50 text-[#FF4D6D] border-rose-100' 
                  : student.group === '중위권' 
                  ? 'bg-sky-50 text-[#00B4D8] border-sky-100' 
                  : 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <div key={studentId} className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                    
                    {/* 학생 이름 & 시수 조절 컨트롤러 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{student.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagColor}`}>
                          {student.group}
                        </span>
                      </div>

                      {/* 시수(시간) 증감 및 퀵 선택 컨트롤 */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-500">지도 시수:</span>
                        
                        {/* - 버튼 */}
                        <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleHoursChange(studentId, studentHours - 1)}
                            disabled={studentHours <= 1}
                            className="p-1 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-600 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="1시간 감소"
                          >
                            <Minus size={13} />
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={studentHours}
                            onChange={(e) => handleHoursChange(studentId, parseInt(e.target.value, 10) || 1)}
                            className="w-10 text-center text-xs font-black text-slate-900 focus:outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-500 pr-1.5">시간</span>

                          {/* + 버튼 */}
                          <button
                            type="button"
                            onClick={() => handleHoursChange(studentId, studentHours + 1)}
                            className="p-1 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                            title="1시간 증가"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* 퀵 프리셋 버튼 */}
                        <div className="hidden sm:flex space-x-1">
                          {[1, 2, 3, 4].map(h => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => handleHoursChange(studentId, h)}
                              className={`px-2 py-1 text-[10px] font-extrabold rounded-md border transition-all cursor-pointer ${
                                studentHours === h
                                  ? 'bg-[#727CF5] text-white border-[#727CF5] shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {h}h
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 지도 내용 텍스트에어리어 */}
                    <div>
                      <textarea
                        value={currentNotes[studentId] || ''}
                        onChange={(e) => handleNoteChange(studentId, e.target.value)}
                        placeholder={`${student.name} 학생의 구체적인 지도 내용(활동, 성취도, 특이사항 등)을 기록해 주세요.`}
                        className="w-full h-18 text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans text-slate-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 패널 하단 고정 닫기 버튼 */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-[#2E3243] hover:bg-[#1E212E] active:bg-[#151720] text-white font-black rounded-xl transition-all shadow-md hover:shadow-lg text-center cursor-pointer flex items-center justify-center space-x-2"
          id="btn-confirm-panel"
        >
          <span>저장 및 완료</span>
          {currentStudentIds.length > 0 && (
            <span className="text-xs text-slate-300 font-medium">({totalDayHours}시간 수업 기록됨)</span>
          )}
        </button>
      </div>
    </div>
  );
}
