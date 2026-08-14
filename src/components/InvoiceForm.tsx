'use client'

import type { Company, Client, LineItem } from '@/lib/types'
import type { Locale, Dict } from '@/i18n'
import { t } from '@/i18n'
import { LogoUpload } from './LogoUpload'
import { newLineItem } from '@/hooks/useAppState'
import { calcTotals, formatMoney } from '@/lib/calculations'

interface Props {
  company: Company
  onCompanyChange: (c: Company) => void
  clients: Client[]
  clientId: string
  onClientIdChange: (id: string) => void
  items: LineItem[]
  onItemsChange: (items: LineItem[]) => void
  date: string
  dueDate: string
  notes: string
  discount: number
  onDateChange: (v: string) => void
  onDueDateChange: (v: string) => void
  onNotesChange: (v: string) => void
  onDiscountChange: (v: number) => void
  locale: Locale
  dict: Dict
  onSave: () => void
  onPdf: () => void
  onPrint: () => void
}

export function InvoiceForm({
  company, onCompanyChange, clients, clientId, onClientIdChange,
  items, onItemsChange, date, dueDate, notes, discount,
  onDateChange, onDueDateChange, onNotesChange, onDiscountChange,
  locale, dict, onSave, onPdf, onPrint,
}: Props) {
  const totals = calcTotals(items, discount)

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    onItemsChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    onItemsChange(items.filter((it) => it.id !== id))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{t(dict, 'company.name')}</h2>
          <LogoUpload label={t(dict, 'company.logo')} value={company.logo} onChange={(logo) => onCompanyChange({ ...company, logo })} />
          <input className="form-input" placeholder={t(dict, 'company.name')} value={company.name} onChange={(e) => onCompanyChange({ ...company, name: e.target.value })} />
          <textarea className="form-input" rows={2} placeholder={t(dict, 'company.address')} value={company.address} onChange={(e) => onCompanyChange({ ...company, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="form-input" placeholder={t(dict, 'company.nif')} value={company.nif} onChange={(e) => onCompanyChange({ ...company, nif: e.target.value })} />
            <input className="form-input" placeholder={t(dict, 'company.nis')} value={company.nis} onChange={(e) => onCompanyChange({ ...company, nis: e.target.value })} />
            <input className="form-input" placeholder={t(dict, 'company.rc')} value={company.rc} onChange={(e) => onCompanyChange({ ...company, rc: e.target.value })} />
            <input className="form-input" placeholder={t(dict, 'company.ai')} value={company.ai} onChange={(e) => onCompanyChange({ ...company, ai: e.target.value })} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{t(dict, 'invoice.client')}</h2>
          <select className="form-select" value={clientId} onChange={(e) => onClientIdChange(e.target.value)}>
            <option value="">—</option>
            {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">{t(dict, 'invoice.date')}</label>
              <input type="date" className="form-input" value={date} onChange={(e) => onDateChange(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t(dict, 'invoice.dueDate')}</label>
              <input type="date" className="form-input" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{t(dict, 'invoice.description')}</h2>
            <button type="button" onClick={() => onItemsChange([...items, newLineItem()])} className="text-sm font-medium text-sky-600 hover:underline">
              + {t(dict, 'actions.addLine')}
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="col-span-12 sm:col-span-5">
                  <input className="form-input text-sm" placeholder={t(dict, 'invoice.description')} value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input type="number" min={0} className="form-input text-sm" placeholder={t(dict, 'invoice.qty')} value={item.qty} onChange={(e) => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min={0} className="form-input text-sm" placeholder={t(dict, 'invoice.unitPrice')} value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <select className="form-select text-sm" value={item.tva} onChange={(e) => updateItem(item.id, { tva: parseFloat(e.target.value) })}>
                    <option value={19}>19%</option>
                    <option value={9}>9%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                  <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Remove">×</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <label className="form-label">{t(dict, 'invoice.discount')} (%)</label>
            <input type="number" min={0} max={100} className="form-input" value={discount} onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label">{t(dict, 'invoice.notes')}</label>
            <textarea className="form-input" rows={2} value={notes} onChange={(e) => onNotesChange(e.target.value)} />
          </div>
        </section>

        <div className="rounded-xl bg-slate-900 p-4 text-white dark:bg-slate-800">
          <div className="flex justify-between text-sm opacity-80">
            <span>{t(dict, 'invoice.subtotal')}</span>
            <span>{formatMoney(totals.ht, locale)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm opacity-80">
            <span>{t(dict, 'invoice.totalVat')}</span>
            <span>{formatMoney(totals.tva, locale)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-lg font-bold">
            <span>{t(dict, 'invoice.totalTtc')}</span>
            <span>{formatMoney(totals.ttc, locale)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <button type="button" onClick={onSave} className="btn-primary flex-1">{t(dict, 'actions.save')}</button>
        <button type="button" onClick={onPdf} className="btn-secondary">{t(dict, 'actions.downloadPdf')}</button>
        <button type="button" onClick={onPrint} className="btn-secondary">{t(dict, 'actions.print')}</button>
      </div>
    </div>
  )
}
