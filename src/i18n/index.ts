import fr from './fr.json'
import ar from './ar.json'

export type Locale = 'fr' | 'ar'
export type Dict = typeof fr

const dicts: Record<Locale, Dict> = { fr, ar }

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? fr
}

export function t(dict: Dict, path: string): string {
  const parts = path.split('.')
  let cur: unknown = dict
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : path
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function loadLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'
  return localStorage.getItem('fp_locale') === 'ar' ? 'ar' : 'fr'
}

export function saveLocale(locale: Locale) {
  if (typeof window === 'undefined') return
  localStorage.setItem('fp_locale', locale)
  document.documentElement.lang = locale
  document.documentElement.dir = dir(locale)
}
