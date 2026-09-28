import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. 초기 기본 학생 명단 (선생님 실제 운영 명단 100% 일치)
const INITIAL_STUDENTS = [
  { id: 'student-1', name: '이솔빛나', group: '중위권', createdAt: '2026-06-29 14:23:06.054+00' },
  { id: 'student-2', name: '황혜리', group: '중위권', createdAt: '2026-06-29 14:23:06.054+00' },
  { id: 'student-1782781087573', name: '이정', group: '중위권', createdAt: '2026-06-30 00:58:07.573+00' },
  { id: 'student-5', name: '엄호준', group: '중위권', createdAt: '2026-09-27 23:57:23.423+00' },
  { id: 'student-1790555167606', name: '강주연', group: '중위권', createdAt: '2026-09-28 00:26:07.606+00' },
  { id: 'student-3', name: '전성후', group: '1순위', createdAt: '2026-06-29 14:23:06.054+00' }
];

// 2. 초기 기본 지도 기록 (실제 운영 기록 100% 일치)
const INITIAL_RECORDS = [
  // 5월
  { id: '2026-05-06', date: '2026-05-06', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' } },
  { id: '2026-05-11', date: '2026-05-11', studentIds: ['student-1790555167606'], hours: { 'student-1790555167606': 1 }, notes: { 'student-1790555167606': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-05-13', date: '2026-05-13', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' } },
  { id: '2026-05-15', date: '2026-05-15', studentIds: ['student-1782781087573'], hours: { 'student-1782781087573': 1 }, notes: { 'student-1782781087573': '중위권 맞춤형 개별 지도 (1차시)' } },
  { id: '2026-05-18', date: '2026-05-18', studentIds: ['student-2', 'student-1782781087573'], hours: { 'student-2': 1, 'student-1782781087573': 1 }, notes: { 'student-2': '', 'student-1782781087573': '' } },
  { id: '2026-05-20', date: '2026-05-20', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' } },
  // 6월
  { id: '2026-06-01', date: '2026-06-01', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-06-05', date: '2026-06-05', studentIds: ['student-3', 'student-1790555167606'], hours: { 'student-3': 1, 'student-1790555167606': 1 }, notes: { 'student-3': '1순위 지도 (14:40~15:30, 1차시)', 'student-1790555167606': '1순위 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-06-08', date: '2026-06-08', studentIds: ['student-2', 'student-1782781087573'], hours: { 'student-2': 1, 'student-1782781087573': 1 }, notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-1782781087573': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' } },
  { id: '2026-06-10', date: '2026-06-10', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (13:50~14:30, 1차시)' } },
  { id: '2026-06-12', date: '2026-06-12', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-06-15', date: '2026-06-15', studentIds: ['student-2', 'student-1782781087573'], hours: { 'student-2': 1, 'student-1782781087573': 1 }, notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-1782781087573': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' } },
  { id: '2026-06-18', date: '2026-06-18', studentIds: ['student-2', 'student-1782781087573'], hours: { 'student-2': 1, 'student-1782781087573': 1 }, notes: { 'student-2': '중위권 맞춤형 지도 (14:40~15:20, 1차시)', 'student-1782781087573': '중위권 맞춤형 지도 (14:40~15:20, 1차시)' } },
  { id: '2026-06-19', date: '2026-06-19', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  // 7월
  { id: '2026-07-03', date: '2026-07-03', studentIds: ['student-3'], hours: { 'student-3': 1 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-07-06', date: '2026-07-06', studentIds: ['student-1782781087573'], hours: { 'student-1782781087573': 1 }, notes: { 'student-1782781087573': '중위권 맞춤형 개별 지도 (1차시)' } },
  { id: '2026-07-14', date: '2026-07-14', studentIds: ['student-1790555167606'], hours: { 'student-1790555167606': 1 }, notes: { 'student-1790555167606': '1순위 맞춤형 개별 지도 (14:40~15:30, 1차시)' } },
  { id: '2026-07-31', date: '2026-07-31', studentIds: ['student-2', 'student-1'], hours: { 'student-2': 4, 'student-1': 4 }, notes: { 'student-2': '중위권 지도 (09:00~12:10, 4차시)', 'student-1': '중위권 지도 (09:00~12:10, 4차시)' } },
  // 8월
  { id: '2026-08-04', date: '2026-08-04', studentIds: ['student-2', 'student-1'], hours: { 'student-2': 4, 'student-1': 4 }, notes: { 'student-2': '중위권 지도 (13:00~16:10, 4차시)', 'student-1': '중위권 지도 (13:00~16:10, 4차시)' } },
  { id: '2026-08-05', date: '2026-08-05', studentIds: ['student-2'], hours: { 'student-2': 4 }, notes: { 'student-2': '중위권 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-08-06', date: '2026-08-06', studentIds: ['student-3'], hours: { 'student-3': 4 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-08-07', date: '2026-08-07', studentIds: ['student-3'], hours: { 'student-3': 4 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-08-18', date: '2026-08-18', studentIds: ['student-2'], hours: { 'student-2': 4 }, notes: { 'student-2': '중위권 개별 지도 (13:00~16:10, 4차시)' } },
  { id: '2026-08-24', date: '2026-08-24', studentIds: ['student-1'], hours: { 'student-1': 4 }, notes: { 'student-1': '중위권 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-08-26', date: '2026-08-26', studentIds: ['student-1'], hours: { 'student-1': 4 }, notes: { 'student-1': '중위권 개별 지도 (13:00~16:10, 4차시)' } },
  { id: '2026-08-28', date: '2026-08-28', studentIds: ['student-5'], hours: { 'student-5': 4 }, notes: { 'student-5': '중위권 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-08-31', date: '2026-08-31', studentIds: ['student-2', 'student-1'], hours: { 'student-2': 4, 'student-1': 4 }, notes: { 'student-2': '중위권 지도 (09:00~12:10, 4차시)', 'student-1': '중위권 지도 (09:00~12:10, 4차시)' } },
  // 9월
  { id: '2026-09-04', date: '2026-09-04', studentIds: ['student-3'], hours: { 'student-3': 4 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' } },
  { id: '2026-09-07', date: '2026-09-07', studentIds: ['student-3'], hours: { 'student-3': 3 }, notes: { 'student-3': '1순위 맞춤형 개별 지도 (09:00~12:10, 4차시)' } }
];

interface DatabaseSchema {
  students: any[];
  records: any[];
  maxHoursMiddle: number;
  maxHoursFirst: number;
  version: number;
  updatedAt: string;
}

const sseClients: Response[] = [];

function notifyClients(version: number) {
  const data = `data: ${JSON.stringify({ version, timestamp: Date.now() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(data);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.records)) {
        return parsed;
      }
    } catch (e) {
      console.error('Error reading database file:', e);
    }
  }

  const defaultDb: DatabaseSchema = {
    students: INITIAL_STUDENTS,
    records: INITIAL_RECORDS,
    maxHoursMiddle: 40,
    maxHoursFirst: 40,
    version: 1,
    updatedAt: new Date().toISOString()
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(db: DatabaseSchema) {
  db.version = (db.version || 0) + 1;
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  notifyClients(db.version);
}

// ---------------- API Routes ----------------

// 1. 전체 데이터 로드
app.get('/api/data', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({
    success: true,
    students: db.students,
    records: db.records,
    maxHoursMiddle: db.maxHoursMiddle ?? 40,
    maxHoursFirst: db.maxHoursFirst ?? 40,
    version: db.version,
    updatedAt: db.updatedAt
  });
});

// 2. 버전 확인 (0.5초 경량 폴링용)
app.get('/api/version', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ version: db.version, updatedAt: db.updatedAt });
});

// 3. 실시간 SSE 스트림
app.get('/api/realtime', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const db = loadDatabase();
  res.write(`data: ${JSON.stringify({ version: db.version, connected: true })}\n\n`);

  sseClients.push(res);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 4. 단일 기록 저장 (Upsert)
app.post('/api/records', (req: Request, res: Response) => {
  const incoming = req.body.record || req.body;
  if (!incoming || !incoming.date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }

  const db = loadDatabase();
  const existingIdx = db.records.findIndex(r => r.date === incoming.date);

  const cleanRecord = {
    id: incoming.date,
    date: incoming.date,
    studentIds: incoming.studentIds || incoming.student_ids || [],
    hours: incoming.hours || {},
    notes: incoming.notes || {},
    updatedAt: incoming.updatedAt || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.records[existingIdx] = cleanRecord;
  } else {
    db.records.push(cleanRecord);
  }

  saveDatabase(db);
  res.json({ success: true, version: db.version, record: cleanRecord });
});

// 5. 여러 기록 배치 저장
app.post('/api/records/batch', (req: Request, res: Response) => {
  const incomingRecords: any[] = req.body.records || [];
  if (!Array.isArray(incomingRecords)) {
    res.status(400).json({ error: 'records array required' });
    return;
  }

  const db = loadDatabase();
  for (const inc of incomingRecords) {
    if (!inc || !inc.date) continue;
    const idx = db.records.findIndex(r => r.date === inc.date);
    const cleanRecord = {
      id: inc.date,
      date: inc.date,
      studentIds: inc.studentIds || inc.student_ids || [],
      hours: inc.hours || {},
      notes: inc.notes || {},
      updatedAt: inc.updatedAt || new Date().toISOString()
    };
    if (idx >= 0) {
      db.records[idx] = cleanRecord;
    } else {
      db.records.push(cleanRecord);
    }
  }

  saveDatabase(db);
  res.json({ success: true, version: db.version, count: incomingRecords.length });
});

// 6. 학생 명단 전체 저장
app.post('/api/students', (req: Request, res: Response) => {
  const incomingStudents = req.body.students;
  if (!Array.isArray(incomingStudents)) {
    res.status(400).json({ error: 'students array required' });
    return;
  }

  const db = loadDatabase();
  db.students = incomingStudents;
  saveDatabase(db);
  res.json({ success: true, version: db.version, count: db.students.length });
});

// 7. 시수 설정 저장
app.post('/api/settings', (req: Request, res: Response) => {
  const { maxHoursMiddle, maxHoursFirst } = req.body;
  const db = loadDatabase();
  if (typeof maxHoursMiddle === 'number') db.maxHoursMiddle = maxHoursMiddle;
  if (typeof maxHoursFirst === 'number') db.maxHoursFirst = maxHoursFirst;
  saveDatabase(db);
  res.json({ success: true, version: db.version });
});

// 8. 학교 컴퓨터 -> 서버 전체 동기화 엔드포인트
app.post('/api/sync', (req: Request, res: Response) => {
  const { students, records, maxHoursMiddle, maxHoursFirst } = req.body;
  const db = loadDatabase();

  if (Array.isArray(students) && students.length > 0) {
    db.students = students;
  }
  if (Array.isArray(records) && records.length > 0) {
    // Merge records by date
    const map = new Map<string, any>();
    for (const r of db.records) map.set(r.date, r);
    for (const r of records) map.set(r.date, r);
    db.records = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  if (typeof maxHoursMiddle === 'number') db.maxHoursMiddle = maxHoursMiddle;
  if (typeof maxHoursFirst === 'number') db.maxHoursFirst = maxHoursFirst;

  saveDatabase(db);
  res.json({
    success: true,
    version: db.version,
    students: db.students,
    records: db.records,
    maxHoursMiddle: db.maxHoursMiddle,
    maxHoursFirst: db.maxHoursFirst
  });
});

// ---------------- Vite / Static Serving ----------------

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Elementary Growth Calendar Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
