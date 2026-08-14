'use client'

/**
 * FacturePro — Main Split-Screen Page
 * Client-side only. All data in localStorage.
 * Privacy: never sent to any server.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { InvoiceForm } from '@/components/InvoiceForm'
import { InvoicePreview } from '@/components/InvoicePreview'
import { useAppState, newLineItem } from '@/hooks/useAppState'
import { getDict, loadLocale, saveLocale, dir, type Locale } from '@/i18n'
import { downloadInvoicePdf, printInvoice } from '@/lib/pdf'
import type { LineItem } from '@/lib/types'

export default function HomePage() {
  const { state, ready, updateCompany, createInvoice } = useAppState()
  const [locale, setLocale] = useState<Locale>('fr')
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<LineItem[]>([newLineItem()])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('Paiement par virement bancaire.')
  const [discount, setDiscount] = useState(0)
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form')
  const previewRef = useRef<HTMLDivElement>(null)

  const dict = useMemo(() => getDict(locale), [locale])

  useEffect(() => {
    const loc = loadLocale()
    setLocale(loc)
    saveLocale(loc)
  }, [])

  useEffect(() => {
    document.documentElement.dir = dir(locale)
    document.documentElement.lang = locale
  }, [locale])

  const client = state.clients.find((c) => c.id === clientId) ?? null
  const invoiceNumber = `FP-${new Date().getFullYear()}-${String(state.nextInvoiceNumber).padStart(3, '0')}`

  const handleSave = () => {
    if (!clientId) {
      alert(locale === 'ar' ? 'اختر عميلاً' : 'Choisissez un client')
      return
    }
    if (!items.some((i) => i.description.trim())) {
      alert(locale === 'ar' ? 'أضف سطراً' : 'Ajoutez une ligne')
      return
    }
    createInvoice({
      clientId,
      template: 'moderne',
      date,
      dueDate,
      status: 'brouillon',
      items,
      notes,
      discount,
    })
    alert(locale === 'ar' ? 'تم الحفظ' : 'Facture enregistrée')
  }

  const handlePdf = async () => {
    if (!previewRef.current) return
    await downloadInvoicePdf(previewRef.current, invoiceNumber)
  }

  const handlePrint = () => {
    if (!previewRef.current) return
    printInvoice(previewRef.current)
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      dir={dir(locale)}
      className={`flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950 ${
        locale === 'ar' ? 'font-arabic' : 'font-sans'
      }`}
    >
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-sm font-bold text-white shadow-lg shadow-sky-500/20">
            FP
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {dict.app.name}
            </h1>
            <p className="text-[11px] text-slate-500">{dict.app.tagline}</p>
          </div>
        </div>
        <LanguageSwitcher locale={locale} onChange={setLocale} />
      </header>

      <div className="flex border-b border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            mobileTab === 'form' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-slate-500'
          }`}
        >
          {locale === 'ar' ? 'النموذج' : 'Formulaire'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            mobileTab === 'preview' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-slate-500'
          }`}
        >
          {locale === 'ar' ? 'المعاينة' : 'Aperçu'}
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden">
        <aside
          className={`w-full border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:w-[420px] lg:shrink-0 lg:border-e ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <InvoiceForm
            company={state.company}
            onCompanyChange={updateCompany}
            clients={state.clients}
            clientId={clientId}
            onClientIdChange={setClientId}
            items={items}
            onItemsChange={setItems}
            date={date}
            dueDate={dueDate}
            notes={notes}
            discount={discount}
            onDateChange={setDate}
            onDueDateChange={setDueDate}
            onNotesChange={setNotes}
            onDiscountChange={setDiscount}
            locale={locale}
            dict={dict}
            onSave={handleSave}
            onPdf={handlePdf}
            onPrint={handlePrint}
          />
        </aside>

        <section
          className={`flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-8 dark:bg-slate-900 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <InvoicePreview
            company={state.company}
            client={client}
            items={items}
            number={invoiceNumber}
            date={date}
            dueDate={dueDate}
            notes={notes}
            discount={discount}
            locale={locale}
            dict={dict}
            previewRef={previewRef}
          />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950">
        {locale === 'ar'
          ? 'بياناتك تُعالَج محليًا في متصفحك ولا تُخزَّن أبدًا على خوادمنا.'
          : 'Your data is processed locally in your browser and is never stored on our servers.'}
      </footer>
    </div>
  )
}
