'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createProposalAndOpen } from '@/app/(crm)/memoria-calculo/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Lead { id: string; name: string }

export default function NovaProposta({ leads }: { leads: Lead[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [form, setForm]     = useState({ lead_id: '', title: '' })

  async function handleSubmit() {
    if (!form.lead_id || !form.title.trim()) return
    setSaving(true)
    setError(null)
    const result = await createProposalAndOpen({
      lead_id: form.lead_id,
      title:   form.title.trim(),
    })
    // Se chegou aqui, houve erro (redirect bem-sucedido não retorna)
    if (result?.error) setError(result.error)
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setForm({ lead_id: '', title: '' }); setError(null) }}
        className="btn-primary flex items-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Nova Memória de Cálculo</span>
        <span className="sm:hidden">Nova</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Nova Memória de Cálculo</h2>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="label">Cliente *</label>
                <SearchableSelect
                  value={form.lead_id}
                  onChange={(v) => setForm((f) => ({ ...f, lead_id: v }))}
                  placeholder="Selecione o cliente"
                  options={leads.map((l) => ({ value: l.id, label: l.name }))}
                />
              </div>
              <div>
                <label className="label">Título da proposta *</label>
                <input
                  className="input"
                  placeholder="Ex: Pintura fachada completa"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <p className="text-xs text-gray-400">
                Após criar, você será direcionado para a memória de cálculo onde poderá adicionar as áreas e serviços.
              </p>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.lead_id || !form.title.trim()}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Criando...' : 'Criar e abrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
