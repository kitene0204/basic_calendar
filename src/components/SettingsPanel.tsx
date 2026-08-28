import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Cloud, HelpCircle, Save, Database, AlertCircle, Copy, Check, Download, Share2, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Student } from '../types';
import { getSupabaseCredentials, SUPABASE_SQL_SETUP, generateSyncUrl, syncAllToCloud } from '../lib/supabase';

interface SettingsPanelProps {
  students: Student[];
  onAddStudent: (name: string, group: '중위권' | '1순위' | '기타') => void;
  onDeleteStudent: (id: string) => void;
  maxHoursMiddle: number;
  maxHoursFirst: number;
  onSaveMaxHours: (group: '중위권' | '1순위', hours: number) => void;
  onClose: () => void;
  onSupabaseConfigChange: () => void;
}

export default function SettingsPanel({
  students,
  onAddStudent,
  onDeleteStudent,
  maxHoursMiddle,
  maxHoursFirst,
  onSaveMaxHours,
  onClose,
  onSupabaseConfigChange
}: SettingsPanelProps) {
  // 학생 추가 관련 상태
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGroup, setNewStudentGroup] = useState<'중위권' | '1순위' | '기타'>('중위권');

  // 시수 관련 상태
  const [inputMiddleHours, setInputMiddleHours] = useState(maxHoursMiddle);
  const [inputFirstHours, setInputFirstHours] = useState(maxHoursFirst);

  // Supabase 관련 상태
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncUrlCopied, setIsSyncUrlCopied] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [isDbTesting, setIsDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    // 저장되어 있는 Supabase Credentials 로드
    const { url, key } = getSupabaseCredentials();
    setSbUrl(url);
    setSbKey(key);
  }, []);

  // 학생 추가 핸들러
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    onAddStudent(newStudentName.trim(), newStudentGroup);
    setNewStudentName('');
  };

  // 설정 저장 핸들러 (시수 및 Supabase 설정 보관)
  const handleSaveSettings = () => {
    // 1. 시수 업데이트
    onSaveMaxHours('중위권', inputMiddleHours);
    onSaveMaxHours('1순위', inputFirstHours);

    // 2. Supabase 자격증명 업데이트
    localStorage.setItem('custom_supabase_url', sbUrl.trim());
    localStorage.setItem('custom_supabase_anon_key', sbKey.trim());
    
    // Supabase 클라이언트 재설정 알림
    onSupabaseConfigChange();

    alert('설정이 저장되었습니다.');
  };

  // SQL 복사 기능
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 모든 기기 원클릭 동기화 링크 복사 기능
  const handleCopySyncUrl = () => {
    // 먼저 현재 입력값 저장
    localStorage.setItem('custom_supabase_url', sbUrl.trim());
    localStorage.setItem('custom_supabase_anon_key', sbKey.trim());
    onSupabaseConfigChange();

    const syncUrl = generateSyncUrl();
    if (!syncUrl) {
      alert('Supabase URL과 Key를 먼저 올바르게 입력해 주세요.');
      return;
    }
    navigator.clipboard.writeText(syncUrl);
    setIsSyncUrlCopied(true);
    setTimeout(() => setIsSyncUrlCopied(false), 3000);
  };

  // 로컬 최신 데이터 전체를 Supabase 클라우드로 강제 일괄 업로드
  const handleUploadAllToCloud = async () => {
    if (!sbUrl || !sbKey) {
      alert('먼저 Supabase URL과 Key를 입력하고 저장해 주세요.');
      return;
    }

    setIsUploadingToCloud(true);
    setCloudSyncMsg(null);
    try {
      const res = await syncAllToCloud();
      if (res.success) {
        setCloudSyncMsg(`✅ 최신 데이터(학생 + ${res.count}개 날짜 기록)가 Supabase에 모두 안전하게 업로드되었습니다!`);
        onSupabaseConfigChange();
      } else {
        setCloudSyncMsg(`❌ 업로드 실패: ${res.error}`);
      }
    } catch (e: any) {
      setCloudSyncMsg(`❌ 오류: ${e.message || e}`);
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  // Supabase 연결 자격 확인 테스트
  const handleTestConnection = async () => {
    if (!sbUrl || !sbKey) {
      setDbTestResult({ success: false, msg: 'URL과 Anon Key를 모두 입력해 주세요.' });
      return;
    }

    setIsDbTesting(true);
    setDbTestResult(null);

    try {
      // 임시로 클라이언트 구성하여 fetch 시도
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(sbUrl, sbKey);
      
      // 가볍게 students 테이블 조회 테스트
      const { error } = await testClient.from('students').select('id').limit(1);
      
      if (error) {
        // 테이블이 존재하지 않거나 권한이 맞지 않는 경우
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          setDbTestResult({ 
            success: true, 
            msg: '연결 성공! 단, 테이블이 존재하지 않습니다. 아래 SQL을 실행하여 테이블을 생성하세요.' 
          });
        } else {
          setDbTestResult({ success: false, msg: `연결 실패: ${error.message}` });
        }
      } else {
        setDbTestResult({ success: true, msg: '연결 성공! 테이블과 통신이 원활합니다.' });
      }
    } catch (err: any) {
      setDbTestResult({ success: false, msg: `연결 중 예외 발생: ${err.message || err}` });
    } finally {
      setIsDbTesting(false);
    }
  };

  return (
    <div className="bg-white h-full rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden" id="settings-panel">
      {/* 패널 헤더 */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database size={20} className="text-[#727CF5]" />
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">설정 및 학생 관리</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          title="닫기"
          id="btn-close-settings"
        >
          <X size={20} />
        </button>
      </div>

      {/* 패널 본문 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* 0. 단독 실행형 HTML 다운로드 */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
            <span className="w-1.5 h-4 bg-[#727CF5] rounded-full inline-block" />
            <span>단독 실행형 HTML 다운로드</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            인터넷 연결이 필요 없는 단일 파일(.html) 프로그램입니다. 교실 PC나 오프라인 환경에서 더블 클릭만으로 온전히 동작하며, 기기 내에 데이터가 안전하게 보관됩니다.
          </p>
          <div className="space-y-2.5">
            <a
              href="/Calendar.html"
              download="학급_기초학력_지도_달력.html"
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100/50 transition-colors shrink-0">
                  <Download size={15} />
                </div>
                <div className="text-left truncate">
                  <h4 className="text-xs font-bold text-slate-800">1. 기초학력 지도 달력</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">달력식 이력 관리 & 남은 시수 자동 산출</p>
                </div>
              </div>
              <span className="text-[10px] shrink-0 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 font-extrabold group-hover:border-indigo-200 group-hover:text-[#727CF5] transition-all">
                다운로드
              </span>
            </a>

            <a
              href="/EduDraft.html"
              download="K_에듀파인_품의_엑셀_변환기.html"
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100/50 transition-colors shrink-0">
                  <Download size={15} />
                </div>
                <div className="text-left truncate">
                  <h4 className="text-xs font-bold text-slate-800">2. 품의 초안 엑셀 변환기</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">줄글 품의 내용을 에듀파인 업로드용 엑셀로</p>
                </div>
              </div>
              <span className="text-[10px] shrink-0 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 font-extrabold group-hover:border-emerald-200 group-hover:text-emerald-600 transition-all">
                다운로드
              </span>
            </a>
          </div>
          <div className="h-px bg-slate-100/80 w-full pt-2" />
        </section>
        
        {/* 1. 최대 지도 시수 설정 */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
            <span className="w-1.5 h-4 bg-[#727CF5] rounded-full inline-block" />
            <span>최대 지도 시수(시간) 설정</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">중위권 최대 시수</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={inputMiddleHours}
                  onChange={(e) => setInputMiddleHours(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-bold">시간</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">1순위 최대 시수</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={inputFirstHours}
                  onChange={(e) => setInputFirstHours(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-bold">시간</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. 대상 학생 명단 수정/추가 */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
            <span className="w-1.5 h-4 bg-[#727CF5] rounded-full inline-block" />
            <span>학생 명단 관리 ({students.length}명)</span>
          </h3>
          
          {/* 학생 추가 폼 */}
          <form onSubmit={handleAddStudentSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="새 학생 이름"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#727CF5] text-slate-700 font-medium"
            />
            <select
              value={newStudentGroup}
              onChange={(e) => setNewStudentGroup(e.target.value as '중위권' | '1순위' | '기타')}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#727CF5] text-slate-600 font-bold"
            >
              <option value="중위권">중위권</option>
              <option value="1순위">1순위</option>
              <option value="기타">기타</option>
            </select>
            <button
              type="submit"
              className="bg-[#727CF5] hover:bg-[#5C66E4] text-white p-2.5 rounded-xl flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="학생 추가"
              id="btn-add-student"
            >
              <UserPlus size={18} />
            </button>
          </form>

          {/* 학생 리스트 */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs italic">등록된 학생이 없습니다.</div>
            ) : (
              students.map(student => {
                const groupBadgeColor = student.group === '1순위' 
                  ? 'bg-rose-50 text-[#FF4D6D] border-rose-100' 
                  : student.group === '중위권' 
                  ? 'bg-amber-50 text-[#B07A00] border-amber-100' 
                  : 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <div key={student.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${groupBadgeColor}`}>
                        {student.group}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteStudent(student.id)}
                      className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded transition-all cursor-pointer"
                      title={`${student.name} 삭제`}
                      id={`btn-del-student-${student.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3. 클라우드 저장 (Supabase) 연동 및 기기 간 동기화 */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
              <Cloud size={18} className="text-[#727CF5]" />
              <span>실시간 클라우드 동기화 (Supabase)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">기기 간 실시간 공유</span>
          </div>

          <div className="space-y-4 bg-slate-50 p-4.5 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Supabase Anon API Key</label>
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* 원클릭 기기 동기화 링크 생성 및 전체 업로드 */}
            <div className="pt-2 border-t border-slate-200/60 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopySyncUrl}
                  className="flex-1 px-3 py-2 bg-[#727CF5] hover:bg-[#5C66E4] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="다른 PC나 스마트폰 브라우저에서 이 링크로 접속하면 자동으로 클라우드가 연동됩니다."
                  id="btn-copy-sync-url"
                >
                  {isSyncUrlCopied ? <CheckCircle2 size={15} className="text-emerald-300" /> : <Share2 size={15} />}
                  <span>{isSyncUrlCopied ? '동기화 전용 링크 복사완료!' : '🔗 다른 PC/폰 동기화 링크 복사'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUploadAllToCloud}
                  disabled={isUploadingToCloud}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="현재 화면의 모든 최신 데이터를 Supabase 클라우드로 즉시 업로드합니다."
                  id="btn-upload-all-cloud"
                >
                  <UploadCloud size={15} className={isUploadingToCloud ? 'animate-bounce' : ''} />
                  <span>{isUploadingToCloud ? '업로드 중...' : '☁️ 최신 데이터 전체 클라우드 동기화'}</span>
                </button>
              </div>

              {cloudSyncMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium rounded-lg">
                  {cloudSyncMsg}
                </div>
              )}
            </div>

            {/* 연결 테스트 및 상태 */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isDbTesting}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
                id="btn-test-db"
              >
                {isDbTesting ? '연결 확인 중...' : '연결 및 테이블 확인'}
              </button>
              
              {dbTestResult && (
                <div className={`text-[11px] font-medium max-w-[200px] text-right ${dbTestResult.success ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {dbTestResult.msg}
                </div>
              )}
            </div>
          </div>

          {/* SQL 스키마 안내 어코디언 / 드롭다운 가이드 */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-2.5">
            <div className="flex items-start space-x-2">
              <AlertCircle size={15} className="text-[#727CF5] shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                Supabase를 연동하려면 데이터베이스에 테이블이 존재해야 합니다. 아래 SQL을 복사하여 Supabase <b>SQL Editor</b>에 붙여넣고 실행(Run)해 주세요.
              </p>
            </div>
            
            <div className="relative">
              <pre className="bg-[#1E293B] text-slate-300 text-[9px] p-3 rounded-lg overflow-x-auto font-mono max-h-36">
                {SUPABASE_SQL_SETUP}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-md transition-colors cursor-pointer"
                title="SQL 복사하기"
              >
                {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 패널 하단 고정 저장 버튼 */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-2">
        <button
          onClick={handleSaveSettings}
          className="flex-1 py-3.5 bg-[#727CF5] hover:bg-[#5C66E4] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm cursor-pointer"
          id="btn-save-all-settings"
        >
          <Save size={16} />
          <span>모든 설정 저장</span>
        </button>
      </div>
    </div>
  );
}
