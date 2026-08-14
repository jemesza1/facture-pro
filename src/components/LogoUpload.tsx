'use client'

import { useCallback, useState } from 'react'

interface Props {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  label: string
}

export function LogoUpload({ value, onChange, label }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith('image/')) return
      if (file.size > 1_500_000) {
        alert('Max 1.5 MB')
        return
      }
      const reader = new FileReader()
      reader.onload = () => onChange(reader.result as string)
      reader.readAsDataURL(file)
    },
    [onChange]
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0] ?? null)
        }}
        className={`relative flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
          dragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        {value ? (
          <div className="flex items-center gap-3 p-3">
            <img src={value} alt="Logo" className="h-12 max-w-[120px] object-contain" />
            <button type="button" onClick={() => onChange(undefined)} className="text-xs text-red-500 hover:underline">×</button>
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-slate-500">Drag & drop / click</p>
        )}
        <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  )
}
