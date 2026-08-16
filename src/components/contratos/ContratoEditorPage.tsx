'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  useEditor, EditorContent, NodeViewWrapper,
  ReactNodeViewRenderer, Node, Extension, mergeAttributes,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import { FontFamily } from '@tiptap/extension-font-family'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import {
  ArrowLeft, Bold, Italic, Underline as LucideUnderline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Printer, CheckCircle, Loader2, ChevronDown,
  Table2, Image as ImageIcon, Minus,
  Scissors, ChevronUp,
  Trash2,
  Highlighter,
} from 'lucide-react'
import { saveContrato, updateContratoStatus, updateContratoTitle } from '@/app/(crm)/contratos/actions'

// ── Custom: Font Size ─────────────────────────────────────────────────────────

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

// ── A4 page constants (96dpi) — defined early so PageBreakView can use them ──
const PAGE_H  = 1122   // A4 height px
const PAGE_M  = 80     // margin top/bottom px
const CONTENT = PAGE_H - PAGE_M * 2  // 962px usable content per page
const GAP     = 80     // visual gap between pages
const TILE    = PAGE_H + GAP          // 1202px per tile

// ── Custom: Page Break ────────────────────────────────────────────────────────

function PageBreakView() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [fillH, setFillH] = useState(300)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const paper = el.closest('.print-paper') as HTMLElement | null
    if (!paper) return

    function measure() {
      const top = el!.getBoundingClientRect().top - paper!.getBoundingClientRect().top
      if (top <= 10) return
      const pageIdx = Math.floor(top / TILE)
      const nextPageStart = (pageIdx + 1) * TILE
      setFillH(Math.max(GAP + 4, Math.ceil(nextPageStart - top)))
    }

    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(paper)
    return () => obs.disconnect()
  }, [])

  return (
    <NodeViewWrapper>
      <div ref={wrapperRef} contentEditable={false} style={{ height: fillH, userSelect: 'none', display: 'block' }}>
        <div className="no-print" style={{ paddingTop: 8, opacity: 0.35, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, borderTop: '1px dashed #9ca3af' }} />
            <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>✂ quebra de página</span>
            <div style={{ flex: 1, borderTop: '1px dashed #9ca3af' }} />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  draggable: true,
  parseHTML() { return [{ tag: 'div[data-type="page-break"]' }] },
  renderHTML() { return ['div', { 'data-type': 'page-break', class: 'page-break' }] },
  addNodeView() { return ReactNodeViewRenderer(PageBreakView) },
  addCommands(): any {
    return { insertPageBreak: () => ({ commands }: any) => commands.insertContent({ type: 'pageBreak' }) }
  },
  addKeyboardShortcuts(): any {
    return {
      'Ctrl-Enter': () => (this.editor.chain() as any).insertPageBreak().run(),
      'Mod-Enter': () => (this.editor.chain() as any).insertPageBreak().run(),
    }
  },
})

// ── Custom: TableCell with backgroundColor ────────────────────────────────────

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
        renderHTML: attrs => attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
      },
      borderColor: {
        default: null,
        parseHTML: el => el.style.borderColor || null,
        renderHTML: attrs => attrs.borderColor ? { style: `border-color: ${attrs.borderColor}` } : {},
      },
    }
  },
})

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
        renderHTML: attrs => attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
      },
    }
  },
})

// ── Shared extension set ──────────────────────────────────────────────────────

function makeExtensions(placeholder = '') {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline, TextStyle, Color, Highlight.configure({ multicolor: true }),
    Subscript, Superscript, FontFamily, FontSize, PageBreak,
    Image.configure({ allowBase64: true, HTMLAttributes: { class: 'doc-img' } }),
    Table.configure({ resizable: true }),
    TableRow, CustomTableHeader, CustomTableCell,
    Placeholder.configure({ placeholder }),
  ]
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────

function Sep() { return <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" /> }

function Btn({
  active, disabled, onClick, title, children,
}: { active?: boolean; disabled?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors shrink-0 ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-30`}
    >
      {children}
    </button>
  )
}

const FONTS = [
  { label: 'Georgia',          value: 'Georgia, serif' },
  { label: 'Times New Roman',  value: '"Times New Roman", Times, serif' },
  { label: 'Arial',            value: 'Arial, sans-serif' },
  { label: 'Calibri',          value: 'Calibri, sans-serif' },
  { label: 'Verdana',          value: 'Verdana, sans-serif' },
  { label: 'Courier New',      value: '"Courier New", monospace' },
]
const SIZES = ['8pt','9pt','10pt','11pt','12pt','13pt','14pt','16pt','18pt','20pt','22pt','24pt','28pt','32pt','36pt','48pt','72pt']
const STYLES = [
  { label: 'Normal',   cmd: (e: any) => e.chain().focus().setParagraph().run() },
  { label: 'Título 1', cmd: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Título 2', cmd: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Título 3', cmd: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Título 4', cmd: (e: any) => e.chain().focus().toggleHeading({ level: 4 }).run() },
]
const COLORS = ['#000000','#374151','#6b7280','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff']
const HIGHLIGHTS = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa','#f0fdf4','transparent']
const CELL_COLORS = ['transparent','#f3f4f6','#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa','#f97316','#22c55e','#3b82f6','#8b5cf6']
const BULLET_STYLES = [
  { style: 'disc',   label: '● Disco (padrão)' },
  { style: 'circle', label: '○ Círculo' },
  { style: 'square', label: '■ Quadrado' },
]
const NUMBER_STYLES = [
  { type: '1', label: '1. 2. 3. — Números' },
  { type: 'a', label: 'a. b. c. — Letras min.' },
  { type: 'A', label: 'A. B. C. — Letras mai.' },
  { type: 'i', label: 'i. ii. iii. — Romano min.' },
  { type: 'I', label: 'I. II. III. — Romano mai.' },
]

function Dropdown({ label, children, small }: { label: string; children: (close: () => void) => React.ReactNode; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-gray-700 hover:bg-gray-100 text-xs font-medium ${small ? 'min-w-[40px]' : 'min-w-[80px]'}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden"
            style={{ minWidth: small ? 70 : 160 }}>
            {children(close)}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main toolbar ──────────────────────────────────────────────────────────────

function Toolbar({
  editor, onInsertTable, onInsertImage,
}: { editor: ReturnType<typeof useEditor> | null; onInsertTable: () => void; onInsertImage: () => void }) {
  const [colorOpen, setColorOpen] = useState(false)
  const [hlOpen, setHlOpen] = useState(false)
  const [cellBgOpen, setCellBgOpen] = useState(false)
  // force re-render whenever editor state changes (selection, marks, nodes)
  const [, forceRender] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => forceRender(n => n + 1)
    editor.on('transaction', update)
    editor.on('selectionUpdate', update)
    return () => { editor.off('transaction', update); editor.off('selectionUpdate', update) }
  }, [editor])

  if (!editor) return null

  const curFont = editor.getAttributes('textStyle').fontFamily || FONTS[0].value
  const curSize = editor.getAttributes('textStyle').fontSize || '12pt'
  const curStyle = editor.isActive('heading', { level: 1 }) ? 'Título 1'
    : editor.isActive('heading', { level: 2 }) ? 'Título 2'
    : editor.isActive('heading', { level: 3 }) ? 'Título 3'
    : editor.isActive('heading', { level: 4 }) ? 'Título 4'
    : 'Normal'

  return (
    <div className="no-print bg-white border-b border-gray-100 px-3 py-1.5 flex items-center gap-0.5 flex-wrap" style={{ overflow: 'visible' }}>
      {/* History */}
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></Btn>
      <Sep />

      {/* Style */}
      <Dropdown label={curStyle}>
        {(close) => STYLES.map(s => (
          <button key={s.label} type="button" className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
            onMouseDown={e => { e.preventDefault(); s.cmd(editor); close() }}>{s.label}</button>
        ))}
      </Dropdown>

      {/* Font family */}
      <Dropdown label={FONTS.find(f => f.value === curFont)?.label ?? 'Fonte'}>
        {(close) => FONTS.map(f => (
          <button key={f.value} type="button" style={{ fontFamily: f.value }}
            className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().setFontFamily(f.value).run(); close() }}
          >{f.label}</button>
        ))}
      </Dropdown>

      {/* Font size */}
      <Dropdown label={curSize} small>
        {(close) => (
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {SIZES.map(s => (
              <button key={s} type="button"
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${curSize === s ? 'font-bold text-blue-600' : ''}`}
                onMouseDown={e => { e.preventDefault(); (editor.chain().focus() as any).setFontSize(s).run(); close() }}
              >{s}</button>
            ))}
          </div>
        )}
      </Dropdown>
      <Sep />

      {/* Formatting */}
      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito"><Bold className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico"><Italic className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado"><LucideUnderline className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscrito"><span className="text-xs font-bold leading-none">X₂</span></Btn>
      <Btn active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Sobrescrito"><span className="text-xs font-bold leading-none">X²</span></Btn>
      <Sep />

      {/* Text color */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setColorOpen(v => !v) }}
          className="p-1.5 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-0.5"
          title="Cor do texto"
        >
          <span className="text-xs font-bold leading-none text-gray-700">A</span>
          <span className="w-3.5 h-0.5 rounded" style={{ background: editor.getAttributes('textStyle').color || '#000' }} />
        </button>
        {colorOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setColorOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 p-2">
              <div className="grid grid-cols-6 gap-1 mb-1">
                {COLORS.map(c => (
                  <button key={c} type="button" className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setColorOpen(false) }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-gray-500">Outra:</span>
                <input type="color" className="w-6 h-5 cursor-pointer border-0"
                  onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setHlOpen(v => !v) }}
          className="p-1.5 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-0.5"
          title="Destaque"
        >
          <Highlighter className="w-3.5 h-3.5 text-gray-600" />
        </button>
        {hlOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setHlOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 p-2">
              <div className="flex gap-1 flex-wrap w-32">
                {HIGHLIGHTS.map(c => (
                  <button key={c} type="button"
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ background: c === 'transparent' ? 'white' : c }}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (c === 'transparent') editor.chain().focus().unsetHighlight().run()
                      else editor.chain().focus().setHighlight({ color: c }).run()
                      setHlOpen(false)
                    }}
                  >
                    {c === 'transparent' && <span className="text-[9px] text-gray-500">✕</span>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <Sep />

      {/* Lists */}
      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores"><List className="w-3.5 h-3.5" /></Btn>
      <Dropdown label="•" small>
        {(close) => (
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide font-medium">Marcadores</div>
            {BULLET_STYLES.map(s => (
              <button key={s.style} type="button"
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                onMouseDown={e => {
                  e.preventDefault()
                  const chain = editor.chain().focus()
                  if (!editor.isActive('bulletList')) chain.toggleBulletList()
                  // Apply list-style via DOM since StarterKit doesn't have listStyleType attribute
                  chain.run()
                  setTimeout(() => {
                    const uls = editor.view.dom.querySelectorAll('ul')
                    const { from } = editor.state.selection
                    const domPos = editor.view.domAtPos(from)
                    const el = domPos.node as HTMLElement
                    const ul = el.closest?.('ul') ?? el.querySelector?.('ul') ?? uls[uls.length - 1]
                    if (ul) (ul as HTMLUListElement).style.listStyleType = s.style
                  }, 0)
                  close()
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </Dropdown>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></Btn>
      <Dropdown label="1." small>
        {(close) => (
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide font-medium">Numeração</div>
            {NUMBER_STYLES.map(s => (
              <button key={s.type} type="button"
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                onMouseDown={e => {
                  e.preventDefault()
                  const chain = editor.chain().focus()
                  if (!editor.isActive('orderedList')) chain.toggleOrderedList()
                  chain.run()
                  setTimeout(() => {
                    const ols = editor.view.dom.querySelectorAll('ol')
                    const { from } = editor.state.selection
                    const domPos = editor.view.domAtPos(from)
                    const el = domPos.node as HTMLElement
                    const ol = el.closest?.('ol') ?? el.querySelector?.('ol') ?? ols[ols.length - 1]
                    if (ol) ol.setAttribute('type', s.type)
                  }, 0)
                  close()
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </Dropdown>
      <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citação">
        <span className="text-xs font-bold">❝</span>
      </Btn>
      <Sep />

      {/* Alignment */}
      <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Esquerda"><AlignLeft className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centro"><AlignCenter className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Direita"><AlignRight className="w-3.5 h-3.5" /></Btn>
      <Btn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justificar"><AlignJustify className="w-3.5 h-3.5" /></Btn>
      <Sep />

      {/* Insert */}
      <Btn onClick={onInsertTable} title="Inserir tabela"><Table2 className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={onInsertImage} title="Inserir imagem"><ImageIcon className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => (editor.chain().focus() as any).insertPageBreak().run()} title="Quebra de página">
        <Scissors className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal"><Minus className="w-3.5 h-3.5" /></Btn>

      {/* Table context tools */}
      {editor.isActive('table') && (
        <>
          <Sep />
          <span className="text-[10px] text-gray-400 font-medium ml-1">Tabela:</span>
          <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="Linha acima">
            <span className="text-[10px] font-bold">L↑</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Linha abaixo">
            <span className="text-[10px] font-bold">L↓</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Excluir linha">
            <span className="text-[10px] font-bold text-red-500">-L</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Coluna antes">
            <span className="text-[10px] font-bold">C←</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Coluna depois">
            <span className="text-[10px] font-bold">C→</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Excluir coluna">
            <span className="text-[10px] font-bold text-red-500">-C</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().mergeCells().run()} title="Mesclar células">
            <span className="text-[10px] font-bold">⊞</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().splitCell().run()} title="Dividir célula">
            <span className="text-[10px] font-bold">⊟</span>
          </Btn>
          {/* Cell background color */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setCellBgOpen(v => !v) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-0.5"
              title="Cor de fundo da célula"
            >
              <span className="text-[10px] font-bold text-gray-700 leading-none">▣</span>
              <span className="text-[8px] text-gray-400 leading-none">BG</span>
            </button>
            {cellBgOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCellBgOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 p-3 min-w-[160px]">
                  <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wide">Fundo da célula</p>
                  <div className="grid grid-cols-6 gap-1 mb-2">
                    {CELL_COLORS.map(c => (
                      <button key={c} type="button"
                        className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform relative"
                        style={{ background: c === 'transparent' ? 'white' : c }}
                        onMouseDown={e => {
                          e.preventDefault()
                          if (c === 'transparent') {
                            editor.chain().focus().updateAttributes('tableCell', { backgroundColor: null }).run()
                            editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: null }).run()
                          } else {
                            editor.chain().focus().updateAttributes('tableCell', { backgroundColor: c }).run()
                            editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: c }).run()
                          }
                          setCellBgOpen(false)
                        }}
                      >
                        {c === 'transparent' && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-400">✕</span>}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Outra:</span>
                    <input type="color" className="w-6 h-5 cursor-pointer border-0"
                      onChange={e => {
                        editor.chain().focus().updateAttributes('tableCell', { backgroundColor: e.target.value }).run()
                        editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: e.target.value }).run()
                      }} />
                  </label>
                </div>
              </>
            )}
          </div>
          <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela">
            <Trash2 className="w-3 h-3 text-red-500" />
          </Btn>
        </>
      )}
    </div>
  )
}

// ── Mini header/footer editor ─────────────────────────────────────────────────

function ZoneEditor({
  label, placeholder, content, onSave, icon,
}: { label: string; placeholder: string; content: string | null; onSave: (html: string) => void; icon: React.ReactNode }) {
  const [visible, setVisible] = useState(!!content)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ed = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TextAlign.configure({ types: ['paragraph'] }),
      Underline, TextStyle, Color, FontFamily, FontSize,
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? '',
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => onSave(editor.getHTML()), 1500)
    },
  })

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className={`zone-editor border-x border-gray-200 ${label === 'Cabeçalho' ? 'border-t rounded-t-none' : 'border-b rounded-b-none'}`}
      style={{ background: label === 'Cabeçalho' ? '#f8faff' : '#fafaf8' }}>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        {visible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {visible && (
        <div className="border-t border-dashed border-gray-300 px-20 py-3">
          <EditorContent editor={ed} className="min-h-[40px] text-sm text-gray-600 outline-none" />
        </div>
      )}
    </div>
  )
}

// ── Floating selection toolbar (shows only when mouse hovers over selection) ──

function FloatingToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [tick, setTick] = useState(0)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ftColor, setFtColor] = useState(false)
  const [ftSize, setFtSize] = useState(false)
  const [ftFont, setFtFont] = useState(false)

  const clearHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null } }
  const scheduleHide = () => {
    clearHide()
    hideTimer.current = setTimeout(() => {
      if (!toolbarRef.current?.matches(':hover')) setShow(false)
      hideTimer.current = null
    }, 300)
  }

  useEffect(() => {
    if (!editor) return
    const pm = editor.view.dom as HTMLElement

    const onMouseMove = (e: MouseEvent) => {
      const { from, to } = editor.state.selection
      if (from === to) { scheduleHide(); return }
      try {
        const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
        if (coords && coords.pos >= from && coords.pos <= to) {
          clearHide()
          setPos({ top: e.clientY, left: e.clientX })
          setShow(true)
          setTick(n => n + 1)
        } else {
          scheduleHide()
        }
      } catch { scheduleHide() }
    }

    const onSelectionChange = () => {
      const { from, to } = editor.state.selection
      if (from === to) setShow(false)
      setTick(n => n + 1)
    }

    pm.addEventListener('mousemove', onMouseMove)
    editor.on('selectionUpdate', onSelectionChange)
    editor.on('transaction', onSelectionChange)

    return () => {
      pm.removeEventListener('mousemove', onMouseMove)
      editor.off('selectionUpdate', onSelectionChange)
      editor.off('transaction', onSelectionChange)
      clearHide()
    }
  }, [editor])

  if (!editor || !show) return null

  const mkBtn = (label: string, active: boolean, onClick: () => void, cls = '') => (
    <button key={label} type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${cls} ${active ? 'bg-white/20' : 'hover:bg-white/10'}`}
    >{label}</button>
  )

  const curFont = editor.getAttributes('textStyle').fontFamily || FONTS[0].value
  const curSize = editor.getAttributes('textStyle').fontSize || '12pt'
  const curColor = (editor.getAttributes('textStyle').color as string) || '#ffffff'

  return createPortal(
    <div
      ref={toolbarRef}
      onMouseLeave={() => setShow(false)}
      onMouseDown={e => e.preventDefault()}
      style={{ position: 'fixed', top: pos.top - 52, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
    >
      <div className="flex items-center gap-0.5 bg-gray-900/95 text-white rounded-xl px-2 py-1.5 shadow-2xl border border-gray-700/60"
        style={{ backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>

        {/* Font family */}
        <div className="relative">
          <button type="button"
            onMouseDown={e => { e.preventDefault(); setFtFont(v => !v); setFtColor(false); setFtSize(false) }}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] hover:bg-white/10 transition-colors max-w-[82px]">
            <span className="truncate">{FONTS.find(f => f.value === curFont)?.label ?? 'Fonte'}</span>
            <ChevronDown className="w-2.5 h-2.5 shrink-0 text-white/50" />
          </button>
          {ftFont && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden min-w-[150px]">
              {FONTS.map(f => (
                <button key={f.value} type="button" style={{ fontFamily: f.value }}
                  className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setFontFamily(f.value).run(); setFtFont(false) }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Font size */}
        <div className="relative">
          <button type="button"
            onMouseDown={e => { e.preventDefault(); setFtSize(v => !v); setFtColor(false); setFtFont(false) }}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] hover:bg-white/10 transition-colors min-w-[42px]">
            {curSize}<ChevronDown className="w-2 h-2 text-white/50" />
          </button>
          {ftSize && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-y-auto min-w-[72px]" style={{ maxHeight: 200 }}>
              {SIZES.map(s => (
                <button key={s} type="button"
                  className={`block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 ${curSize === s ? 'font-bold text-blue-600' : ''}`}
                  onMouseDown={e => { e.preventDefault(); (editor.chain().focus() as any).setFontSize(s).run(); setFtSize(false) }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Text color */}
        <div className="relative">
          <button type="button"
            onMouseDown={e => { e.preventDefault(); setFtColor(v => !v); setFtSize(false); setFtFont(false) }}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="text-xs font-bold leading-none">A</span>
            <span className="w-3.5 h-0.5 rounded" style={{ background: curColor }} />
          </button>
          {ftColor && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl border border-gray-100 shadow-xl z-50 p-2">
              <div className="grid grid-cols-6 gap-1">
                {COLORS.map(c => (
                  <button key={c} type="button"
                    className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setFtColor(false) }} />
                ))}
              </div>
              <label className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-gray-500">Outra:</span>
                <input type="color" className="w-6 h-5 cursor-pointer border-0"
                  onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
              </label>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {mkBtn('N', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'font-bold')}
        {mkBtn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'italic')}
        {mkBtn('S', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'underline')}
        {mkBtn('T', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'line-through')}

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {mkBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {mkBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {mkBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {mkBtn('◀', editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run())}
        {mkBtn('⦿', editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run())}
        {mkBtn('▶', editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run())}

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {mkBtn('✕', false, () => editor.chain().focus().unsetAllMarks().run())}
      </div>
    </div>,
    document.body
  )
}

// ── Auto-paginate: split HTML into chunks that fit in one A4 content area ─────

function autoPaginateHtml(html: string): Promise<string[]> {
  return new Promise(resolve => {
    if (!html || html.trim() === '' || html === '<p></p>') { resolve(['']); return }
    const wrapper = document.createElement('div')
    wrapper.style.cssText = [
      'position:fixed', 'left:-99999px', 'top:0', 'visibility:hidden', 'pointer-events:none',
      `width:${794 - PAGE_M * 2}px`,
      'font-size:12pt', 'line-height:1.75',
      'font-family:Georgia,"Times New Roman",serif', 'color:#111827',
    ].join(';')
    wrapper.innerHTML = html
    document.body.appendChild(wrapper)
    // Double rAF to give browser time to fully lay out the content
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const groups: string[][] = [[]]
      let usedH = 0
      Array.from(wrapper.children as HTMLCollectionOf<HTMLElement>).forEach(child => {
        const h = child.offsetHeight + 10
        if (usedH > 0 && usedH + h > CONTENT) { groups.push([]); usedH = 0 }
        groups[groups.length - 1].push(child.outerHTML)
        usedH += h
      })
      document.body.removeChild(wrapper)
      const pages = groups.length > 0
        ? groups.map(g => g.join('').replace(/^(\s*<p[^>]*>\s*<\/p>\s*)+/, '').replace(/(\s*<p[^>]*>\s*<\/p>\s*)+$/, '').trim() || '')
        : ['']
      resolve(pages)
    }))
  })
}

// ── Per-page editor — one independent Tiptap instance per A4 page ─────────────

interface PageEditorProps {
  initialContent: string
  pageIndex: number
  onUpdate: (html: string) => void
  onFocus: (ed: NonNullable<ReturnType<typeof useEditor>>) => void
}

function PageEditorInstance({ initialContent, pageIndex, onUpdate, onFocus }: PageEditorProps) {
  const editor = useEditor({
    extensions: makeExtensions(pageIndex === 0 ? 'Comece a editar o contrato...' : ''),
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'outline-none',
        style: 'font-family:Georgia,"Times New Roman",serif;font-size:12pt;line-height:1.75;color:#111827;',
      },
    },
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
    onFocus: ({ editor }) => onFocus(editor),
  })

  return (
    <div className="print-paper" style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.10)', marginBottom: GAP }}>
      <FloatingToolbar editor={editor} />

      {/* Content area: clips exactly at CONTENT bottom (no text in bottom margin) */}
      <div style={{
        height: PAGE_M + CONTENT,
        overflow: 'hidden',
        padding: `${PAGE_M}px ${PAGE_M}px 0`,
        boxSizing: 'border-box',
      }}>
        <EditorContent editor={editor} />
      </div>

      {/* Bottom margin — visually part of page, unreachable by text */}
      <div style={{ height: PAGE_M }} />
    </div>
  )
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'rascunho', label: 'Rascunho', badge: 'bg-gray-100 text-gray-600' },
  { value: 'ativo',    label: 'Ativo',    badge: 'bg-blue-100 text-blue-700'  },
  { value: 'assinado', label: 'Assinado', badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelado',label: 'Cancelado',badge: 'bg-red-100 text-red-600'   },
]

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  contrato: {
    id: string
    contract_number: string | null
    title: string
    content: string | null
    header_content: string | null
    footer_content: string | null
    status: string
    leads: { name: string; company: string | null } | null
    proposals: { title: string; value: number } | null
  }
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ContratoEditorPage({ contrato }: Props) {
  const clientName = contrato.leads?.company ?? contrato.leads?.name ?? '—'

  const [title, setTitle] = useState(contrato.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [status, setStatus] = useState(contrato.status)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')
  const [imageUrl, setImageUrl] = useState('')
  // Pages: each entry is the HTML content of one A4 page
  const [pages, setPages] = useState<string[]>([])
  const [pagesReady, setPagesReady] = useState(false)
  // Active editor: whichever page the user last clicked/typed in
  const [activeEditor, setActiveEditor] = useState<ReturnType<typeof useEditor> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Ref mirrors pages state so async save callbacks always see latest value
  const pagesRef = useRef<string[]>([])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // On mount: split stored content into per-page arrays
  useEffect(() => {
    const raw = contrato.content
    if (!raw || raw.trim() === '' || raw === '<p></p>') {
      pagesRef.current = ['']
      setPages([''])
      setPagesReady(true)
      return
    }
    // If the content already has explicit page-break markers, split on them
    if (raw.includes('data-type="page-break"')) {
      const parts = raw
        .split(/<div[^>]*data-type="page-break"[^>]*><\/div>/gi)
        .filter(p => p.trim())
      const result = parts.length > 0 ? parts : ['']
      pagesRef.current = result
      setPages(result)
      setPagesReady(true)
    } else {
      // No explicit breaks — auto-distribute content across A4 pages by height
      autoPaginateHtml(raw).then(result => {
        pagesRef.current = result
        setPages(result)
        setPagesReady(true)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePageUpdate(html: string, index: number) {
    const next = [...pagesRef.current]
    next[index] = html
    pagesRef.current = next
    setPages(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const combined = pagesRef.current.join('<div data-type="page-break" class="page-break"></div>')
      const res = await saveContrato(contrato.id, combined)
      if (res.error) setSaveStatus('error')
      else { setSaveStatus('saved'); setLastSaved(new Date()); setTimeout(() => setSaveStatus('idle'), 3000) }
    }, 1500)
  }

  function handleAddPage() {
    const next = [...pagesRef.current, '']
    pagesRef.current = next
    setPages(next)
  }

  async function changeStatus(v: string) {
    setStatus(v)
    setShowStatusMenu(false)
    await updateContratoStatus(contrato.id, v)
  }

  async function commitTitle(t: string) {
    const trimmed = t.trim()
    if (!trimmed) return
    setTitle(trimmed)
    setEditingTitle(false)
    await updateContratoTitle(contrato.id, trimmed)
  }

  function handleInsertTable() {
    setShowTableDialog(false)
    const r = parseInt(tableRows) || 3
    const c = parseInt(tableCols) || 3
    activeEditor?.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
  }

  function handleImageUrl() {
    if (!imageUrl.trim()) return
    activeEditor?.chain().focus().setImage({ src: imageUrl.trim() }).run()
    setImageUrl('')
    setShowImageDialog(false)
  }

  function handleImageFile(file: File) {
    if (file.size > 2_000_000) { alert('Imagem muito grande. Use arquivos até 2MB.'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const src = e.target?.result as string
      activeEditor?.chain().focus().setImage({ src }).run()
      setShowImageDialog(false)
    }
    reader.readAsDataURL(file)
  }

  const curStatusCfg = STATUS_OPTS.find(o => o.value === status) ?? STATUS_OPTS[0]

  return (
    <>
      {/* CSS */}
      <style>{`
        @page { size: A4; margin: 20mm 25mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .print-paper { box-shadow: none !important; margin-bottom: 0 !important; page-break-after: always; }
          .zone-editor { border: none !important; background: transparent !important; }
          .ProseMirror { min-height: auto !important; }
          table { page-break-inside: avoid; }
        }

        /* Headings */
        .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.5rem; text-align: center; }
        .ProseMirror h2 { font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 0.5rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .ProseMirror h3 { font-size: 1rem; font-weight: 700; margin: 1.25rem 0 0.4rem; }
        .ProseMirror h4 { font-size: 0.95rem; font-weight: 600; margin: 1rem 0 0.3rem; }
        .ProseMirror p { margin: 0.35rem 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.75rem; margin: 0.5rem 0; }
        .ProseMirror li { margin: 0.2rem 0; }
        .ProseMirror blockquote { border-left: 3px solid #9ca3af; padding-left: 1rem; color: #6b7280; margin: 0.75rem 0; }
        .ProseMirror hr { border: none; border-top: 1px solid #d1d5db; margin: 1.5rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror u { text-decoration: underline; }
        .ProseMirror s { text-decoration: line-through; }

        /* Tables */
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1rem 0; table-layout: fixed; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; min-width: 60px; vertical-align: top; position: relative; }
        .ProseMirror th { background: #f3f4f6; font-weight: 700; text-align: left; }
        .ProseMirror .selectedCell::after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(59,130,246,0.12); pointer-events: none; }
        .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 3px; background: #3b82f6; pointer-events: none; }
        .tableWrapper { overflow-x: auto; }

        /* Images */
        .ProseMirror .doc-img { max-width: 100%; height: auto; display: block; margin: 0.75rem 0; border-radius: 4px; cursor: pointer; }
        .ProseMirror .doc-img.ProseMirror-selectednode { outline: 2px solid #3b82f6; outline-offset: 2px; }

        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #9ca3af; pointer-events: none; height: 0; }
      `}</style>

      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="no-print bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 min-w-0">
          <Link href="/contratos" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input autoFocus
                className="text-sm font-semibold text-gray-900 border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full max-w-sm"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={e => commitTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(e.currentTarget.value); if (e.key === 'Escape') { setTitle(contrato.title); setEditingTitle(false) } }}
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 text-left truncate block max-w-xs">
                {title}
              </button>
            )}
            <p className="text-xs text-gray-400 truncate">
              {contrato.contract_number && <>{contrato.contract_number} · </>}{clientName}
            </p>
          </div>

          {/* Status */}
          <div className="relative shrink-0">
            <button onClick={() => setShowStatusMenu(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${curStatusCfg.badge}`}>
              {curStatusCfg.label}<ChevronDown className="w-3 h-3" />
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 min-w-[130px]">
                  {STATUS_OPTS.map(o => (
                    <button key={o.value} onClick={() => changeStatus(o.value)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${status === o.value ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Save status */}
          <div className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1 min-w-[70px]">
            {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" />Salvando</>}
            {saveStatus === 'saved'  && <><CheckCircle className="w-3 h-3 text-emerald-500" />Salvo</>}
            {saveStatus === 'error'  && <span className="text-red-500">Erro</span>}
            {saveStatus === 'idle' && lastSaved && <span>Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>

          <button onClick={() => window.print()}
            className="no-print btn-secondary flex items-center gap-1.5 text-xs py-1.5 shrink-0">
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>

        {/* Toolbar — uses whichever page editor the user last focused */}
        <Toolbar
          editor={activeEditor}
          onInsertTable={() => setShowTableDialog(true)}
          onInsertImage={() => setShowImageDialog(true)}
        />

        {/* Document area */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#e2e8f0' }}>
          <div className="py-10" style={{ paddingLeft: 60, paddingRight: 60 }}>
            <div className="mx-auto" style={{ maxWidth: 794 }}>

              {/* Pages — each is a real A4 card with overflow:hidden */}
              {!pagesReady ? (
                <div style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.10)', height: PAGE_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : pages.map((pageHtml, i) => (
                <PageEditorInstance
                  key={i}
                  initialContent={pageHtml}
                  pageIndex={i}
                  onUpdate={html => handlePageUpdate(html, i)}
                  onFocus={ed => setActiveEditor(ed)}
                />
              ))}

              {/* Add page button */}
              {pagesReady && (
                <div className="no-print flex justify-center mb-6">
                  <button
                    onClick={handleAddPage}
                    className="flex items-center gap-2 px-6 py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    style={{ background: 'white', border: '2px dashed #d1d5db', borderRadius: 12 }}
                  >
                    + Adicionar página
                  </button>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Table dialog */}
      {showTableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowTableDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl z-10 p-6 w-72">
            <h3 className="font-bold text-gray-900 mb-4">Inserir Tabela</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Linhas</label>
                <input type="number" min="1" max="20" value={tableRows}
                  onChange={e => setTableRows(e.target.value)}
                  className="input text-center" />
              </div>
              <div>
                <label className="label">Colunas</label>
                <input type="number" min="1" max="10" value={tableCols}
                  onChange={e => setTableCols(e.target.value)}
                  className="input text-center" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowTableDialog(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleInsertTable} className="btn-primary flex-1">Inserir</button>
            </div>
          </div>
        </div>
      )}

      {/* Image dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowImageDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl z-10 p-6 w-80">
            <h3 className="font-bold text-gray-900 mb-4">Inserir Imagem</h3>
            <div className="space-y-4">
              <div>
                <label className="label">URL da imagem</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleImageUrl()}
                    className="input flex-1"
                  />
                  <button onClick={handleImageUrl} className="btn-primary text-sm px-3">OK</button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">ou</span></div>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-2"
              >
                <ImageIcon className="w-6 h-6" />
                Clique para fazer upload
                <span className="text-[11px] text-gray-400">JPG, PNG, GIF, WebP · Máx 2MB</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            </div>
            <button onClick={() => setShowImageDialog(false)} className="btn-secondary w-full mt-4">Cancelar</button>
          </div>
        </div>
      )}

    </>
  )
}
