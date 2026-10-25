/**
 * Abstraction lưu trữ: localStorage có thể không dùng được (PLAN.md mục 8),
 * mọi lệnh ghi/đọc save đều đi qua interface này.
 */
export interface Storage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Bộ nhớ tạm — mock cho test và fallback khi localStorage bị chặn. */
export function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value)
    },
    remove: (key) => {
      map.delete(key)
    },
  }
}

/** Adapter localStorage của trình duyệt; ném lỗi nếu bị chặn. */
export function localStorageAdapter(): Storage {
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => {
      window.localStorage.setItem(key, value)
    },
    remove: (key) => {
      window.localStorage.removeItem(key)
    },
  }
}

/** localStorage nếu dùng được, ngược lại bộ nhớ tạm (QA mục 8). */
export function safeStorage(): Storage {
  try {
    const adapter = localStorageAdapter()
    const probe = '__ghr_probe__'
    adapter.set(probe, '1')
    adapter.remove(probe)
    return adapter
  } catch {
    return memoryStorage()
  }
}
