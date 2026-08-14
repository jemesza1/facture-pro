export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'enretard' | 'annulee'

export interface Company {
  name: string
  address: string
  nif: string
  nis: string
  rc: string
  ai: string
  email: string
  phone: string
  rib: string
  banque: string
  logo?: string
}

export interface Client {
  id: string
  name: string
  email: string
  address: string
  nif: string
  phone: string
}

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  tva: number
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  template: string
  date: string
  dueDate: string
  status: InvoiceStatus
  items: LineItem[]
  notes: string
  discount?: number
}

export interface AppState {
  company: Company
  clients: Client[]
  invoices: Invoice[]
  nextInvoiceNumber: number
}
