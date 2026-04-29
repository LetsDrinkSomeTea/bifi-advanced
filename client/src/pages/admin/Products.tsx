import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { AdminLayout } from './AdminLayout'
import { Modal } from '../../components/Modal'
import { useAllBuyables } from '../../hooks/useAdmin'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { BuyableWithVariants } from '@shared/types'
import { formatCents, cn } from '../../lib/utils'

// ─── Create Product Modal ─────────────────────────────────────────────────────

function CreateProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', category: '', variantName: '', variantPrice: '' })
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post('/api/buyables', {
        name: form.name,
        category: form.category || undefined,
        firstVariant: { name: form.variantName, price: Math.round(parseFloat(form.variantPrice) * 100) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyables'] })
      setForm({ name: '', category: '', variantName: '', variantPrice: '' })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(form.variantPrice)
    if (!form.name || !form.variantName || isNaN(price) || price < 0) { setError('Alle Pflichtfelder ausfüllen'); return }
    mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Neues Produkt">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Produktname *</label>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kategorie</label>
          <input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="z.B. Getränke"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Erste Variante</p>
          <div className="space-y-2">
            <input value={form.variantName} onChange={(e) => setForm(f => ({ ...f, variantName: e.target.value }))} required placeholder="Name (z.B. 0,5l) *"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={form.variantPrice} onChange={(e) => setForm(f => ({ ...f, variantPrice: e.target.value }))} required type="number" step="0.01" min="0" placeholder="Preis in € *"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
          {isPending ? 'Erstellen…' : 'Produkt erstellen'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Add Variant Modal ────────────────────────────────────────────────────────

function AddVariantModal({ buyable, onClose }: { buyable: BuyableWithVariants | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/api/buyables/${buyable!.id}/variants`, { name, price: Math.round(parseFloat(price) * 100) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyables'] }); setName(''); setPrice(''); onClose() },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseFloat(price)
    if (!name || isNaN(p) || p < 0) { setError('Name und gültigen Preis angeben'); return }
    mutate()
  }

  return (
    <Modal open={!!buyable} onClose={onClose} title={`Variante hinzufügen – ${buyable?.name}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="z.B. 0,3l"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Preis (€) *</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
          {isPending ? 'Hinzufügen…' : 'Variante hinzufügen'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({ item, onAddVariant }: { item: BuyableWithVariants; onAddVariant: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()

  const { mutate: toggleProduct } = useMutation({
    mutationFn: () => api.put(`/api/buyables/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyables'] }),
  })

  const { mutate: toggleVariant } = useMutation({
    mutationFn: ({ variantId, isActive }: { variantId: string; isActive: boolean }) =>
      api.put(`/api/buyables/${item.id}/variants/${variantId}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyables'] }),
  })

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', !item.isActive && 'opacity-60')}>
      {/* Product header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded ? <ChevronDown size={16} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <span className="font-semibold text-sm">{item.name}</span>
            {item.category && <span className="ml-2 text-xs text-muted-foreground">{item.category}</span>}
            {!item.isActive && <span className="ml-2 text-xs text-muted-foreground">(inaktiv)</span>}
          </div>
        </button>
        <button
          onClick={() => toggleProduct()}
          className={cn('text-xs px-2 py-1 rounded-lg border transition-colors flex-shrink-0',
            item.isActive ? 'border-border text-muted-foreground hover:bg-muted' : 'border-green-500/30 text-green-600 hover:bg-green-500/10')}
        >
          {item.isActive ? 'Deakt.' : 'Aktiv.'}
        </button>
      </div>

      {/* Variants */}
      {expanded && (
        <div className="border-t border-border">
          {item.variants.map((v) => (
            <div key={v.id} className={cn('flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0', !v.isActive && 'opacity-50')}>
              <div className="flex-1 min-w-0">
                <span className="text-sm">{v.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{formatCents(v.price)}</span>
                {!v.isActive && <span className="ml-2 text-xs text-muted-foreground">(inaktiv)</span>}
              </div>
              <button
                onClick={() => toggleVariant({ variantId: v.id, isActive: !v.isActive })}
                className={cn('text-xs px-2 py-1 rounded-lg border transition-colors flex-shrink-0',
                  v.isActive ? 'border-border text-muted-foreground hover:bg-muted' : 'border-green-500/30 text-green-600 hover:bg-green-500/10')}
              >
                {v.isActive ? 'Deakt.' : 'Aktiv.'}
              </button>
            </div>
          ))}
          <button
            onClick={onAddVariant}
            className="flex items-center gap-1.5 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus size={14} />
            Variante hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdminProducts() {
  const { data: items, isLoading } = useAllBuyables()
  const [createOpen, setCreateOpen] = useState(false)
  const [addVariantTarget, setAddVariantTarget] = useState<BuyableWithVariants | null>(null)

  return (
    <AdminLayout>
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={15} />
            Produkt
          </button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {items?.map((item) => (
          <ProductRow
            key={item.id}
            item={item}
            onAddVariant={() => setAddVariantTarget(item)}
          />
        ))}

        {!isLoading && items?.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Noch keine Produkte</p>
        )}
      </div>

      <CreateProductModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AddVariantModal buyable={addVariantTarget} onClose={() => setAddVariantTarget(null)} />
    </AdminLayout>
  )
}
