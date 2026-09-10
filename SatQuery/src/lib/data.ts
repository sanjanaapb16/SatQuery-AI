import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import type { SessionRecord, ProjectRecord, AnnotationRecord, ReportRecord, NotificationRecord, UserProfile } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — Firebase Data Layer
// ─────────────────────────────────────────────────────────────────────────────

// ─── Analysis Sessions ────────────────────────────────────────────────────────

export async function saveAnalysisSession(record: SessionRecord): Promise<string | null> {
  if (!db) return null
  const result = await addDoc(collection(db, 'analysisSessions'), { ...record, createdAt: serverTimestamp() })
  return result.id
}

export async function listAnalysisSessions(ownerId: string): Promise<SessionRecord[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'analysisSessions'), orderBy('createdAt', 'desc'), limit(50)))
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SessionRecord)
    .filter((s) => s.ownerId === ownerId)
}

export function subscribeToSessions(ownerId: string, cb: (sessions: SessionRecord[]) => void) {
  if (!db) { cb([]); return () => {} }
  return onSnapshot(
    query(collection(db, 'analysisSessions'), orderBy('createdAt', 'desc'), limit(30)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionRecord).filter((s) => s.ownerId === ownerId))
  )
}

export async function deleteSession(sessionId: string) {
  if (!db) return
  await deleteDoc(doc(db, 'analysisSessions', sessionId))
}

export async function renameSession(sessionId: string, title: string) {
  if (!db) return
  await updateDoc(doc(db, 'analysisSessions', sessionId), { title })
}

// ─── Analysis Results ─────────────────────────────────────────────────────────

export async function saveAnalysisResult(sessionId: string, result: Record<string, unknown>) {
  if (!db) return
  await setDoc(doc(db, 'analysisSessions', sessionId, 'results', 'latest'), { ...result, updatedAt: serverTimestamp() })
}

// ─── File Upload ──────────────────────────────────────────────────────────────

export async function uploadAnalysisFile(ownerId: string, file: File): Promise<{ name: string; url: string }> {
  if (!storage) return { name: file.name, url: URL.createObjectURL(file) }
  const fileRef = ref(storage, `users/${ownerId}/imagery/${crypto.randomUUID()}-${file.name}`)
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' })
  return { name: file.name, url: await getDownloadURL(fileRef) }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(record: ProjectRecord): Promise<string | null> {
  if (!db) return null
  const result = await addDoc(collection(db, 'projects'), { ...record, createdAt: serverTimestamp() })
  return result.id
}

export async function listProjects(ownerId: string): Promise<ProjectRecord[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc')))
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectRecord)
    .filter((p) => p.ownerId === ownerId || p.memberIds?.includes(ownerId))
}

// ─── Annotations ──────────────────────────────────────────────────────────────

export async function saveAnnotation(annotation: AnnotationRecord): Promise<string | null> {
  if (!db) return null
  const result = await addDoc(collection(db, 'annotations'), { ...annotation, createdAt: serverTimestamp() })
  return result.id
}

export function subscribeToAnnotations(sessionId: string, cb: (annotations: AnnotationRecord[]) => void) {
  if (!db) { cb([]); return () => {} }
  return onSnapshot(
    query(collection(db, 'annotations'), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnnotationRecord).filter((a) => a.sessionId === sessionId))
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function saveReport(record: ReportRecord): Promise<string | null> {
  if (!db) return null
  const result = await addDoc(collection(db, 'reports'), { ...record, createdAt: serverTimestamp() })
  return result.id
}

export async function listReports(ownerId: string): Promise<ReportRecord[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(30)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ReportRecord).filter((r) => r.ownerId === ownerId)
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function addNotification(notification: NotificationRecord) {
  if (!db) return
  await addDoc(collection(db, 'notifications'), { ...notification, createdAt: serverTimestamp() })
}

export function subscribeToNotifications(userId: string, cb: (notifications: NotificationRecord[]) => void) {
  if (!db) { cb([]); return () => {} }
  return onSnapshot(
    query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationRecord).filter((n) => n.userId === userId))
  )
}

export async function markNotificationRead(notifId: string) {
  if (!db) return
  await updateDoc(doc(db, 'notifications', notifId), { read: true })
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function saveUserProfile(profile: UserProfile) {
  if (!db) return
  await setDoc(doc(db, 'users', profile.uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null
  const snapshot = await getDocs(query(collection(db, 'users'), limit(1)))
  const found = snapshot.docs.find((d) => d.id === uid)
  return found ? ({ uid: found.id, ...found.data() }) as UserProfile : null
}

// ─── Offline Queue ────────────────────────────────────────────────────────────

const OFFLINE_KEY = 'satquery-offline-queue'

export function queueOfflineAnalysis(payload: SessionRecord) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') as SessionRecord[]
  localStorage.setItem(OFFLINE_KEY, JSON.stringify([...queue, { ...payload, queuedAt: Date.now() }]))
}

export function getOfflineQueue(): SessionRecord[] {
  return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]')
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_KEY)
}

export async function flushOfflineQueue(ownerId: string): Promise<number> {
  const queue = getOfflineQueue().filter((item) => item.ownerId === ownerId)
  let flushed = 0
  for (const item of queue) {
    try {
      await saveAnalysisSession(item)
      flushed++
    } catch { /* skip */ }
  }
  clearOfflineQueue()
  return flushed
}

// ─── Collaboration ────────────────────────────────────────────────────────────

export function subscribeToCollaboration(sessionId: string, cb: (presences: Record<string, unknown>[]) => void) {
  if (!db) { cb([]); return () => {} }
  return onSnapshot(
    collection(db, 'analysisSessions', sessionId, 'presence'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
  )
}

export async function updatePresence(sessionId: string, uid: string, data: Record<string, unknown>) {
  if (!db) return
  await setDoc(doc(db, 'analysisSessions', sessionId, 'presence', uid), { ...data, lastSeen: Date.now() }, { merge: true })
}
