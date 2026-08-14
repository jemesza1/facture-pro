/**
 * FacturePro — Client-side only persistence
 * All data stays in the user's browser (localStorage).
 * Nothing is sent to any server.
 */

import type { AppState, Company } from './types'

const KEY = 'facturepro_saas_v1'

export const defaultCompany: Company = {
  name: 'Mon Entreprise SARL',
  address: '12 Rue Didouche Mourad\n16000 Alger',
  nif: '000000000000000',
  nis: '000000000000000',
  rc: '16/00-0000000B00',
  ai: '0000',
  email: 'contact@monentreprise.dz',
  phone: '+213 21 00 00 00',
  rib: '007 99999 0000000000 00',
  banque: 'BNA',
  logo: undefined,
}

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { company: defaultCompany, clients: [], invoices: [], nextInvoiceNumber: 1 }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw) as Partial<AppState>
      return {
        company: { ...defaultCompany, ...data.company },
        clients: data.clients ?? [],
        invoices: data.invoices ?? [],
        nextInvoiceNumber: data.nextInvoiceNumber ?? 1,
      }
    }
  } catch {
    /* ignore */
  }
  return { company: defaultCompany, clients: [], invoices: [], nextInvoiceNumber: 1 }
}

export function saveState(state: AppState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    KEY,
    JSON.stringify({
      company: state.company,
      clients: state.clients,
      invoices: state.invoices,
      nextInvoiceNumber: state.nextInvoiceNumber,
    })
  )
}

export function exportJson(state: AppState) {
  const blob = new Blob(
    [JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  )
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `facturepro-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}

export function nextNumber(seq: number, year = new Date().getFullYear()) {
  return `FP-${year}-${String(seq).padStart(3, '0')}`
}
