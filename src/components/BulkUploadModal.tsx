'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, Download, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface RowResult {
  label: string
  ok: boolean
  error?: string
}

interface BulkUploadModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  templateHeaders: string[]
  exampleData: Record<string, unknown>[]
  onUpload: (data: Record<string, unknown>[]) => Promise<RowResult[]>
  onRefresh: () => void
}

function downloadExcel(headers: string[], data: Record<string, unknown>[], name: string) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BulkUploadModal({
  open,
  onClose,
  title,
  description,
  templateHeaders,
  exampleData,
  onUpload,
  onRefresh,
}: BulkUploadModalProps) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown>[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<RowResult[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast.error('Solo se aceptan archivos .xlsx, .xls o .csv')
      return
    }

    setFileName(file.name)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)

        if (json.length === 0) {
          toast.error('El archivo está vacío')
          return
        }

        const fileHeaders = Object.keys(json[0])
        const missingHeaders = templateHeaders.filter((h) => !fileHeaders.includes(h))
        if (missingHeaders.length > 0) {
          toast.error(`Columnas faltantes: ${missingHeaders.join(', ')}`)
          return
        }

        setParsedData(json)
        toast.success(`${json.length} registros leídos del archivo`)
      } catch {
        toast.error('Error al leer el archivo. Verificá que sea un Excel válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleUpload = async () => {
    if (!parsedData || parsedData.length === 0) return
    setUploading(true)
    try {
      const res = await onUpload(parsedData)
      setResults(res)
      const okCount = res.filter((r) => r.ok).length
      toast.success(`${okCount} de ${res.length} registros importados correctamente`)
      if (okCount > 0) onRefresh()
    } catch {
      toast.error('Error durante la importación')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setFileName('')
    setParsedData(null)
    setResults(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl glass-card rounded-2xl p-6 animate-fadeInUp max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-[#B0B0D0] mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="text-[#6B6B8A] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!parsedData && !results ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => downloadExcel(templateHeaders, exampleData, `${title.toLowerCase()}_ejemplo`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs hover:bg-[#6C3CE1]/20 transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Descargar ejemplo
              </button>
              <button
                onClick={() => downloadExcel(templateHeaders, [], `${title.toLowerCase()}_template`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[#B0B0D0] text-xs hover:bg-white/10 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Template vacío
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-[#6C3CE1] bg-[#6C3CE1]/5'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
              }`}
            >
              <Upload className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
              <p className="text-sm text-white font-medium mb-1">
                Soltá tu archivo Excel aquí o hacé clic para seleccionar
              </p>
              <p className="text-xs text-[#6B6B8A]">.xlsx · .xls · .csv</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#0A0A1A] border border-white/5">
              <p className="text-xs font-medium text-[#6B6B8A] mb-2 uppercase tracking-wider">Columnas esperadas</p>
              <div className="flex flex-wrap gap-1.5">
                {templateHeaders.map((h) => (
                  <span key={h} className="px-2 py-0.5 rounded bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs font-mono">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : results ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {results.filter((r) => r.ok).length === results.length ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="text-white font-medium">Resultado de la importación</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                    r.ok ? 'bg-green-500/5 text-green-400' : 'bg-red-500/5 text-red-400'
                  }`}
                >
                  {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{r.label}</span>
                  {r.error && <span className="text-red-400/70 ml-auto shrink-0">{r.error}</span>}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { reset(); onClose() }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={reset}
                className="flex-1 px-4 py-2.5 rounded-xl btn-nebula text-sm font-medium"
              >
                Importar otro archivo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0A0A1A] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="h-4 w-4 text-[#00D4FF]" />
                <span className="text-sm text-white font-medium">{fileName}</span>
                <span className="text-xs text-[#6B6B8A] ml-auto">{parsedData!.length} registros</span>
              </div>

              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      {templateHeaders.map((h) => (
                        <th key={h} className="text-left font-semibold text-[#6B6B8A] px-2 py-1 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData!.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        {templateHeaders.map((h) => (
                          <td key={h} className="px-2 py-1 text-white truncate max-w-[200px]">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData!.length > 5 && (
                      <tr>
                        <td colSpan={templateHeaders.length} className="text-center text-[#6B6B8A] py-2">
                          ... y {parsedData!.length - 5} registros más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { reset(); onClose() }}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 rounded-xl btn-nebula text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {parsedData!.length} registros
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
