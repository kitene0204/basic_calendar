import React, { useState, useEffect, useRef } from 'react';
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
  syncAllToCloud,
  subscribeToRealtimeChanges
} from './lib/supabase';
import {
  fetchServerData,
  saveRecordToServer,
  saveStudentsToServer,
  saveSettingsToServer,
  syncLocalToServer,
  subscribeToServerRealtime
} from './lib/serverSync';
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

  // 전체 데이터 초고속 병렬 로드 함수 (중앙 서버 최우선 + 로컬 fallback)
  const loadAllData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      // 1. 서버 중앙 실시간 저장소 조회 (스마트폰 & 학교 컴퓨터 100% 동일 동기화)
      const serverData = await fetchServerData();
      if (serverData && serverData.records && serverData.records.length > 0) {
        setStudents(serverData.students);
        setRecords(prevRecords => {
          if (isRecordModalOpen && selectedDate) {
            const currentEditing = prevRecords.find(r => r.date === selectedDate);
            if (currentEditing) {
              return serverData.records.map(r => r.date === selectedDate ? currentEditing : r);
            }
          }
          return serverData.records;
        });
        setMaxHoursMiddle(serverData.maxHoursMiddle);
        setMaxHoursFirst(serverData.maxHoursFirst);
        return;
      }

      // 2. 서버 연결 지연 시 Supabase / 로컬 스토리지 Fallback
      const [fetchedStudents, fetchedRecords, hoursMiddle, hoursFirst] = await Promise.all([
        fetchStudents(),
        fetchRecords(),
        fetchMaxHours('중위권'),
        fetchMaxHours('1순위')
      ]);

      setStudents(fetchedStudents);
      setRecords(prevRecords => {
        if (isRecordModalOpen && selectedDate) {
          const currentEditing = prevRecords.find(r => r.date === selectedDate);
          if (currentEditing) {
            return fetchedRecords.map(r => r.date === selectedDate ? currentEditing : r);
          }
        }
        return fetchedRecords;
      });
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

  // 초기 로드 시 실시간 서버 구독 + Supabase 구독 + 창 포커스 시 자동 갱신
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setIsSupabaseEnabled(creds.isValid);
    loadAllData(false);

    // 학교 컴퓨터 로컬스토리지에 있는 데이터를 서버와 즉시 일치시킴
    const localRecs = getLocalRecords();
    if (localRecs.length > 0) {
      syncLocalToServer(
        getLocalStudents(),
        localRecs,
        getLocalMaxHours('중위권'),
        getLocalMaxHours('1순위')
      ).then(res => {
        if (res) {
          setStudents(res.students);
          setRecords(res.records);
        }
      });
    }

    // 1. 실시간 서버 SSE 구독 (스마트폰 & 학교 컴퓨터 간 0.5초 즉시 동기화)
    const unsubscribeServer = subscribeToServerRealtime(() => {
      loadAllData(true);
    });

    // 2. Supabase 실시간 WebSocket 구독
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
      unsubscribeServer();
      unsubscribeRealtime();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 3. 학생 데이터 조작 관련 핸들러들
  const handleAddStudent = async (name: string, group: '중위권' | '1순위' | '기타') => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (students.some(s => s.name.trim() === trimmed)) {
      alert(`이미 등록되어 있는 학생 이름입니다: "${trimmed}"\n중복 등록을 방지하기 위해 추가되지 않았습니다.`);
      return;
    }

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name: trimmed,
      group,
      createdAt: new Date().toISOString()
    };
    
    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);
    saveStudentsToServer(updatedStudents);
    await saveStudents(updatedStudents);
  };

  const handleDeleteStudent = async (studentId: string) => {
    const studentToDelete = students.find(s => s.id === studentId);
    const studentName = studentToDelete ? studentToDelete.name : '해당 학생';
    if (!window.confirm(`정말 [${studentName}] 학생을 명단에서 삭제하시겠습니까?\n(명단과 통계에서 완전히 제외되며 다시 나타나지 않습니다)`)) return;
    
    // 1. UI 상태 즉시 낙관적 반영
    const updatedStudents = students.filter(s => s.id !== studentId);
    setStudents(updatedStudents);
    
    // 2. 서버 및 Supabase DB에서 삭제 동기화
    saveStudentsToServer(updatedStudents);
    await deleteStudentFromDb(studentId);
    await saveStudents(updatedStudents);

    setSyncNotice(`🗑️ [${studentName}] 학생이 명단에서 완전히 삭제되었습니다.`);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleSaveMaxHours = async (group: '중위권' | '1순위', hours: number) => {
    if (group === '중위권') {
      setMaxHoursMiddle(hours);
      saveSettingsToServer(hours, maxHoursFirst);
    } else {
      setMaxHoursFirst(hours);
      saveSettingsToServer(maxHoursMiddle, hours);
    }
    await saveMaxHours(group, hours);
  };

  const handleSupabaseConfigChange = () => {
    resetSupabaseClient();
    const creds = getSupabaseCredentials();
    setIsSupabaseEnabled(creds.isValid);
    loadAllData();
    setSyncNotice('✅ 모든 설정이 저장되어 적용되었습니다.');
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // 4. 지도 기록 조작 관련 핸들러
  const saveTimeoutRef = useRef<any>(null);

  const handleSaveRecord = (updatedRecord: TeachingRecord, immediate = false) => {
    // 1. 낙관적 로컬 상태 즉각 반영 (0ms 화면 즉시 갱신)
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== updatedRecord.date);
      const hasAnyStudents = updatedRecord.studentIds.length > 0;
      const hasAnyNotes = Object.values(updatedRecord.notes).some(note => note.trim().length > 0);
      if (hasAnyStudents || hasAnyNotes) {
        return [...filtered, updatedRecord];
      }
      return filtered;
    });

    // 2. 서버 및 DB 동기화 (디바운스 처리로 타이핑 중 끊김/경쟁 상태 방지)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const executeSave = async () => {
      // 1) 서버 중앙 저장소로 즉시 전송 (스마트폰 & 다른 컴퓨터로 0.5초 내 전파)
      saveRecordToServer(updatedRecord);
      // 2) Supabase 클라우드로도 백업
      const ok = await saveRecord(updatedRecord);
      if (ok) {
        setSyncNotice(`☁️ [${updatedRecord.date}] 모든 기기(컴퓨터·스마트폰)에 실시간 동기화되었습니다.`);
        setTimeout(() => setSyncNotice(null), 2500);
      }
    };

    if (immediate) {
      executeSave();
    } else {
      saveTimeoutRef.current = setTimeout(executeSave, 350);
    }
  };

  // 현재 선택된 날짜의 지도 기록 찾기
  const currentDayRecord = records.find(r => r.date === selectedDate);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800" id="app-wrapper">
      
      {/* 글로벌 상단 내비게이션 바 (모바일 360px~412px 화면에서도 겹침 없는 완벽한 반응형) */}
      <header className="min-h-[3.5rem] sm:h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-2.5 sm:px-6 py-1.5 sm:py-0 shrink-0 shadow-xs z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="p-1.5 sm:p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <CalendarIcon size={18} className="sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-slate-900 tracking-tight leading-tight whitespace-nowrap">
              기초학력 지도 달력
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
              Elementary Growth Calendar
            </p>
          </div>
        </div>

        {/* 탭 컨트롤러 & 클라우드 상태 */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          
          {/* 전체 기기(학교 컴퓨터 & 스마트폰) 즉시 동기화 버튼 */}
          <button
            onClick={async () => {
              setIsSyncing(true);
              // 1. 서버 중앙 실시간 저장소로 즉시 전송
              const serverRes = await syncLocalToServer(students, records, maxHoursMiddle, maxHoursFirst);
              if (serverRes) {
                setStudents(serverRes.students);
                setRecords(serverRes.records);
              }
              // 2. Supabase 설정 시 Supabase로도 전송
              if (isSupabaseEnabled) {
                await syncAllToCloud();
              }
              setIsSyncing(false);
              setSyncNotice('☁️ 학교 컴퓨터의 모든 데이터가 스마트폰 및 다른 기기에 100% 실시간 동기화되었습니다!');
              setTimeout(() => setSyncNotice(null), 5000);
            }}
            disabled={isSyncing}
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] shadow-emerald-500/20 active:scale-95"
            title="클릭 시 현재 기기의 모든 데이터를 스마트폰 및 다른 컴퓨터로 즉시 실시간 동기화합니다"
            id="btn-trigger-supabase-sync"
          >
            <CloudLightning size={14} className={isSyncing ? 'animate-bounce shrink-0' : 'shrink-0'} />
            <span className="font-black">
              {isSyncing ? '동기화 중...' : (
                <>
                  <span className="hidden sm:inline">실시간 </span>동기화
                </>
              )}
            </span>
          </button>

          {/* 수동 새로고침 버튼 */}
          <button
            onClick={() => loadAllData(false)}
            disabled={isSyncing}
            className="p-1.5 sm:p-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 rounded-xl border border-slate-100 transition-colors cursor-pointer shrink-0"
            title="실시간 새로고침"
            id="btn-sync-trigger"
          >
            <RefreshCw size={14} className={`sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-[#727CF5]' : ''}`} />
          </button>

          {/* 탭 스위처 */}
          <div className="bg-slate-100 p-0.5 sm:p-1 rounded-xl flex space-x-0.5 sm:space-x-1 border border-slate-200/40 shrink-0">
            <button
              onClick={() => {
                setActiveTab('calendar');
                setIsSettingsOpen(false);
              }}
              className={`px-2 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon size={12} className="sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>달력</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSettingsOpen(false);
              }}
              className={`px-2 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard size={12} className="sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">종합 대시보드</span>
              <span className="sm:hidden">통계</span>
            </button>
          </div>

          {/* 설정 열기 버튼 */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isSettingsOpen 
                ? 'bg-[#727CF5] border-[#727CF5] text-white' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
            }`}
            title="설정 및 학생 명단 관리"
            id="btn-global-settings"
          >
            <Settings size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* 동기화 성공/에러 알림 바 */}
      {syncNotice && (
        <div className="bg-emerald-600 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-bold shadow-md animate-fade-in z-20">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="line-clamp-1">{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-white/80 hover:text-white cursor-pointer font-extrabold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* 실시간 백업 보증용 안내창 */}
      {!isSupabaseEnabled && !syncNotice && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CloudLightning size={14} className="text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-950 font-bold leading-tight">
              슈파베이스를 연동하면 상단 <b>[슈파베이스 즉시 동기화]</b> 버튼으로 스마트폰/PC 간에 실시간 동기화됩니다.
            </p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="text-[11px] text-emerald-700 font-black hover:underline leading-none cursor-pointer shrink-0 ml-2"
          >
            연동 설정 &rarr;
          </button>
        </div>
      )}

      {/* 메인 뷰포트 레이아웃 */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 중앙 워크스페이스 */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
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
