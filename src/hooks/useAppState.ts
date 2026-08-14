'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AppState, Company, Client, Invoice, LineItem } from '@/lib/types'
import { loadState, saveState, defaultCompany, nextNumber } from '@/lib/storage'

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 11)
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    company: defaultCompany,
    clients: [],
    invoices: [],
    nextInvoiceNumber: 1,
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setState(loadState())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  const updateCompany = useCallback((company: Company) => {
    setState((s) => ({ ...s, company }))
  }, [])

  const addClient = useCallback((data: Omit<Client, 'id'>) => {
    setState((s) => ({
      ...s,
      clients: [...s.clients, { ...data, id: uid() }],
    }))
  }, [])

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
  }, [])

  const deleteClient = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      clients: s.clients.filter((c) => c.id !== id),
    }))
  }, [])

  const createInvoice = useCallback(
    (data: Omit<Invoice, 'id' | 'number'>) => {
      setState((s) => {
        const number = nextNumber(s.nextInvoiceNumber)
        return {
          ...s,
          invoices: [...s.invoices, { ...data, id: uid(), number }],
          nextInvoiceNumber: s.nextInvoiceNumber + 1,
        }
      })
    },
    []
  )

  const updateInvoice = useCallback((id: string, data: Partial<Invoice>) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }))
  }, [])

  const deleteInvoice = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.filter((i) => i.id !== id),
    }))
  }, [])

  return {
    state,
    ready,
    updateCompany,
    addClient,
    updateClient,
    deleteClient,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  }
}

export function newLineItem(): LineItem {
  return {
    id: uid(),
    description: '',
    qty: 1,
    unitPrice: 0,
    tva: 19,
  }
}
