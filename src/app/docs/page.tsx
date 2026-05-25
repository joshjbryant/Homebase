'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold } from '@/hooks/useHomebase'
import { createClient } from '@/lib/supabase/client'
import type { Document, DocumentCategory } from '@/types'
import { FileText, Stethoscope, GraduationCap, Scale, Package, Upload, X, ExternalLink } from 'lucide-react'

const CATS: { value: DocumentCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'medical',  label: 'Medical',   icon: <Stethoscope className="w-4 h-4" /> },
  { value: 'school',   label: 'School',    icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'legal',    label: 'Legal',     icon: <Scale className="w-4 h-4" /> },
  { value: 'other',    label: 'Other',     icon: <Package className="w-4 h-4" /> },
]

export default function DocsPage() {
  const supabase = createClient()
  const { householdId, currentMember } = useHousehold()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [docCat, setDocCat] = useState<DocumentCategory>('medical')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!householdId) return
    async function load() {
      const { data } = await supabase.from('documents').select('*')
        .eq('household_id', householdId).order('created_at', { ascending: false })
      setDocs(data || [])
      setLoading(false)
    }
    load()
  }, [householdId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !householdId || !currentMember) return
    setSaving(true)

    const ext = file.name.split('.').pop()
    const path = `${householdId}/${Date.now()}.${ext}`
    const { data: upload, error } = await supabase.storage.from('documents').upload(path, file)

    if (upload) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').insert({
        household_id: householdId,
        name: docName,
        category: docCat,
        file_url: publicUrl,
        uploaded_by: currentMember.id,
      })
      const { data: fresh } = await supabase.from('documents').select('*')
        .eq('household_id', householdId).order('created_at', { ascending: false })
      setDocs(fresh || [])
    }

    setShowModal(false)
    setFile(null)
    setDocName('')
    setSaving(false)
  }

  const grouped = CATS.reduce((acc, cat) => {
    acc[cat.value] = docs.filter(d => d.category === cat.value)
    return acc
  }, {} as Record<DocumentCategory, Document[]>)

  return (
    <AppLayout>
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="font-semibold text-gray-900 text-lg">Documents</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary py-2 px-3 text-xs">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-5">
            {CATS.map(cat => (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sage-600">{cat.icon}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {grouped[cat.value].map(doc => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="card px-3 py-3 flex items-start gap-2 hover:border-sage-200 transition-colors group">
                      <FileText className="w-5 h-5 text-sage-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate group-hover:text-sage-700">{doc.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                    </a>
                  ))}
                  {grouped[cat.value].length === 0 && (
                    <div className="col-span-2 text-xs text-gray-300 py-2 pl-1">No {cat.label.toLowerCase()} documents yet</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Upload document</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Document name</label>
                <input className="input" placeholder="e.g. Insurance card 2026" value={docName} onChange={e => setDocName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATS.map(c => (
                    <button key={c.value} type="button" onClick={() => setDocCat(c.value)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        docCat === c.value ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">File</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-5 cursor-pointer hover:border-sage-300 hover:bg-sage-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1.5" />
                  <span className="text-xs text-gray-500">{file ? file.name : 'Tap to choose file'}</span>
                  <span className="text-xs text-gray-300 mt-0.5">PDF or image</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) }}} required />
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
