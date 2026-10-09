const database = 'baeugo-local-video-v1'
const store = 'videos'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveVideo(id: string, blob: Blob): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}

export async function readVideo(id: string): Promise<Blob | undefined> {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(id)
      request.onsuccess = () => resolve(request.result as Blob | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}

export function inspectVideo(file: File): Promise<number> {
  if (!file.type.startsWith('video/')) return Promise.reject(new Error('영상 파일만 등록할 수 있습니다.'))
  if (file.size > 200 * 1024 * 1024) return Promise.reject(new Error('200MB 이하 영상만 등록할 수 있습니다.'))
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const finish = () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url) }
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = video.duration
      const valid = video.videoWidth > 0 && video.videoHeight > 0 && Number.isFinite(duration) && duration > 0
      finish()
      if (valid) resolve(duration)
      else reject(new Error('영상 스트림이나 재생 시간을 확인할 수 없습니다.'))
    }
    video.onerror = () => { finish(); reject(new Error('재생 가능한 영상이 아닙니다. 다른 파일을 선택해 주세요.')) }
    video.src = url
  })
}
