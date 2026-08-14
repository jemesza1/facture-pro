import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FacturePro — Algérie | فاتورة برو',
  description: 'Générateur de factures professionnel bilingue (FR/AR). Données 100% locales — jamais stockées sur nos serveurs.',
  robots: 'index, follow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  )
}
