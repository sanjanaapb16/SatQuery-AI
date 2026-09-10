import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'

export type SessionRecord = {
  id?: string
  ownerId: string
  title: string
  query: string
  mode: string
  files: string[]
  route: string
  createdAt?: unknown
}

export async function saveAnalysisSession(record: SessionRecord) {
  if (!db) return null
  const result = await addDoc(collection(db, 'analysisSessions'), { ...record, createdAt: serverTimestamp() })
  return result.id
}

export async function listAnalysisSessions(ownerId: string) {
  if (!db) return []
  const sessions = await getDocs(query(collection(db, 'analysisSessions'), orderBy('createdAt', 'desc')))
  const records = sessions.docs.map((item) => ({ id: item.id, ...item.data() })) as SessionRecord[]
  return records.filter((item) => item.ownerId === ownerId)
}

export async function uploadAnalysisFile(ownerId: string, file: File) {
  if (!storage) return { name: file.name, url: URL.createObjectURL(file) }
  const fileRef = ref(storage, `users/${ownerId}/imagery/${crypto.randomUUID()}-${file.name}`)
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' })
  return { name: file.name, url: await getDownloadURL(fileRef) }
}

export async function saveAnalysisResult(sessionId: string, result: Record<string, unknown>) {
  if (!db) return
  await setDoc(doc(db, 'analysisSessions', sessionId, 'results', 'latest'), { ...result, updatedAt: serverTimestamp() })
}

export function queueOfflineAnalysis(payload: SessionRecord) {
  const queue = JSON.parse(localStorage.getItem('satquery-offline-queue') || '[]') as SessionRecord[]
  localStorage.setItem('satquery-offline-queue', JSON.stringify([...queue, payload]))
}

export function getOfflineQueue() {
  return JSON.parse(localStorage.getItem('satquery-offline-queue') || '[]') as SessionRecord[]
}
