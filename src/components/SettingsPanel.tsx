import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Cloud, HelpCircle, Save, Database, AlertCircle, Copy, Check } from 'lucide-react';
import { Student } from '../types';
import { getSupabaseCredentials, SUPABASE_SQL_SETUP } from '../lib/supabase';

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
        
        {/* 1. 최대 지도 시수 설정 */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
            <span className="w-1.5 h-4 bg-[#727CF5] rounded-full inline-block" />
            <span>최대 지도 시수 설정</span>
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
                <span className="text-xs text-slate-400 font-medium">회</span>
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
                <span className="text-xs text-slate-400 font-medium">회</span>
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
              className="bg-[#727CF5] hover:bg-[#5C66E4] text-white p-2.5 rounded-xl flex items-center justify-center transition-colors shadow-xs"
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
                      className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded transition-all"
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

        {/* 3. 클라우드 저장 (Supabase) 연동 */}
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

            {/* 연결 테스트 및 상태 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isDbTesting}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-[#727CF5] font-bold text-xs rounded-lg border border-indigo-100 transition-colors"
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
                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-md transition-colors"
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
          className="flex-1 py-3.5 bg-[#727CF5] hover:bg-[#5C66E4] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm"
          id="btn-save-all-settings"
        >
          <Save size={16} />
          <span>모든 설정 저장</span>
        </button>
      </div>
    </div>
  );
}
