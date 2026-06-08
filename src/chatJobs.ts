export interface ChatJob {
  id: string;
  status: 'pending' | 'streaming' | 'done' | 'error';
  chunks: string[];
  fullText: string;
  workoutUpdated: boolean;
  error?: string;
  userId: number;
  createdAt: number;
}

const jobs = new Map<string, ChatJob>();
let gcCounter = 0;

function gc() {
  const now = Date.now();
  for (const [key, job] of jobs) {
    if (now - job.createdAt > 3600000) jobs.delete(key);
  }
}

export function createJob(userId: number): string {
  const id = crypto.randomUUID();
  jobs.set(id, {
    id, status: 'pending', chunks: [], fullText: '',
    workoutUpdated: false, userId, createdAt: Date.now()
  });
  gcCounter++;
  if (gcCounter % 50 === 0) gc();
  return id;
}

export function getJob(id: string, userId: number): ChatJob | undefined {
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return undefined;
  return job;
}

export function appendChunk(id: string, chunk: string) {
  const job = jobs.get(id);
  if (job) { job.chunks.push(chunk); job.fullText += chunk; job.status = 'streaming'; }
}

export function finishJob(id: string, workoutUpdated: boolean) {
  const job = jobs.get(id);
  if (job) { job.status = 'done'; job.workoutUpdated = workoutUpdated; }
}

export function failJob(id: string, error: string) {
  const job = jobs.get(id);
  if (job) { job.status = 'error'; job.error = error; }
}
