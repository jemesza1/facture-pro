/**
 * FacturePro — Client-side only persistence
 * All data stays in the user's browser (localStorage).
 * Nothing is sent to any server.
 */

import type { AppState, Company, Client } from './types'

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

const demoClients: Client[] = [
  { id: 'c1', name: 'SARL Atlas Services', email: 'contact@atlas.dz', address: '45 Bd Mohamed V\n16000 Alger', nif: '099999999999999', phone: '021 00 00 01' },
  { id: 'c2', name: 'EURL Sahara Tech', email: 'info@sahara.dz', address: '8 Rue de la Liberté\n31000 Oran', nif: '088888888888888', phone: '041 00 00 02' },
  { id: 'c3', name: 'SPA Numidia Trading', email: 'admin@numidia.dz', address: '22 Av de l\'Indépendance\n25000 Constantine', nif: '077777777777777', phone: '031 00 00 03' },
]

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { company: defaultCompany, clients: demoClients, invoices: [], nextInvoiceNumber: 1 }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw) as Partial<AppState>
      return {
        company: { ...defaultCompany, ...data.company },
        clients: data.clients?.length ? data.clients : demoClients,
        invoices: data.invoices ?? [],
        nextInvoiceNumber: data.nextInvoiceNumber ?? 1,
      }
    }
  } catch {
    /* ignore */
  }
  return { company: defaultCompany, clients: demoClients, invoices: [], nextInvoiceNumber: 1 }
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
