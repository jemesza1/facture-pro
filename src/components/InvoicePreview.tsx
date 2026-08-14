'use client'

import type { Company, Client, LineItem } from '@/lib/types'
import type { Locale, Dict } from '@/i18n'
import { t } from '@/i18n'
import { calcTotals, amountInWordsFr, amountInWordsAr, formatMoney, lineTotal } from '@/lib/calculations'

interface Props {
  company: Company
  client: Client | null
  items: LineItem[]
  number: string
  date: string
  dueDate: string
  notes: string
  discount?: number
  locale: Locale
  dict: Dict
  previewRef?: React.RefObject<HTMLDivElement>
}

export function InvoicePreview({
  company, client, items, number, date, dueDate, notes, discount = 0, locale, dict, previewRef,
}: Props) {
  const totals = calcTotals(items, discount)
  const words = locale === 'ar' ? amountInWordsAr(totals.ttc) : amountInWordsFr(totals.ttc)
  const isRtl = locale === 'ar'
  const font = isRtl ? 'font-arabic' : 'font-sans'

  const fmtDate = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <div
      ref={previewRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${font} mx-auto w-full max-w-[210mm] bg-white text-slate-900 shadow-xl`}
      style={{ minHeight: '297mm' }}
    >
      <div className="h-1.5 bg-gradient-to-r from-sky-500 to-sky-700" />
      <div className="space-y-6 p-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {company.logo && (
              <img src={company.logo} alt="" className="h-14 w-auto max-w-[100px] object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{company.name || '—'}</h1>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-500">{company.address}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                {t(dict, 'company.nif')} : {company.nif || '—'} | {t(dict, 'company.nis')} : {company.nis || '—'}<br />
                {t(dict, 'company.rc')} : {company.rc || '—'}{company.ai ? ` | ${t(dict, 'company.ai')} : ${company.ai}` : ''}
              </p>
            </div>
          </div>
          <div className={isRtl ? 'text-start' : 'text-end'}>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900">{t(dict, 'invoice.title')}</p>
            <p className="mt-1 text-sm text-slate-500">{number || '—'}</p>
            <div className="mt-3 space-y-0.5 text-xs text-slate-600">
              <p>{t(dict, 'invoice.date')} : <strong>{fmtDate(date)}</strong></p>
              <p>{t(dict, 'invoice.dueDate')} : <strong>{fmtDate(dueDate)}</strong></p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t(dict, 'invoice.billedTo')}</p>
          <p className="mt-1 font-semibold text-slate-900">{client?.name || '—'}</p>
          {client?.address && <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">{client.address}</p>}
          {client?.nif && <p className="mt-1 text-[11px] text-slate-400">{t(dict, 'company.nif')} : {client.nif}</p>}
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="px-3 py-2.5 text-start font-semibold">{t(dict, 'invoice.description')}</th>
              <th className="w-14 px-2 py-2.5 text-center font-semibold">{t(dict, 'invoice.qty')}</th>
              <th className="w-24 px-2 py-2.5 text-end font-semibold">{t(dict, 'invoice.unitPrice')}</th>
              <th className="w-14 px-2 py-2.5 text-center font-semibold">{t(dict, 'invoice.vat')}</th>
              <th className="w-24 px-2 py-2.5 text-end font-semibold">{t(dict, 'invoice.totalHt')}</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((i) => i.description).map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-slate-800">{item.description}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{item.qty}</td>
                <td className="px-2 py-2.5 text-end text-slate-600">{formatMoney(item.unitPrice, locale)}</td>
                <td className="px-2 py-2.5 text-center text-slate-600">{item.tva}%</td>
                <td className="px-2 py-2.5 text-end font-medium text-slate-800">{formatMoney(lineTotal(item), locale)}</td>
              </tr>
            ))}
            {items.filter((i) => i.description).length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">—</td></tr>
            )}
          </tbody>
        </table>

        <div className={`flex ${isRtl ? 'justify-start' : 'justify-end'}`}>
          <div className="w-56 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{t(dict, 'invoice.subtotal')}</span>
              <span>{formatMoney(totals.ht, locale)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{t(dict, 'invoice.discount')} ({discount}%)</span>
                <span>-{formatMoney(totals.discount, locale)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>{t(dict, 'invoice.totalVat')}</span>
              <span>{formatMoney(totals.tva, locale)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-bold text-slate-900">
              <span>{t(dict, 'invoice.totalTtc')}</span>
              <span>{formatMoney(totals.ttc, locale)}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] italic text-slate-500">
          {t(dict, 'invoice.amountInWords')} : <strong>{words}</strong>
        </p>

        <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          {notes && <p className="mb-2"><strong>{t(dict, 'invoice.notes')} :</strong> {notes}</p>}
          <p>{t(dict, 'company.rib')} : {company.rib || '—'} | {company.banque}</p>
          <p className="mt-2 text-[10px] text-slate-400">
            {company.name} — {t(dict, 'company.nif')} {company.nif} — {t(dict, 'company.rc')} {company.rc}
          </p>
        </div>
      </div>
    </div>
  )
}
