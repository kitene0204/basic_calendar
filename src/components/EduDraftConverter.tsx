import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  HelpCircle, 
  AlertCircle, 
  Download,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface EduDraftItem {
  id: string;
  name: string;      // 품명
  spec: string;      // 규격
  quantity: number;  // 수량
  price: number;     // 단가
}

export default function EduDraftConverter() {
  // 1. 상태 정의
  const [inputText, setInputText] = useState<string>('');
  const [items, setItems] = useState<EduDraftItem[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [apiModalOpen, setApiModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 2. 초기 로드 시 로컬 스토리지에서 API 키 및 최근 작업 내역 가져오기
  useEffect(() => {
    const savedKey = localStorage.getItem('EDU_DRAFT_GEMINI_KEY') || '';
    setApiKey(savedKey);
    
    const savedItems = localStorage.getItem('EDU_DRAFT_ITEMS');
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // items 변경 시 로컬 스토리지 자동 저장
  const saveItemsToLocal = (newItems: EduDraftItem[]) => {
    setItems(newItems);
    localStorage.setItem('EDU_DRAFT_ITEMS', JSON.stringify(newItems));
  };

  // 3. 예시 데이터 세트
  const loadExample = (type: 'cart' | 'complex' | 'messy') => {
    let exampleText = '';
    if (type === 'cart') {
      exampleText = `[쿠팡 장바구니 목록]
- 모나미 153 볼펜 0.5mm 블랙 12개입 / 수량: 3개 / 3,500원
- 더블에이 복사지 A4 80g 2500매 (500매 x 5박스) / 수량: 1개 / 28,900원
- 쓰리엠 스카치 매직테이프 리필용 18mm x 30m / 수량: 5개 / 1,800원
- 문화 고체풀 35g 10개입 대용량 / 수량: 2개 / 6,200원`;
    } else if (type === 'complex') {
      exampleText = `견적서 세부 내역서 (공급받는자용)
---------------------------------------------
1. 무선 무소음 마우스 (로지텍 Pebble M350)
   - 단가: 24,900원 | 수량: 15개 | 세부내용: 행정실 및 교실 배포용
2. 고속 무선 충전 패드 15W (C타입 케이블 포함)
   - 단가: 18,500원 | 규격: 15W 고속 | 수량: 10개
3. HDMI to C타입 변환 미러링 케이블 2m
   - 단가: 12,000원 | 수량: 8개 | 규격: 4K 60Hz 지원
4. 샌디스크 USB 3.0 메탈 플래시 드라이브 64GB
   - 단가: 7,500원 | 수량: 20개 | 규격: CZ73 메탈형`;
    } else {
      exampleText = `부장님 이번에 교실 환경정리 물품 필요한거 적어봅니다.
문구점가서 사려다가 인터넷이 싸서 대충 복사해왔어요.

일단 애들 가위가 다 망가져서 가위 12개 세트(평화 가위 소형) 하나에 8500원짜리 이거 한 3세트 사야할거 같고요,
색종이는 대용량 1000장들이(5색 혼합) 12500원짜리 딱 2박스만 사두면 1년 내내 쓸 것 같습니다.
그리고 제 책상에 놓을 다용도 투명 서랍장 3단짜리(시스맥스 시스템서랍) 18500원인데 이거 행정실 품의할때 같이 좀 넣어주세요! 수량은 2개입니다.
아참, 보드마카 파란색 12개들이 세트(단가 7200원) 이것도 3박스 추가요!`;
    }
    setInputText(exampleText);
    showMessage('info', '예시 데이터가 본문에 입력되었습니다.');
  };

  // 메시지 출력 도우미
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 4. API 키 저장 핸들러
  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    localStorage.setItem('EDU_DRAFT_GEMINI_KEY', trimmed);
    showMessage('success', 'Gemini API 키가 안전하게 로컬에 저장되었습니다!');
    setApiModalOpen(false);
  };

  // 5. 정규식 기반 폴백 파서 (AI 연동 없이도 기본 파싱 작동 보장)
  const parseWithRegex = (text: string): EduDraftItem[] => {
    const lines = text.split('\n');
    const parsed: EduDraftItem[] = [];
    
    // 아주 기본적인 정규식 파싱 시도
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return;
      
      // 가격(숫자)과 수량(숫자) 패턴 검색
      const priceMatch = trimmed.match(/([\d,]+)\s*(원|배|세트|개|매)?/);
      const qtyMatch = trimmed.match(/(수량|개수|개|박스|세트|EA)[:\s]*(\d+)/i) || trimmed.match(/(\d+)\s*(개|세트|박스|매|EA)/i);
      
      let price = 0;
      let quantity = 1;
      let name = trimmed.substring(0, 30);
      
      if (priceMatch) {
        const cleanedPrice = priceMatch[1].replace(/,/g, '');
        const num = parseInt(cleanedPrice, 10);
        if (!isNaN(num) && num > 100) price = num;
      }
      
      if (qtyMatch) {
        const num = parseInt(qtyMatch[2] || qtyMatch[1], 10);
        if (!isNaN(num)) quantity = num;
      }

      // 품명 가공 (특수기호 제거 및 다듬기)
      name = name.replace(/^[-*•\d\.\s]+/, '').trim();
      
      if (name.length > 2) {
        parsed.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.split('/')[0].split('|')[0].trim(),
          spec: '규격참조',
          quantity,
          price
        });
      }
    });

    return parsed;
  };

  // 6. Gemini AI 연동 정밀 파싱
  const handleAiConvert = async () => {
    if (!inputText.trim()) {
      showMessage('error', '변환할 품의 원본 데이터를 먼저 입력해 주세요!');
      return;
    }

    if (!apiKey) {
      // API 키가 없는 경우, 사용자에게 안내하고 일단 정규식 폴백 진행 후 키 입력 유도
      const fallbackItems = parseWithRegex(inputText);
      if (fallbackItems.length > 0) {
        saveItemsToLocal(fallbackItems);
        showMessage('info', 'Gemini API 키가 없어 기본 패턴 파서(로컬)로 즉각 변환했습니다. 더 스마트한 인공지능 정밀 분석을 원하시면 우측 상단 🔑 개인 API 키 입력을 눌러주세요!');
      } else {
        showMessage('error', '로컬 자동 파싱에 실패했습니다. 더 스마트한 분석을 위해 🔑 개인 API 키를 등록해 주세요!');
        setApiModalOpen(true);
      }
      return;
    }

    setIsConverting(true);
    try {
      // @google/genai SDK 초기화
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `당신은 대한민국 학교/공공기관 행정실의 K-에듀파인 지출품의 작성을 돕는 인공지능 행정 조교입니다.
사용자가 입력한 난잡한 장바구니 텍스트, 견적서 텍스트, 혹은 메모 내용에서 [품명], [규격], [수량], [단가]를 최대한 정밀하게 추출해야 합니다.

[추출 규칙]
1. 품명: 해당 물품의 명확한 이름 (가공하여 불필요한 홍보 문구나 수량 정보는 제외)
2. 규격: 물품의 크기, 용량, 스펙 (텍스트에 규격이 명시되지 않았다면 '규격참조' 또는 '일반'으로 입력)
3. 수량: 물품의 개수 (정수형 숫자만)
4. 단가: 물품 1개당 단가 (원화 기준 정수형 숫자만, 콤마 제외)

반드시 아래와 같은 JSON 배열 형식으로만 응답하세요. 다른 설명이나 텍스트는 일체 포함하지 마세요.
JSON 응답 예시:
[
  {
    "name": "모나미 153 볼펜 0.5mm 블랙(12개입)",
    "spec": "0.5mm 블랙",
    "quantity": 3,
    "price": 3500
  }
]

변환할 원본 텍스트:
"""
${inputText}
"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '';
      const parsedData = JSON.parse(responseText.trim());
      
      if (Array.isArray(parsedData)) {
        const validatedItems: EduDraftItem[] = parsedData.map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          name: String(item.name || '품명 미상').trim(),
          spec: String(item.spec || '규격참조').trim(),
          quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1,
          price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
        }));
        
        saveItemsToLocal(validatedItems);
        showMessage('success', `성공적으로 ${validatedItems.length}개의 품목을 정밀 분석 및 추출 완료했습니다!`);
      } else {
        throw new Error('JSON 형식이 배열이 아닙니다.');
      }

    } catch (error: any) {
      console.error('Gemini AI Conversion failed:', error);
      // 에러 발생 시 로컬 폴백 파싱 시도
      const fallbackItems = parseWithRegex(inputText);
      if (fallbackItems.length > 0) {
        saveItemsToLocal(fallbackItems);
        showMessage('info', `AI API 호출 중 일시적 오류가 발생하여 기본 로컬 파서로 긴급 대체 파싱하였습니다. (에러: ${error.message || '연결 지연'})`);
      } else {
        showMessage('error', `AI 변환에 실패했습니다: ${error.message || 'API 키 또는 네트워크 상태를 확인하세요.'}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  // 7. 아이템 편집 및 조작
  const handleUpdateItem = (id: string, field: keyof EduDraftItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        let val = value;
        if (field === 'quantity') {
          val = parseInt(value, 10);
          if (isNaN(val) || val < 0) val = 0;
        } else if (field === 'price') {
          val = parseInt(value, 10);
          if (isNaN(val) || val < 0) val = 0;
        }
        return { ...item, [field]: val };
      }
      return item;
    });
    saveItemsToLocal(updated);
  };

  const handleDeleteItem = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    saveItemsToLocal(filtered);
    showMessage('info', '품목이 리스트에서 제거되었습니다.');
  };

  const handleAddItem = () => {
    const newItem: EduDraftItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '새 품목',
      spec: '규격참조',
      quantity: 1,
      price: 1000
    };
    saveItemsToLocal([...items, newItem]);
  };

  const handleClearAll = () => {
    if (window.confirm('추출된 모든 물품 내역을 비우시겠습니까?')) {
      saveItemsToLocal([]);
      showMessage('info', '물품 내역이 완전히 초기화되었습니다.');
    }
  };

  // 8. 에듀파인 복사용 기안문 텍스트 생성
  const handleCopyMemo = () => {
    if (items.length === 0) {
      showMessage('error', '복사할 품목 내역이 비어 있습니다.');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    let memo = `■ 지출품의 요구내역 복사본 (총액: ${totalAmount.toLocaleString()}원)\n`;
    items.forEach((item, idx) => {
      const subtotal = item.quantity * item.price;
      memo += `${idx + 1}. 품명: ${item.name} | 규격: ${item.spec} | 수량: ${item.quantity} | 단가: ${item.price.toLocaleString()}원 | 예상금액: ${subtotal.toLocaleString()}원\n`;
    });

    navigator.clipboard.writeText(memo);
    setCopiedText(true);
    showMessage('success', '기안문 첨부 및 지출품의 참고용 내역 텍스트가 클립보드에 복사되었습니다!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  // 9. K-에듀파인 일괄업로드 양식 CSV 다운로드 (UTF-8 BOM 지원으로 Excel에서 바로 열림)
  const handleDownloadCsv = () => {
    if (items.length === 0) {
      showMessage('error', '다운로드할 품목 내역이 없습니다.');
      return;
    }

    // 에듀파인 표준 일괄업로드 헤더 구성
    // 순번, 품명, 규격, 단위, 수량, 예상단가, 예상금액
    let csvContent = '\ufeff'; // Excel 한글 깨짐 방지 BOM 추가
    csvContent += '순번,품명,규격,단위,수량,예상단가,예상금액\n';

    items.forEach((item, idx) => {
      const subtotal = item.quantity * item.price;
      // CSV 이스케이프 (쉼표 처리)
      const cleanName = `"${item.name.replace(/"/g, '""')}"`;
      const cleanSpec = `"${item.spec.replace(/"/g, '""')}"`;
      csvContent += `${idx + 1},${cleanName},${cleanSpec},개,${item.quantity},${item.price},${subtotal}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `K-에듀파인_품의일괄업로드_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'K-에듀파인 일괄업로드용 엑셀(CSV) 양식 다운로드가 완료되었습니다!');
  };

  const totalSum = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <div className="space-y-6" id="edu-draft-converter-root">
      
      {/* 상단 통합 알림바 */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
          message.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' :
          'bg-indigo-50 border border-indigo-100 text-indigo-900'
        }`}>
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{message.text}</p>
        </div>
      )}

      {/* 헤더 및 API 설정 키 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md uppercase">EduDraft AI</span>
            <h2 className="text-lg font-black text-slate-900">K-에듀파인 품의 엑셀 변환기</h2>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1.5">
            장바구니 캡처 복사글이나 견적서 원본 텍스트를 붙여넣어 에듀파인 양식으로 1초 만에 스마트 파싱합니다.
          </p>
        </div>

        <button
          onClick={() => setApiModalOpen(true)}
          className={`px-4 py-2 text-xs font-black rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
            apiKey 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          id="btn-open-api-modal"
        >
          <Key size={14} className={apiKey ? 'text-emerald-500' : 'text-slate-400'} />
          <span>{apiKey ? '🔑 개인 API 키 등록 완료' : '🔑 개인 API 키 입력'}</span>
        </button>
      </div>

      {/* 스마트 가이드 퀵 예시 */}
      <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border border-indigo-100/50 rounded-2xl p-5 flex flex-col md:flex-row items-start gap-4">
        <div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-xs border border-indigo-100/30 shrink-0">
          <Sparkles size={20} className="animate-pulse" />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="text-sm font-extrabold text-slate-950 leading-none">✨ 품의 작성 간소화를 위한 스마트 길잡이</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-relaxed">
              쇼핑몰 상품 페이지 장바구니 내용 전체나 엑셀 견적서 텍스트 영역을 <kbd className="bg-slate-200 text-slate-700 px-1 rounded font-bold">Ctrl+C</kbd> 하여 아래에 붙여넣고 <strong className="text-indigo-600">품의 내역 변환</strong> 버튼을 클릭하세요. 업로드용 엑셀 다운로드와 지출품의 기안용 텍스트가 즉각 생성됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={() => loadExample('cart')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              🛒 장바구니 예시
            </button>
            <button 
              onClick={() => loadExample('complex')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              📄 복잡한 견적서 예시
            </button>
            <button 
              onClick={() => loadExample('messy')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              ✏️ 난잡글 예시 불러오기
            </button>
          </div>
        </div>
      </div>

      {/* 두 칸 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 원본 내역 데이터 입력 패널 (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-[#727CF5] rounded-full"></span>
                <span>원본 내역 데이터 입력</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {inputText.length}자 입력됨
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여기에 마우스 드래그를 통해 파일을 끌어 놓거나 복사한 데이터를 붙여넣어 주세요!

[가능한 입력 패턴]
- 쿠팡, 지마켓, 나라장터, 학교장터 장바구니 화면 전체 복사 글
- 도매유통업체 견적서 PDF 또는 텍스트 목록
- 품명 수량 단가 정보가 불규칙하게 기록된 임의의 목록
- 혹은 이미지/엑셀 파일 자체를 이 곳에 직접 붙여넣으세요."
              className="w-full h-80 px-4 py-3 bg-slate-50/60 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-100 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none transition-all text-xs font-medium leading-relaxed resize-none"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAiConvert}
                disabled={isConverting}
                className={`w-full py-3 rounded-xl font-black text-xs text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  isConverting 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                }`}
              >
                <Sparkles size={14} className={isConverting ? 'animate-spin' : ''} />
                <span>{isConverting ? '인공지능 정밀 분석 및 추출 중...' : '⚡ K-에듀파인 품의 내역 AI 변환하기'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 추출 품의 물품 조정 패널 (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
            
            {/* 리스트 헤더 조작부 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <FileSpreadsheet size={15} className="text-[#727CF5]" />
                <span>⚙️ 추출 품의 물품 조정</span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded-md ml-1">
                  총 {items.length}개 품목
                </span>
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleAddItem}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 border border-slate-100 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Plus size={10} />
                  <span>수동 추가</span>
                </button>
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={10} />
                    <span>전체 삭제</span>
                  </button>
                )}
              </div>
            </div>

            {/* 품목 리스트 테이블 테이블 형태 */}
            {items.length === 0 ? (
              <div className="h-64 border border-dashed border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <FileSpreadsheet size={32} className="mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">분석 및 추출된 품의 항목이 없습니다.</p>
                <p className="text-[10px] text-slate-400 mt-1">상단 예시 가이드를 로드해 시뮬레이션하거나 왼쪽 텍스트박스 영역에 견적 장바구니 내용을 복사+붙여넣기하여 실행해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 text-center w-10">순번</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 w-44">품명</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 w-24">규격</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 text-center w-16">수량</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 text-right w-24">단가</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 text-right w-24">예상금액</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold text-slate-500 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] font-medium text-slate-700">
                      {items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-indigo-200 outline-none rounded px-1.5 py-1 border border-transparent hover:border-slate-200 text-slate-900 text-xs font-bold transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.spec}
                              onChange={(e) => handleUpdateItem(item.id, 'spec', e.target.value)}
                              className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-indigo-200 outline-none rounded px-1.5 py-1 border border-transparent hover:border-slate-200 text-slate-600 font-semibold transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                              className="w-full bg-transparent text-center hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-indigo-200 outline-none rounded px-1 py-1 border border-transparent hover:border-slate-200 font-extrabold text-slate-800 transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                              className="w-full bg-transparent text-right hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-indigo-200 outline-none rounded px-1.5 py-1 border border-transparent hover:border-slate-200 font-bold text-slate-900 transition-all"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-black text-indigo-600">
                            {(item.quantity * item.price).toLocaleString()}원
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 하단 집계 및 일괄 조작부 */}
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Estimate</span>
                    <span className="text-base font-black text-slate-950">
                      총 예상금액 : <span className="text-[#727CF5] text-lg">{totalSum.toLocaleString()}</span>원
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyMemo}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="결재 기안문 본문에 삽입할 요약본을 복사합니다."
                    >
                      {copiedText ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedText ? '복사 완료!' : '📄 기안 텍스트 복사'}</span>
                    </button>

                    <button
                      onClick={handleDownloadCsv}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 cursor-pointer shadow-md transition-all"
                      title="K-에듀파인 품목 일괄업로드용 엑셀(CSV) 양식을 내려받습니다."
                    >
                      <Download size={13} />
                      <span>📊 에듀파인 CSV 다운로드</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 개인 API 키 입력 모달 */}
      {apiModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="api-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Key size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-950">개인 Gemini API 키 설정</h4>
                <p className="text-[10px] text-slate-400 font-bold">Local Web Storage Storage</p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-[11px] leading-relaxed text-slate-500 font-medium">
              <p className="font-extrabold text-slate-800 mb-1">💡 왜 API 키가 필요한가요?</p>
              이 앱은 구글의 초거대 AI 모델인 <strong className="text-indigo-600">Gemini 1.5 Flash</strong>를 브라우저 내에서 직접 활용하여, 그 어떤 어수선한 텍스트 파일이나 장바구니 리스트글도 정밀 파싱해 줍니다.
              키는 타 서버로 일절 가지 않고 사용자의 브라우저 로컬 저장소에만 안전하게 보존됩니다.
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase block">Gemini API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="AI Studio에서 발급받은 API 키를 입력하세요 (AIzaSy...)"
                  defaultValue={apiKey}
                  id="input-api-key-field"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-xs font-mono transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setApiModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('input-api-key-field') as HTMLInputElement;
                  if (input) {
                    handleSaveApiKey(input.value);
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm"
              >
                저장 및 적용
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
