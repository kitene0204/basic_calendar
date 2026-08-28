import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  UploadCloud, 
  DownloadCloud, 
  FileText, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  ArrowRight,
  Database
} from 'lucide-react';
import { 
  exportFullData, 
  importFullData, 
  generateDataSyncUrl, 
  syncAllToCloud, 
  getSupabaseCredentials,
  FullDataSnapshot 
} from '../lib/supabase';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
  onOpenSettings: () => void;
  studentsCount: number;
  recordsCount: number;
}

export default function SyncModal({
  isOpen,
  onClose,
  onDataImported,
  onOpenSettings,
  studentsCount,
  recordsCount
}: SyncModalProps) {
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'link' | 'cloud' | 'text' | 'file'>('link');

  if (!isOpen) return null;

  const creds = getSupabaseCredentials();

  // 1. 원클릭 동기화 링크 복사
  const handleCopyLink = () => {
    const url = generateDataSyncUrl();
    navigator.clipboard.writeText(url);
    setIsUrlCopied(true);
    setSyncStatusMsg({
      type: 'success',
      text: '✅ 노트북의 최신 데이터가 담긴 링크가 복사되었습니다! 다른 PC/폰 브라우저 주소창에 붙여넣으세요.'
    });
    setTimeout(() => setIsUrlCopied(false), 3500);
  };

  // 2. 전체 데이터 JSON 텍스트 복사 (카톡/메신저 전송용)
  const handleCopyText = () => {
    const snapshot = exportFullData();
    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setIsTextCopied(true);
    setSyncStatusMsg({
      type: 'success',
      text: '✅ 텍스트 데이터가 복사되었습니다! 카카오톡이나 메신저로 전송 후 다른 기기에서 붙여넣기 하세요.'
    });
    setTimeout(() => setIsTextCopied(false), 3000);
  };

  // 3. 붙여넣은 텍스트로 즉시 복원
  const handleApplyPasteText = () => {
    if (!pasteText.trim()) {
      alert('복사한 텍스트 데이터를 먼저 붙여넣어 주세요.');
      return;
    }
    try {
      const snapshot = JSON.parse(pasteText.trim());
      if (importFullData(snapshot)) {
        setSyncStatusMsg({
          type: 'success',
          text: `🎉 데이터 복원 완료! (학생 ${snapshot.students?.length || 0}명, 지도 기록 ${snapshot.records?.length || 0}일치)`
        });
        onDataImported();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSyncStatusMsg({ type: 'error', text: '올바른 데이터 형식이 아닙니다.' });
      }
    } catch (e: any) {
      setSyncStatusMsg({ type: 'error', text: `데이터 파싱 실패: ${e.message || e}` });
    }
  };

  // 4. Supabase 클라우드로 즉시 업로드
  const handleCloudUpload = async () => {
    if (!creds.isValid) {
      alert('먼저 우측 상단 [설정] ⚙️ 메뉴에서 Supabase URL과 Key를 설정해 주세요.');
      onOpenSettings();
      return;
    }

    setIsUploading(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncAllToCloud();
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `☁️ 노트북의 최신 데이터(학생 + ${res.count}개 날짜 기록)가 Supabase 클라우드에 100% 저장되었습니다!`
        });
        onDataImported();
      } else {
        setSyncStatusMsg({ type: 'error', text: `클라우드 저장 실패: ${res.error}` });
      }
    } catch (e: any) {
      setSyncStatusMsg({ type: 'error', text: `오류 발생: ${e.message || e}` });
    } finally {
      setIsUploading(false);
    }
  };

  // 5. 파일 다운로드 (.json)
  const handleDownloadJson = () => {
    const snapshot = exportFullData();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10);
    a.download = `학급기초학력지도_최신데이터_${now}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncStatusMsg({ type: 'success', text: '💾 백업 파일(.json)이 다운로드되었습니다.' });
  };

  // 6. 파일 업로드 (.json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snapshot = JSON.parse(text);
        if (importFullData(snapshot)) {
          setSyncStatusMsg({
            type: 'success',
            text: `🎉 파일에서 데이터 복원 완료! (학생 ${snapshot.students?.length || 0}명, 기록 ${snapshot.records?.length || 0}개)`
          });
          onDataImported();
          setTimeout(() => onClose(), 1500);
        } else {
          setSyncStatusMsg({ type: 'error', text: '파일 형식이 올바르지 않습니다.' });
        }
      } catch (err: any) {
        setSyncStatusMsg({ type: 'error', text: `파일 읽기 오류: ${err.message || err}` });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="sync-modal-backdrop">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" id="sync-modal-content">
        
        {/* 헤더 */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#727CF5] to-[#5C66E4] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Share2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">다른 브라우저 / 기기 즉시 동기화</h2>
              <p className="text-xs text-white/80 font-medium">노트북의 최신 데이터를 다른 PC/스마트폰으로 1초 만에 보내기</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
            id="btn-close-sync-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* 현재 노트북 데이터 요약 뱃지 */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-600 font-semibold">
            <Laptop size={15} className="text-[#727CF5]" />
            <span>현재 노트북 보유 데이터:</span>
            <span className="bg-indigo-100 text-[#727CF5] px-2 py-0.5 rounded-md font-bold">학생 {studentsCount}명</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold">지도 기록 {recordsCount}일치</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-bold">
            {creds.isValid ? (
              <span className="text-emerald-600 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>클라우드 연동됨</span>
              </span>
            ) : (
              <span className="text-amber-600 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>로컬 저장소 모드</span>
              </span>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'link'
                ? 'border-[#727CF5] text-[#727CF5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={14} />
            <span>1. 원클릭 링크 (추천)</span>
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'cloud'
                ? 'border-[#727CF5] text-[#727CF5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database size={14} />
            <span>2. 실시간 클라우드</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'text'
                ? 'border-[#727CF5] text-[#727CF5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} />
            <span>3. 카톡/텍스트 전송</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'file'
                ? 'border-[#727CF5] text-[#727CF5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download size={14} />
            <span>4. 파일 백업/복원</span>
          </button>
        </div>

        {/* 탭 내용 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* 상태 알림 메시지 */}
          {syncStatusMsg && (
            <div className={`p-3.5 rounded-xl text-xs font-bold flex items-start space-x-2 animate-fade-in ${
              syncStatusMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{syncStatusMsg.text}</span>
            </div>
          )}

          {/* 탭 1: 원클릭 동기화 링크 */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-[#727CF5] font-bold text-xs">
                  <Sparkles size={16} />
                  <span>가장 쉽고 빠른 방법! (0초 만에 완벽 복제)</span>
                </div>
                <p className="text-xs text-indigo-950/80 leading-relaxed font-medium">
                  현재 노트북에 있는 <b>학생 명단 + 모든 날짜의 지도 기록 + 시수 설정</b>을 통째로 포함하는 다이렉트 복제 링크를 만듭니다.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-4 h-4 bg-[#727CF5] text-white rounded-full flex items-center justify-center text-[9px] font-bold">1</span>
                    <span>아래 버튼을 눌러 <b>전체 데이터 복제 링크</b>를 복사합니다.</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-4 h-4 bg-[#727CF5] text-white rounded-full flex items-center justify-center text-[9px] font-bold">2</span>
                    <span>다른 PC, 태블릿, 또는 스마트폰 브라우저 주소창에 <b>붙여넣기</b>만 하면 즉시 모든 데이터가 똑같이 복원됩니다!</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full py-4 bg-[#727CF5] hover:bg-[#5C66E4] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
                id="btn-copy-full-data-link"
              >
                {isUrlCopied ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Copy size={18} />}
                <span>{isUrlCopied ? '🔗 최신 데이터 복제 링크 복사완료!' : '🔗 내 노트북 최신 데이터 전체 동기화 링크 복사'}</span>
              </button>
            </div>
          )}

          {/* 탭 2: 실시간 클라우드 (Supabase) */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Supabase 클라우드 동기화</span>
                  <button
                    onClick={onOpenSettings}
                    className="text-[11px] text-[#727CF5] font-bold hover:underline cursor-pointer"
                  >
                    연동 설정 변경 ⚙️
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Supabase와 연동하면 한 기기에서 입력한 내용이 다른 모든 기기에 실시간 WebSocket으로 자동 반영됩니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handleCloudUpload}
                    disabled={isUploading}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    id="btn-push-to-cloud-modal"
                  >
                    <UploadCloud size={16} className={isUploading ? 'animate-bounce' : ''} />
                    <span>{isUploading ? '업로드 중...' : '☁️ 내 노트북 데이터 전체 클라우드로 전송'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 탭 3: 카톡/텍스트 전송 */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">내보내기: 데이터 텍스트 복사</label>
                  <button
                    onClick={handleCopyText}
                    className="px-3 py-1 bg-[#727CF5] hover:bg-[#5C66E4] text-white font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
                    id="btn-copy-text-data"
                  >
                    {isTextCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isTextCopied ? '복사됨!' : '전체 텍스트 복사'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  전체 데이터를 텍스트로 복사하여 카카오톡 '나와의 채팅'이나 이메일, 메모장에 붙여넣어 전송할 수 있습니다.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-700">불러오기: 텍스트 붙여넣고 복원</label>
                <textarea
                  rows={3}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="다른 기기에서 복사한 데이터 텍스트를 여기에 붙여넣으세요..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#727CF5]"
                />
                <button
                  onClick={handleApplyPasteText}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  id="btn-apply-paste-data"
                >
                  <DownloadCloud size={15} />
                  <span>📥 붙여넣은 텍스트로 즉시 복원하기</span>
                </button>
              </div>
            </div>
          )}

          {/* 탭 4: 파일 백업/복원 */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-center flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">1. 백업 파일 내보내기</h4>
                    <p className="text-[11px] text-slate-400 mt-1">모든 데이터를 .json 파일로 PC에 다운로드합니다.</p>
                  </div>
                  <button
                    onClick={handleDownloadJson}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
                    id="btn-download-backup-json"
                  >
                    <Download size={14} />
                    <span>💾 백업 파일 다운로드</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-center flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">2. 백업 파일 불러오기</h4>
                    <p className="text-[11px] text-slate-400 mt-1">다운로드해 둔 .json 파일을 선택하여 복원합니다.</p>
                  </div>
                  <label className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-2">
                    <Upload size={14} />
                    <span>📂 백업 파일 선택 (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="input-file-backup"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 닫기 푸터 */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer"
            id="btn-footer-close-sync"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
