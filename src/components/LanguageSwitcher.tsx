'use client'

import type { Locale } from '@/i18n'
import { saveLocale } from '@/i18n'

interface Props {
  locale: Locale
  onChange: (locale: Locale) => void
}

export function LanguageSwitcher({ locale, onChange }: Props) {
  const toggle = () => {
    const next: Locale = locale === 'ar' ? 'fr' : 'ar'
    saveLocale(next)
    onChange(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      aria-label="Switch language"
    >
      <span className="text-base leading-none">{locale === 'ar' ? '🇫🇷' : '🇩🇿'}</span>
      <span>{locale === 'ar' ? 'Français' : 'العربية'}</span>
    </button>
  )
}
