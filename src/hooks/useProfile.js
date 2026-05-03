const KEY = 'bk_profile'

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile))
}

export function clearProfile() {
  localStorage.removeItem(KEY)
}
