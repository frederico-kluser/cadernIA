import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns2,
  CornerDownLeft,
  Download,
  Eye,
  FileText,
  FileType2,
  Ghost,
  KeyRound,
  Loader2,
  Maximize2,
  Menu,
  Mic,
  MicOff,
  Minimize2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import GhostEditor, {
  staticMirrorHtml,
  type GhostEditorHandle,
} from '@/components/GhostEditor'
import MarkdownPreview from '@/components/MarkdownPreview'
import ApiKeyDialog, { type KeyStatus } from '@/components/ApiKeyDialog'
import LockScreen from '@/components/LockScreen'
import NotepadScene, { type AnimPageInfo } from '@/components/NotepadScene'
import PageTexture, { type PageTextureHandle } from '@/components/PageTexture'
import AttachmentsPanel from '@/components/AttachmentsPanel'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { fetchCompletion, transcribeAudio, validateApiKey } from '@/lib/openai'
import { getCached, invalidate, setCached } from '@/lib/suggestionCache'
import {
  dbDelete,
  dbGetAll,
  dbPut,
  downloadNote,
  newProject,
  type Attachment,
  type Project,
} from '@/lib/db'

interface Suggestion {
  text: string
  source: 'api' | 'memoria'
}

type ViewMode = 'edit' | 'split' | 'preview'
type RecState = 'idle' | 'recording' | 'transcribing'

const LS = {
  key: 'noteghost_api_key',
  legacyText: 'noteghost_text',
  model: 'noteghost_model',
  fontSize: 'noteghost_font_size',
}

const MODELS = ['gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4.1']
const AUTOCOMPLETE_DELAY_MS = 800

export default function Home() {
  // ---------- projetos (páginas) ----------
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(false)
  const [anim, setAnim] = useState<(AnimPageInfo & { seq: number }) | null>(null)
  const [pageRect, setPageRect] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  // ---------- editor ----------
  const [cursor, setCursor] = useState(0)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ViewMode>('edit')
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem(LS.fontSize)) || 17,
  )

  // ---------- OpenAI ----------
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS.key) ?? '')
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle')
  const [keyError, setKeyError] = useState<string | undefined>()
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [storedChecked, setStoredChecked] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem(LS.model) ?? MODELS[0])

  // ---------- extras ----------
  const [recState, setRecState] = useState<RecState>('idle')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pseudoFs, setPseudoFs] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // ---------- refs ----------
  const textRef = useRef('')
  const cursorRef = useRef(0)
  const debounceRef = useRef<number | undefined>(undefined)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const editorRef = useRef<GhostEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stageRef = useRef<PageTextureHandle>(null)
  const animSeqRef = useRef(0)

  const isTouch = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window),
    [],
  )

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId],
  )
  const activeIndex = useMemo(
    () => projects.findIndex((p) => p.id === activeId),
    [projects, activeId],
  )
  const unlocked = keyStatus === 'valid'
  const busy = anim !== null

  // sincroniza o ref de texto ao trocar de página
  useEffect(() => {
    textRef.current = projects.find((p) => p.id === activeId)?.content ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // ---------- carregar projetos do IndexedDB ----------
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        let list = await dbGetAll()
        if (list.length === 0) {
          // migra a nota antiga do localStorage, se existir
          const migrated = localStorage.getItem(LS.legacyText) ?? ''
          const p = newProject('Página 1', migrated)
          await dbPut(p)
          list = [p]
        }
        if (!cancelled) {
          setProjects(list)
          setActiveId(list[0].id)
        }
      } catch {
        if (!cancelled) {
          const p = newProject('Página 1')
          setProjects([p])
          setActiveId(p.id)
          toast.error('IndexedDB indisponível: as notas não serão salvas.')
        }
      } finally {
        if (!cancelled) setDbReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---------- salvar projeto ativo (debounce) ----------
  useEffect(() => {
    if (!dbReady || !active) return
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void dbPut({ ...active, updatedAt: Date.now() })
    }, 500)
  }, [active, dbReady])

  // ---------- persistência simples ----------
  useEffect(() => {
    localStorage.setItem(LS.fontSize, String(fontSize))
  }, [fontSize])
  useEffect(() => {
    localStorage.setItem(LS.model, model)
  }, [model])

  // ---------- validação da chave ----------
  const runValidation = useCallback(async (key: string) => {
    setKeyStatus('checking')
    setKeyError(undefined)
    const r = await validateApiKey(key)
    setKeyStatus(r.ok ? 'valid' : 'invalid')
    setKeyError(r.error)
    return r.ok
  }, [])

  // revalida a chave salva ao abrir — o app fica bloqueado até ser válida
  useEffect(() => {
    if (apiKey) {
      void runValidation(apiKey).finally(() => setStoredChecked(true))
    } else {
      setStoredChecked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveKey = useCallback((key: string) => {
    localStorage.setItem(LS.key, key)
    setApiKey(key)
  }, [])

  const handleLockSubmit = useCallback(
    async (key: string) => {
      const ok = await runValidation(key)
      if (ok) saveKey(key)
      return ok
    },
    [runValidation, saveKey],
  )

  // ---------- helpers de edição ----------
  const updateActive = useCallback(
    (patch: Partial<Project>) => {
      if (!activeId) return
      setProjects((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)))
    },
    [activeId],
  )

  const resetEditorState = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    setSuggestion(null)
    setCursor(0)
    cursorRef.current = 0
  }, [])

  // ---------- autocomplete ----------
  const requestCompletion = useCallback(
    async (force: boolean) => {
      if (!apiKey || !unlocked) return
      const pos = cursorRef.current
      const full = textRef.current
      const before = full.slice(0, pos)
      const after = full.slice(pos)
      if (!before.trim() && !after.trim()) return

      // memória local primeiro: recall funciona sem nova chamada à API
      if (!force) {
        const mem = getCached(before, after)
        if (mem) {
          setSuggestion({ text: mem, source: 'memoria' })
          return
        }
      } else {
        invalidate(before, after)
      }

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const out = await fetchCompletion({
          apiKey,
          model,
          beforeCursor: before,
          afterCursor: after,
          attachments: (active?.attachments ?? []).map((a) => ({
            name: a.name,
            content: a.content,
          })),
          signal: ctrl.signal,
        })
        if (ctrl.signal.aborted) return
        if (out.trim()) {
          setCached(before, after, out)
          // se o usuário continuou digitando enquanto a API respondia,
          // guarda na memória mas não exibe a sugestão desatualizada
          if (cursorRef.current === pos && textRef.current === full) {
            setSuggestion({ text: out, source: 'api' })
          }
        } else if (force) {
          toast('A IA não encontrou continuação para este ponto.')
        }
      } catch (e) {
        if (!ctrl.signal.aborted) {
          toast.error(e instanceof Error ? e.message : 'Falha ao gerar autocomplete.')
        }
      } finally {
        if (abortRef.current === ctrl) {
          abortRef.current = null
          setLoading(false)
        }
      }
    },
    [apiKey, unlocked, model, active],
  )

  const scheduleCompletion = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void requestCompletion(false)
    }, AUTOCOMPLETE_DELAY_MS)
  }, [requestCompletion])

  const acceptSuggestion = useCallback(() => {
    setSuggestion((s) => {
      if (!s) return null
      const pos = cursorRef.current
      const full = textRef.current
      const next = full.slice(0, pos) + s.text + full.slice(pos)
      textRef.current = next
      cursorRef.current = pos + s.text.length
      updateActive({ content: next })
      setCursor(pos + s.text.length)
      editorRef.current?.setCursor(pos + s.text.length)
      return null
    })
    scheduleCompletion()
  }, [scheduleCompletion, updateActive])

  // ---------- handlers do editor ----------
  const handleChange = useCallback(
    (value: string, cursorPos: number) => {
      textRef.current = value
      cursorRef.current = cursorPos
      updateActive({ content: value })
      setCursor(cursorPos)
      setSuggestion(null)
      scheduleCompletion()
    },
    [scheduleCompletion, updateActive],
  )

  const handleCursorChange = useCallback((pos: number) => {
    if (pos !== cursorRef.current) {
      cursorRef.current = pos
      setCursor(pos)
      setSuggestion(null) // mover o cursor dispensa a sugestão, como no VS Code
    }
  }, [])

  // ---------- navegação de páginas (flip 3D) ----------
  const startFlip = useCallback(
    async (targetId: string, kind: 'flip' | 'tear' = 'flip') => {
      if (!active) return
      // muda o conteúdo do palco para espelho e fotografa a página
      let tex = ''
      try {
        tex = (await stageRef.current?.snapshot()) ?? ''
      } catch {
        /* sem textura — anima em branco */
      }
      animSeqRef.current += 1
      setAnim({ kind, tex, seq: animSeqRef.current })
      resetEditorState()
      setActiveId(targetId)
      // a animação dura ~1.1s; libera o estado depois
      window.setTimeout(() => setAnim(null), 1200)
    },
    [active, resetEditorState],
  )

  const goTo = useCallback(
    (delta: number) => {
      if (busy || activeIndex < 0) return
      const target = projects[activeIndex + delta]
      if (!target) return
      void startFlip(target.id)
    },
    [busy, activeIndex, projects, startFlip],
  )

  const addPage = useCallback(() => {
    if (busy || !active) return
    const p = newProject(`Página ${projects.length + 1}`)
    void dbPut(p)
    setProjects((prev) => [...prev, p])
    void startFlip(p.id)
    toast.success(`Nova página criada: ${p.name}`)
  }, [busy, active, projects.length, startFlip])

  // ---------- arrancar página ----------
  const deletePage = useCallback(() => {
    if (!active || busy) return
    setDeleteOpen(true)
  }, [active, busy])

  const confirmDelete = useCallback(() => {
    if (!active) return
    const rest = projects.filter((p) => p.id !== active.id)
    let nextId: string
    if (rest.length === 0) {
      const p = newProject('Página 1')
      void dbPut(p)
      setProjects([p])
      nextId = p.id
    } else {
      setProjects(rest)
      nextId = rest[Math.min(activeIndex, rest.length - 1)].id
    }
    void dbDelete(active.id)
    void startFlip(nextId, 'tear')
  }, [active, projects, activeIndex, startFlip])

  // ---------- voz (Whisper) ----------
  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const startRecording = useCallback(async () => {
    if (!apiKey) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        })
        setRecState('transcribing')
        try {
          const transcript = await transcribeAudio(apiKey, blob)
          if (transcript) {
            editorRef.current?.insertAtCursor(transcript)
            toast.success('Transcrição inserida no cursor.')
          } else {
            toast('Não consegui entender o áudio.')
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Falha na transcrição.')
        } finally {
          setRecState('idle')
        }
      }
      recorderRef.current = rec
      rec.start()
      setRecState('recording')
      toast.info('Gravando… toque no microfone novamente para parar.')
    } catch {
      toast.error('Não foi possível acessar o microfone. Verifique a permissão.')
    }
  }, [apiKey])

  // ---------- anexos (por página) ----------
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !active) return
      const added: Attachment[] = []
      for (const f of Array.from(files)) {
        if (f.size > 400_000) {
          toast.error(`${f.name}: grande demais (máx. 400 KB).`)
          continue
        }
        try {
          const content = (await f.text()).slice(0, 50_000)
          added.push({ id: crypto.randomUUID(), name: f.name, content })
        } catch {
          toast.error(`${f.name}: não foi possível ler como texto.`)
        }
      }
      if (added.length > 0) {
        updateActive({ attachments: [...active.attachments, ...added] })
        toast.success(
          added.length === 1
            ? `${added[0].name} anexado ao contexto.`
            : `${added.length} arquivos anexados ao contexto.`,
        )
      }
    },
    [active, updateActive],
  )

  const removeAttachment = useCallback(
    (id: string) => {
      if (!active) return
      updateActive({ attachments: active.attachments.filter((a) => a.id !== id) })
    },
    [active, updateActive],
  )

  // ---------- fullscreen (elemento raiz + fallback) ----------
  const toggleFullscreen = useCallback(async () => {
    if (pseudoFs) {
      setPseudoFs(false)
      return
    }
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // fallback para contextos que bloqueiam a Fullscreen API (ex.: iframes)
      setPseudoFs((v) => !v)
    }
  }, [pseudoFs])

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const fullscreenActive = isFullscreen || pseudoFs

  // ---------- derivados ----------
  const content = active?.content ?? ''
  const words = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content],
  )
  const { line, col } = useMemo(() => {
    const before = content.slice(0, cursor)
    const lines = before.split('\n')
    return { line: lines.length, col: lines[lines.length - 1].length + 1 }
  }, [content, cursor])

  const keyDot =
    keyStatus === 'valid'
      ? 'bg-[#50fa7b]'
      : keyStatus === 'invalid'
        ? 'bg-[#ff5555]'
        : keyStatus === 'checking'
          ? 'bg-[#8be9fd] animate-pulse'
          : 'bg-[#6272a4]'

  const modeBtn = (m: ViewMode) =>
    `h-8 w-8 rounded-md p-1.5 transition-colors flex-none ${
      mode === m
        ? 'bg-[#bd93f9] text-[#282a36]'
        : 'text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]'
    }`

  const createdDate = active ? new Date(active.createdAt) : null

  const pageHeader = active && createdDate && (
    <>
      <input
        className="page-name"
        value={active.name}
        onChange={(e) => updateActive({ name: e.target.value })}
        aria-label="Nome da página"
        spellCheck={false}
      />
      <span className="page-meta">
        <span className="date-label">Data:</span>
        <span className="date-blank">{String(createdDate.getDate()).padStart(2, '0')}</span>
        <span className="date-sep">/</span>
        <span className="date-blank">
          {String(createdDate.getMonth() + 1).padStart(2, '0')}
        </span>
        <span className="date-sep">/</span>
        <span className="date-blank date-year">{createdDate.getFullYear()}</span>
        <span className="page-count">
          {' '}
          · {activeIndex + 1}/{projects.length}
        </span>
      </span>
    </>
  )

  const attachCount = active?.attachments.length ?? 0

  return (
    <div
      className={`app-root ${fullscreenActive ? 'is-fullscreen' : ''} ${
        pseudoFs ? 'pseudo-fs' : ''
      }`}
    >
      {/* ================= Barra de ferramentas ================= */}
      <header className="toolbar">
        {/* hambúrguer (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          title="Abrir menu"
          onClick={() => setDrawerOpen(true)}
          className="h-9 w-9 flex-none text-[#f8f8f2] hover:bg-[#44475a] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex flex-none items-center gap-2 pr-1">
          <Ghost className="h-5 w-5 text-[#bd93f9]" />
          <span className="hidden text-sm font-bold sm:inline">
            Cadern<span className="text-[#bd93f9]">IA</span>
          </span>
        </div>

        {/* ações desktop */}
        <div className="hidden flex-1 items-center gap-1.5 md:flex">
          <div className="toolbar-sep" />

          {/* navegação de páginas */}
          <Button
            variant="ghost"
            size="icon"
            title="Página anterior"
            disabled={busy || activeIndex <= 0}
            onClick={() => goTo(-1)}
            className="h-9 w-9 flex-none text-[#8be9fd] hover:bg-[#44475a] hover:text-[#8be9fd] disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Próxima página"
            disabled={busy || activeIndex < 0 || activeIndex >= projects.length - 1}
            onClick={() => goTo(1)}
            className="h-9 w-9 flex-none text-[#8be9fd] hover:bg-[#44475a] hover:text-[#8be9fd] disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Nova página (projeto)"
            disabled={busy}
            onClick={addPage}
            className="h-9 w-9 flex-none text-[#50fa7b] hover:bg-[#44475a] hover:text-[#50fa7b]"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Arrancar esta página"
            disabled={busy}
            onClick={deletePage}
            className="h-9 w-9 flex-none text-[#ff5555] hover:bg-[#44475a] hover:text-[#ff5555]"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* download da nota */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Baixar esta nota"
                className="h-9 w-9 flex-none text-[#f1fa8c] hover:bg-[#44475a] hover:text-[#f1fa8c]"
              >
                <Download className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
              <DropdownMenuItem
                onClick={() => active && downloadNote(active, 'md')}
                className="cursor-pointer focus:bg-[#44475a] focus:text-[#f8f8f2]"
              >
                <FileText className="mr-2 h-4 w-4 text-[#bd93f9]" />
                Baixar como Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => active && downloadNote(active, 'txt')}
                className="cursor-pointer focus:bg-[#44475a] focus:text-[#f8f8f2]"
              >
                <FileType2 className="mr-2 h-4 w-4 text-[#8be9fd]" />
                Baixar como texto (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="toolbar-sep" />

          {/* retry do autocomplete */}
          <Button
            variant="ghost"
            size="icon"
            title="Tentar autocomplete novamente (ignora a memória)"
            disabled={loading}
            onClick={() => void requestCompletion(true)}
            className="h-9 w-9 flex-none text-[#8be9fd] hover:bg-[#44475a] hover:text-[#8be9fd]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>

          {/* microfone */}
          <Button
            variant="ghost"
            size="icon"
            title={
              recState === 'recording' ? 'Parar gravação e transcrever' : 'Ditar com Whisper'
            }
            disabled={recState === 'transcribing'}
            onClick={() =>
              recState === 'recording' ? stopRecording() : void startRecording()
            }
            className={`h-9 w-9 flex-none hover:bg-[#44475a] ${
              recState === 'recording'
                ? 'rec-pulse text-[#ff5555] hover:text-[#ff5555]'
                : 'text-[#50fa7b] hover:text-[#50fa7b]'
            }`}
          >
            {recState === 'transcribing' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : recState === 'recording' ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          {/* anexos — custom select */}
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Arquivos de contexto desta página"
                className="relative h-9 w-9 flex-none text-[#ffb86c] hover:bg-[#44475a] hover:text-[#ffb86c]"
              >
                <Paperclip className="h-5 w-5" />
                {attachCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ffb86c] px-1 text-[10px] font-bold text-[#282a36]">
                    {attachCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 border-[#44475a] bg-[#282a36] p-3 text-[#f8f8f2]"
            >
              <AttachmentsPanel
                attachments={active?.attachments ?? []}
                onRemove={removeAttachment}
                onAdd={() => fileInputRef.current?.click()}
              />
            </PopoverContent>
          </Popover>

          <div className="toolbar-sep" />

          {/* modos de visualização */}
          <div className="flex flex-none items-center gap-0.5 rounded-lg border border-[#44475a] bg-[#282a36] p-0.5">
            <button
              title="Editar"
              className={modeBtn('edit')}
              onClick={() => setMode('edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              title="Editar e visualizar"
              className={modeBtn('split')}
              onClick={() => setMode('split')}
            >
              <Columns2 className="h-4 w-4" />
            </button>
            <button
              title="Visualizar Markdown"
              className={modeBtn('preview')}
              onClick={() => setMode('preview')}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            title={fullscreenActive ? 'Sair da tela cheia' : 'Tela cheia'}
            onClick={() => void toggleFullscreen()}
            className="h-9 w-9 flex-none text-[#f1fa8c] hover:bg-[#44475a] hover:text-[#f1fa8c]"
          >
            {fullscreenActive ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>

          {/* chave */}
          <Button
            variant="ghost"
            size="icon"
            title="Chave da OpenAI"
            onClick={() => setKeyDialogOpen(true)}
            className="relative h-9 w-9 flex-none text-[#bd93f9] hover:bg-[#44475a] hover:text-[#bd93f9]"
          >
            <KeyRound className="h-5 w-5" />
            <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${keyDot}`} />
          </Button>
        </div>

        {/* indicador de página no mobile */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <span className="text-xs text-[#6272a4]">
            {activeIndex + 1}/{projects.length}
          </span>
        </div>
      </header>

      {/* ================= Palco 3D + folha interativa ================= */}
      <div className="stage-wrap">
        <NotepadScene anim={anim} onLayout={setPageRect} />

        {/* folha interativa projetada sobre o caderno 3D */}
        {dbReady && active && pageRect && (
          <div
            className="sheet-overlay"
            style={{
              left: pageRect.left,
              top: pageRect.top,
              width: pageRect.width,
              height: pageRect.height,
              ['--editor-lh' as string]: `${Math.round(fontSize * 1.65)}px`,
            }}
          >
            <div className="sheet-holes" aria-hidden>
              {Array.from({ length: 13 }).map((_, i) => (
                <span key={i} className="sheet-hole" />
              ))}
            </div>
            <div className="sheet-header">{pageHeader}</div>
            <div className="sheet-body">
              {mode === 'edit' && (
                <GhostEditor
                  key={active.id}
                  ref={editorRef}
                  value={content}
                  cursor={cursor}
                  onChange={handleChange}
                  onCursorChange={handleCursorChange}
                  suggestion={suggestion?.text ?? null}
                  onAcceptSuggestion={acceptSuggestion}
                  onDismissSuggestion={() => setSuggestion(null)}
                  onManualTrigger={() => void requestCompletion(false)}
                  fontSize={fontSize}
                />
              )}
              {mode === 'preview' && <MarkdownPreview source={content} />}
              {mode === 'split' && (
                <div className="grid h-full grid-cols-2">
                  <div className="relative min-w-0 border-r border-[#44475a]">
                    <GhostEditor
                      key={active.id}
                      ref={editorRef}
                      value={content}
                      cursor={cursor}
                      onChange={handleChange}
                      onCursorChange={handleCursorChange}
                      suggestion={suggestion?.text ?? null}
                      onAcceptSuggestion={acceptSuggestion}
                      onDismissSuggestion={() => setSuggestion(null)}
                      onManualTrigger={() => void requestCompletion(false)}
                      fontSize={fontSize}
                    />
                  </div>
                  <div className="relative min-w-0">
                    <MarkdownPreview source={content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!dbReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-[#6272a4]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo o bloco…
          </div>
        )}

        {/* palco off-screen: fotografado para virar textura da página 3D */}
        {active && pageRect && (
          <PageTexture
            ref={stageRef}
            width={Math.max(2, Math.round(pageRect.width * 1.5))}
            height={Math.max(2, Math.round(pageRect.height * 1.5))}
            variant="mirror"
          >
            <div
              className="ghost-editor-wrap"
              style={{
                ['--editor-font-size' as string]: `${fontSize * 1.5}px`,
                ['--editor-lh' as string]: `${Math.round(fontSize * 1.65 * 1.5)}px`,
              }}
            >
              <div
                className="ghost-editor-mirror"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${Math.round(fontSize * 1.65 * 1.5) - 1}px, var(--rule-line) ${Math.round(fontSize * 1.65 * 1.5) - 1}px, var(--rule-line) ${Math.round(fontSize * 1.65 * 1.5)}px)`,
                }}
                dangerouslySetInnerHTML={{
                  __html: staticMirrorHtml(content),
                }}
              />
            </div>
          </PageTexture>
        )}
      </div>

      {/* ================= Barra de status ================= */}
      <footer className="flex flex-none items-center gap-3 border-t border-[#44475a] bg-[#21222c] px-3 py-1.5 text-xs text-[#6272a4] sm:px-4">
        <span className="whitespace-nowrap">
          Ln {line}, Col {col}
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{words} palavras</span>
        <span className="hidden whitespace-nowrap text-[#ffb86c]/70 md:inline">
          salvo no IndexedDB
        </span>

        {loading && (
          <span className="flex items-center gap-1 text-[#8be9fd]">
            <Loader2 className="h-3 w-3 animate-spin" /> gerando…
          </span>
        )}
        {suggestion && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
              suggestion.source === 'memoria'
                ? 'bg-[#8be9fd]/15 text-[#8be9fd]'
                : 'bg-[#bd93f9]/15 text-[#bd93f9]'
            }`}
          >
            {suggestion.source === 'memoria' ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> da memória
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" /> via API
              </>
            )}
          </span>
        )}

        <div className="flex-1" />

        {!isTouch && (
          <span className="hidden whitespace-nowrap lg:inline">
            Tab aceita · Esc dispensa · Ctrl+Espaço completa
          </span>
        )}

        <div className="flex items-center gap-0.5">
          <button
            title="Diminuir fonte"
            onClick={() => setFontSize((s) => Math.max(13, s - 1))}
            className="rounded px-1.5 py-0.5 text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            A−
          </button>
          <span className="w-6 text-center">{fontSize}</span>
          <button
            title="Aumentar fonte"
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="rounded px-1.5 py-0.5 text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            A+
          </button>
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="hidden h-7 w-36 border-[#44475a] bg-[#282a36] text-xs text-[#8be9fd] sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
            {MODELS.map((m) => (
              <SelectItem
                key={m}
                value={m}
                className="text-xs focus:bg-[#44475a] focus:text-[#f8f8f2]"
              >
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </footer>

      {/* ================= Botão flutuante (touch) ================= */}
      {isTouch && mode !== 'preview' && (
        <button
          onClick={() =>
            suggestion ? acceptSuggestion() : void requestCompletion(false)
          }
          title={suggestion ? 'Aceitar sugestão' : 'Gerar autocomplete'}
          className="fade-in-up fixed bottom-16 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#bd93f9] text-[#282a36] shadow-xl shadow-black/40 active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : suggestion ? (
            <CornerDownLeft className="h-6 w-6" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </button>
      )}

      {/* ================= Menu lateral (mobile) ================= */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-80 overflow-y-auto border-r border-[#44475a] bg-[#21222c] p-0 text-[#f8f8f2]"
        >
          <SheetHeader className="border-b border-[#44475a] px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-[#f8f8f2]">
              <Ghost className="h-5 w-5 text-[#bd93f9]" />
              Cadern<span className="text-[#bd93f9]">IA</span>
            </SheetTitle>
          </SheetHeader>

          {/* páginas */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              Páginas · {activeIndex + 1}/{projects.length}
            </div>
            <div className="drawer-grid">
              <button
                className="drawer-btn"
                disabled={busy || activeIndex <= 0}
                onClick={() => {
                  goTo(-1)
                  setDrawerOpen(false)
                }}
              >
                <ChevronLeft className="h-5 w-5 text-[#8be9fd]" />
                Anterior
              </button>
              <button
                className="drawer-btn"
                disabled={busy || activeIndex < 0 || activeIndex >= projects.length - 1}
                onClick={() => {
                  goTo(1)
                  setDrawerOpen(false)
                }}
              >
                <ChevronRight className="h-5 w-5 text-[#8be9fd]" />
                Próxima
              </button>
              <button
                className="drawer-btn"
                disabled={busy}
                onClick={() => {
                  addPage()
                  setDrawerOpen(false)
                }}
              >
                <Plus className="h-5 w-5 text-[#50fa7b]" />
                Nova
              </button>
              <button
                className="drawer-btn"
                disabled={busy}
                onClick={() => {
                  deletePage()
                  setDrawerOpen(false)
                }}
              >
                <Trash2 className="h-5 w-5 text-[#ff5555]" />
                Arrancar
              </button>
            </div>
          </div>

          {/* contexto */}
          <div className="drawer-section">
            <AttachmentsPanel
              attachments={active?.attachments ?? []}
              onRemove={removeAttachment}
              onAdd={() => fileInputRef.current?.click()}
            />
          </div>

          {/* IA */}
          <div className="drawer-section">
            <div className="drawer-section-title">Inteligência artificial</div>
            <div className="drawer-grid">
              <button
                className="drawer-btn"
                disabled={loading}
                onClick={() => {
                  void requestCompletion(true)
                  setDrawerOpen(false)
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#8be9fd]" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-[#8be9fd]" />
                )}
                Retry
              </button>
              <button
                className="drawer-btn"
                disabled={recState === 'transcribing'}
                onClick={() => {
                  if (recState === 'recording') stopRecording()
                  else void startRecording()
                  setDrawerOpen(false)
                }}
              >
                {recState === 'transcribing' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#50fa7b]" />
                ) : recState === 'recording' ? (
                  <MicOff className="h-5 w-5 text-[#ff5555]" />
                ) : (
                  <Mic className="h-5 w-5 text-[#50fa7b]" />
                )}
                Ditar
              </button>
              <button className="drawer-btn" onClick={() => setFontSize((s) => Math.max(13, s - 1))}>
                <span className="text-base font-bold text-[#f1fa8c]">A−</span>
                Fonte
              </button>
              <button className="drawer-btn" onClick={() => setFontSize((s) => Math.min(24, s + 1))}>
                <span className="text-base font-bold text-[#f1fa8c]">A+</span>
                Fonte
              </button>
            </div>
            <div className="mt-3">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 w-full border-[#44475a] bg-[#282a36] text-xs text-[#8be9fd]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
                  {MODELS.map((m) => (
                    <SelectItem
                      key={m}
                      value={m}
                      className="text-xs focus:bg-[#44475a] focus:text-[#f8f8f2]"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* nota */}
          <div className="drawer-section">
            <div className="drawer-section-title">Esta nota</div>
            <div className="drawer-grid">
              <button
                className="drawer-btn"
                onClick={() => {
                  setMode('edit')
                  setDrawerOpen(false)
                }}
              >
                <Pencil className="h-5 w-5 text-[#bd93f9]" />
                Editar
              </button>
              <button
                className="drawer-btn"
                onClick={() => {
                  setMode('preview')
                  setDrawerOpen(false)
                }}
              >
                <Eye className="h-5 w-5 text-[#bd93f9]" />
                Markdown
              </button>
              <button
                className="drawer-btn"
                onClick={() => {
                  if (active) downloadNote(active, 'md')
                  setDrawerOpen(false)
                }}
              >
                <FileText className="h-5 w-5 text-[#f1fa8c]" />
                .md
              </button>
              <button
                className="drawer-btn"
                onClick={() => {
                  if (active) downloadNote(active, 'txt')
                  setDrawerOpen(false)
                }}
              >
                <FileType2 className="h-5 w-5 text-[#8be9fd]" />
                .txt
              </button>
            </div>
          </div>

          {/* exibição e conta */}
          <div className="drawer-section">
            <div className="drawer-section-title">Exibição e conta</div>
            <div className="drawer-grid">
              <button
                className="drawer-btn"
                onClick={() => {
                  void toggleFullscreen()
                  setDrawerOpen(false)
                }}
              >
                {fullscreenActive ? (
                  <Minimize2 className="h-5 w-5 text-[#f1fa8c]" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-[#f1fa8c]" />
                )}
                Tela
              </button>
              <button
                className="drawer-btn"
                onClick={() => {
                  setKeyDialogOpen(true)
                  setDrawerOpen(false)
                }}
              >
                <KeyRound className="h-5 w-5 text-[#bd93f9]" />
                Chave
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ApiKeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        apiKey={apiKey}
        status={keyStatus}
        statusMessage={keyError}
        onSave={saveKey}
        onValidate={runValidation}
      />

      {/* confirmação de arrancar página */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#ff5555]">
              <Trash2 className="h-5 w-5" />
              Arrancar página
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6272a4]">
              A página "{active?.name}" será arrancada do bloco e apagada para
              sempre, junto com seus {active?.attachments.length ?? 0} anexo(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#44475a] bg-transparent text-[#f8f8f2] hover:bg-[#44475a] hover:text-[#f8f8f2]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ff5555] font-semibold text-[#282a36] hover:bg-[#ff5555]/85"
            >
              Arrancar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* input de arquivos (compartilhado) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.markdown,.js,.jsx,.ts,.tsx,.py,.json,.html,.css,.csv,.xml,.yml,.yaml,.java,.c,.cpp,.go,.rs,.sql,.sh,.log,text/*"
        onChange={(e) => {
          void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* ================= Bloqueio até ter chave válida ================= */}
      {!unlocked && (
        <LockScreen
          initialKey={apiKey}
          status={keyStatus}
          error={keyError}
          checkingStored={!storedChecked}
          onSubmit={handleLockSubmit}
        />
      )}

      <Toaster
        theme="dark"
        position="bottom-left"
        toastOptions={{
          style: {
            background: '#21222c',
            border: '1px solid #44475a',
            color: '#f8f8f2',
            fontFamily: "'Fira Code', monospace",
          },
        }}
      />
    </div>
  )
}
