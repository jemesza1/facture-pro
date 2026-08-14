import type { LineItem } from './types'

export function lineTotal(item: LineItem): number {
  return (item.qty || 0) * (item.unitPrice || 0)
}

export function calcTotals(items: LineItem[], discountPercent = 0) {
  let ht = 0
  let tva = 0
  for (const it of items) {
    const line = lineTotal(it)
    ht += line
    tva += line * ((it.tva || 0) / 100)
  }
  const discount = ht * ((discountPercent || 0) / 100)
  const htAfter = ht - discount
  const tvaAfter = tva * (1 - (discountPercent || 0) / 100)
  return { ht, discount, htAfter, tva: tvaAfter, ttc: htAfter + tvaAfter }
}

export function amountInWordsFr(amount: number): string {
  const n = Math.round(amount || 0)
  if (n === 0) return 'Zéro dinar'
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
  function under1000(num: number): string {
    if (num < 20) return units[num]
    if (num < 100) {
      const t = Math.floor(num / 10), u = num % 10
      if (t === 7 || t === 9) return tens[t] + (u === 1 && t === 7 ? ' et ' : '-') + under1000(10 + u)
      return tens[t] + (u === 1 && t !== 8 ? ' et ' : u ? '-' : '') + (t === 8 && u === 0 ? 's' : units[u])
    }
    const h = Math.floor(num / 100), r = num % 100
    return (h > 1 ? units[h] + ' ' : '') + 'cent' + (h > 1 && r === 0 ? 's' : '') + (r ? ' ' + under1000(r) : '')
  }
  function words(num: number): string {
    if (num < 1000) return under1000(num)
    if (num < 1_000_000) {
      const th = Math.floor(num / 1000), r = num % 1000
      return (th > 1 ? under1000(th) + ' ' : '') + 'mille' + (r ? ' ' + under1000(r) : '')
    }
    if (num < 1_000_000_000) {
      const m = Math.floor(num / 1_000_000), r = num % 1_000_000
      return under1000(m) + ' million' + (m > 1 ? 's' : '') + (r ? ' ' + words(r) : '')
    }
    return String(num)
  }
  const w = words(n)
  return w.charAt(0).toUpperCase() + w.slice(1) + ' dinars'
}

export function amountInWordsAr(amount: number): string {
  return `${new Intl.NumberFormat('ar-DZ').format(Math.round(amount || 0))} دينار جزائري`
}

export function formatMoney(amount: number, locale: 'fr' | 'ar' = 'fr'): string {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(amount || 0)
  return formatted.replace('DZD', locale === 'ar' ? 'د.ج' : 'DA')
}
