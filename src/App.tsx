import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  Settings, 
  RefreshCw, 
  Database,
  Users,
  CheckCircle2,
  HelpCircle,
  CloudLightning,
  Share2
} from 'lucide-react';
import { Student, TeachingRecord } from './types';
import { 
  fetchStudents, 
  saveStudents, 
  deleteStudentFromDb,
  fetchRecords, 
  saveRecord, 
  fetchMaxHours, 
  saveMaxHours,
  getSupabaseCredentials,
  resetSupabaseClient,
  checkAndApplySyncUrl,
  generateSyncUrl,
  getLocalStudents,
  getLocalRecords,
  getLocalMaxHours,
  subscribeToRealtimeChanges
} from './lib/supabase';
import Calendar from './components/Calendar';
import TeachingRecordPanel from './components/TeachingRecordPanel';
import SettingsPanel from './components/SettingsPanel';
import Dashboard from './components/Dashboard';
import SyncModal from './components/SyncModal';

export default function App() {
  // 1. 핵심 데이터 상태 (로컬 캐시에서 0ms 즉시 초기화)
  const [students, setStudents] = useState<Student[]>(() => getLocalStudents());
  const [records, setRecords] = useState<TeachingRecord[]>(() => getLocalRecords());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [maxHoursMiddle, setMaxHoursMiddle] = useState<number>(() => getLocalMaxHours('중위권'));
  const [maxHoursFirst, setMaxHoursFirst] = useState<number>(() => getLocalMaxHours('1순위'));

  // 2. UI 상태 관리
  const [activeTab, setActiveTab] = useState<'calendar' | 'dashboard'>('calendar');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState<boolean>(() => getSupabaseCredentials().isValid);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // 오늘 날짜 기본 지정 (YYYY-MM-DD)
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // 전체 데이터 초고속 병렬 로드 함수 (Promise.all)
  const loadAllData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const [fetchedStudents, fetchedRecords, hoursMiddle, hoursFirst] = await Promise.all([
        fetchStudents(),
        fetchRecords(),
        fetchMaxHours('중위권'),
        fetchMaxHours('1순위')
      ]);

      setStudents(fetchedStudents);
      setRecords(fetchedRecords);
      setMaxHoursMiddle(hoursMiddle);
      setMaxHoursFirst(hoursFirst);

      const creds = getSupabaseCredentials();
      setIsSupabaseEnabled(creds.isValid);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // 초기 로드 시 동기화 토큰 확인 및 데이터 로드 + 실시간 WebSocket 구독 + 창 포커스 시 자동 갱신
  useEffect(() => {
    const result = checkAndApplySyncUrl();
    if (result.applied) {
      setSyncNotice(result.message || '🎉 노트북의 최신 데이터가 성공적으로 동기화되었습니다!');
      // 즉시 로컬 캐시에서 상태 리로드
      setStudents(getLocalStudents());
      setRecords(getLocalRecords());
      setMaxHoursMiddle(getLocalMaxHours('중위권'));
      setMaxHoursFirst(getLocalMaxHours('1순위'));
      setTimeout(() => setSyncNotice(null), 6000);
    }

    const creds = getSupabaseCredentials();
    setIsSupabaseEnabled(creds.isValid);
    loadAllData(false);

    // Supabase 실시간 WebSocket 구독 (다른 PC/기기 변경 시 0.1초 즉각 반영)
    const unsubscribeRealtime = subscribeToRealtimeChanges(() => {
      loadAllData(true);
    });

    // 다른 브라우저/기기에서 작업 후 돌아왔을 때 자동 동기화
    const handleFocus = () => {
      loadAllData(true);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadAllData(true);
      }
    });

    return () => {
      unsubscribeRealtime();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 3. 학생 데이터 조작 관련 핸들러들
  const handleAddStudent = async (name: string, group: '중위권' | '1순위' | '기타') => {
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name,
      group,
      createdAt: new Date().toISOString()
    };
    
    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);
    await saveStudents(updatedStudents);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('정말 이 학생을 명단에서 삭제하시겠습니까? 관련 지도 이력은 달력에 유지되나 이름이 표시되지 않을 수 있습니다.')) return;
    
    const updatedStudents = students.filter(s => s.id !== studentId);
    setStudents(updatedStudents);
    await deleteStudentFromDb(studentId);
    await saveStudents(updatedStudents);
  };

  const handleSaveMaxHours = async (group: '중위권' | '1순위', hours: number) => {
    if (group === '중위권') {
      setMaxHoursMiddle(hours);
    } else {
      setMaxHoursFirst(hours);
    }
    await saveMaxHours(group, hours);
  };

  const handleSupabaseConfigChange = () => {
    resetSupabaseClient();
    const creds = getSupabaseCredentials();
    setIsSupabaseEnabled(creds.isValid);
    loadAllData();
  };

  // 4. 지도 기록 조작 관련 핸들러
  const handleSaveRecord = async (updatedRecord: TeachingRecord) => {
    // 1. 낙관적 로컬 상태 반영
    const filteredRecords = records.filter(r => r.date !== updatedRecord.date);
    
    // 선택된 학생이 0명이고 메모 내용도 아예 없는 경우 해당 날짜 기록 비우기 가능
    const hasAnyStudents = updatedRecord.studentIds.length > 0;
    const hasAnyNotes = Object.values(updatedRecord.notes).some(note => note.trim().length > 0);
    
    if (hasAnyStudents || hasAnyNotes) {
      filteredRecords.push(updatedRecord);
    }
    setRecords(filteredRecords);

    // 2. DB 및 스토리지 동기화
    await saveRecord(updatedRecord);
  };

  // 현재 선택된 날짜의 지도 기록 찾기
  const currentDayRecord = records.find(r => r.date === selectedDate);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800" id="app-wrapper">
      
      {/* 글로벌 상단 내비게이션 바 */}
      <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 shadow-xs z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <CalendarIcon size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">학급 기초학력 지도 달력</h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Elementary Growth Calendar</p>
          </div>
        </div>

        {/* 탭 컨트롤러 & 클라우드 상태 */}
        <div className="flex items-center space-x-3">
          
          {/* 기기 간 동기화 센터 오픈 버튼 */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-[#727CF5] to-[#5C66E4] hover:from-[#5C66E4] hover:to-[#4A53D4] text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer animate-pulse-subtle"
            title="다른 브라우저 / 기기 즉시 동기화"
            id="btn-open-sync-hub"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">기기 간 데이터 동기화</span>
            <span className="sm:hidden">동기화</span>
          </button>

          {/* 수동 동기화/새로고침 버튼 */}
          <button
            onClick={() => loadAllData(false)}
            disabled={isSyncing}
            className="p-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 rounded-xl border border-slate-100 transition-colors cursor-pointer"
            title="실시간 새로고침 및 수동 동기화"
            id="btn-sync-trigger"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin text-[#727CF5]' : ''} />
          </button>

          {/* 탭 스위처 */}
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200/30">
            <button
              onClick={() => {
                setActiveTab('calendar');
                setIsSettingsOpen(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon size={13} />
              <span>지도 달력</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSettingsOpen(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard size={13} />
              <span>종합 대시보드</span>
            </button>
          </div>

          {/* 설정 열기 버튼 */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-[#727CF5] border-[#727CF5] text-white' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
            }`}
            title="설정 및 학생 명단 관리"
            id="btn-global-settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* 동기화 성공 알림 바 */}
      {syncNotice && (
        <div className="bg-emerald-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold shadow-md animate-fade-in z-20">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-white/80 hover:text-white cursor-pointer font-extrabold">
            ✕
          </button>
        </div>
      )}

      {/* 실시간 백업 보증용 고수준 안내창 */}
      {!isSupabaseEnabled && !syncNotice && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CloudLightning size={14} className="text-[#727CF5]" />
            <p className="text-[11px] text-indigo-950 font-bold leading-none">
              다른 PC/스마트폰과 데이터를 일치시키려면 상단 <b>[기기 간 데이터 동기화]</b> 버튼을 눌러 링크를 복사하세요!
            </p>
          </div>
          <button 
            onClick={() => setIsSyncModalOpen(true)}
            className="text-[10px] text-[#727CF5] font-black hover:underline leading-none cursor-pointer"
          >
            동기화 링크 복사 &rarr;
          </button>
        </div>
      )}

      {/* 메인 뷰포트 레이아웃 */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 중앙 워크스페이스 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto h-full">
            {activeTab === 'calendar' ? (
              <div className="w-full space-y-4">
                <Calendar
                  students={students}
                  records={records}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setIsRecordModalOpen(true);
                  }}
                  maxHoursMiddle={maxHoursMiddle}
                  maxHoursFirst={maxHoursFirst}
                  isSupabaseEnabled={isSupabaseEnabled}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            ) : (
              // 종합 대시보드 뷰
              <Dashboard
                students={students}
                records={records}
                maxHoursMiddle={maxHoursMiddle}
                maxHoursFirst={maxHoursFirst}
              />
            )}
          </div>
        </div>

        {/* 우측 슬라이드 설정창 오버레이 패널 */}
        {isSettingsOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white border-l border-slate-200 z-30 shadow-2xl animate-fade-in flex flex-col h-full">
            <SettingsPanel
              students={students}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              maxHoursMiddle={maxHoursMiddle}
              maxHoursFirst={maxHoursFirst}
              onSaveMaxHours={handleSaveMaxHours}
              onClose={() => setIsSettingsOpen(false)}
              onSupabaseConfigChange={handleSupabaseConfigChange}
            />
          </div>
        )}

        {/* 기기 간 동기화 센터 모달 */}
        <SyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onDataImported={() => {
            setStudents(getLocalStudents());
            setRecords(getLocalRecords());
            setMaxHoursMiddle(getLocalMaxHours('중위권'));
            setMaxHoursFirst(getLocalMaxHours('1순위'));
            loadAllData(true);
          }}
          onOpenSettings={() => {
            setIsSyncModalOpen(false);
            setIsSettingsOpen(true);
          }}
          studentsCount={students.length}
          recordsCount={records.length}
        />

        {/* 중앙 지도 기록 모달 팝업 */}
        {isRecordModalOpen && selectedDate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="record-modal-backdrop">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in" id="record-modal-content">
              <TeachingRecordPanel
                selectedDate={selectedDate}
                students={students}
                record={currentDayRecord}
                onSaveRecord={handleSaveRecord}
                onClose={() => setIsRecordModalOpen(false)}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
