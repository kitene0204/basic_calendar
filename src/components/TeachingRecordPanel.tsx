import React from 'react';
import { X, CheckCircle, BookOpen } from 'lucide-react';
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
  const currentNotes = record?.notes || {};

  // 학생 선택 토글 함수
  const handleToggleStudent = (studentId: string) => {
    let newStudentIds = [...currentStudentIds];
    let newNotes = { ...currentNotes };

    if (newStudentIds.includes(studentId)) {
      newStudentIds = newStudentIds.filter(id => id !== studentId);
      delete newNotes[studentId]; // 선택 해제 시 메모도 자동 정리 (옵션)
    } else {
      newStudentIds.push(studentId);
      newNotes[studentId] = newNotes[studentId] || ''; // 빈 메모로 초기화
    }

    onSaveRecord({
      id: selectedDate,
      date: selectedDate,
      studentIds: newStudentIds,
      notes: newNotes,
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
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 그룹별 학생 필터
  const middleStudents = students.filter(s => s.group === '중위권');
  const firstStudents = students.filter(s => s.group === '1순위');
  const otherStudents = students.filter(s => s.group === '기타');

  return (
    <div className="bg-white h-full rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden" id="record-panel">
      {/* 패널 헤더 */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {formatDateKorean(selectedDate)}
          </h2>
          <p className="text-xs text-slate-400 mt-1">해당 날짜에 지도한 학생을 선택하세요.</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          title="저장 및 닫기"
          id="btn-close-panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* 패널 본문 (학생 선택 & 지도내용 작성) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* 1. 중위권 학생 */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B4D8]" />
            <h3 className="text-sm font-bold text-[#00B4D8]">중위권</h3>
          </div>
          
          {middleStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 pl-4">등록된 중위권 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {middleStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-sky-50 text-[#00B4D8] border-[#00B4D8] ring-2 ring-sky-100 scale-[1.02]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span>{student.name}</span>
                    {isSelected && <CheckCircle size={14} className="text-[#00B4D8] fill-sky-50" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 1순위 학생 */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D]" />
            <h3 className="text-sm font-bold text-[#FF4D6D]">1순위</h3>
          </div>
          
          {firstStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 pl-4">등록된 1순위 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {firstStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-rose-50 text-[#FF4D6D] border-[#FF4D6D] ring-2 ring-rose-100 scale-[1.02]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span>{student.name}</span>
                    {isSelected && <CheckCircle size={14} className="text-[#FF4D6D] fill-rose-50" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 기타 학생 (있는 경우) */}
        {otherStudents.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="text-sm font-bold text-slate-500">기타 대상 학생</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {otherStudents.map(student => {
                const isSelected = currentStudentIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-3 px-4 rounded-xl font-bold text-center border transition-all duration-150 flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-slate-100 text-slate-700 border-slate-400'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    id={`btn-student-${student.id}`}
                  >
                    <span>{student.name}</span>
                    {isSelected && <CheckCircle size={14} className="text-slate-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 개별 지도 내용 기록 */}
        {currentStudentIds.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center space-x-2">
              <BookOpen size={16} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-700">학생별 지도 내용 기록</h3>
            </div>
            
            <div className="space-y-3">
              {currentStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);
                if (!student) return null;

                const tagColor = student.group === '1순위' 
                  ? 'bg-rose-50 text-[#FF4D6D] border-rose-100' 
                  : student.group === '중위권' 
                  ? 'bg-sky-50 text-[#00B4D8] border-sky-100' 
                  : 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <div key={studentId} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">{student.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tagColor}`}>
                        {student.group}
                      </span>
                    </div>
                    <textarea
                      value={currentNotes[studentId] || ''}
                      onChange={(e) => handleNoteChange(studentId, e.target.value)}
                      placeholder={`${student.name} 학생의 구체적인 지도 내용(활동, 성취도, 특이사항 등)을 기록해 주세요.`}
                      className="w-full h-18 text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans text-slate-600"
                    />
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
          className="w-full py-3.5 bg-[#2E3243] hover:bg-[#1E212E] active:bg-[#151720] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-center"
          id="btn-confirm-panel"
        >
          저장 및 닫기
        </button>
      </div>
    </div>
  );
}
