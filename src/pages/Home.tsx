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
  Github,
  HelpCircle,
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
  Redo2,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react'
import GhostEditor, {
  staticMirrorHtml,
  type GhostEditorHandle,
} from '@/components/GhostEditor'
import MarkdownPreview from '@/components/MarkdownPreview'
import ApiKeyDialog, { type KeyStatus } from '@/components/ApiKeyDialog'
import LockScreen from '@/components/LockScreen'
import PageSheet, { type LeavingPage } from '@/components/PageSheet'
import AttachmentsPanel from '@/components/AttachmentsPanel'
import GitHubContextDialog from '@/components/GitHubContextDialog'
import AiEditDialog from '@/components/AiEditDialog'
import TutorialDialog from '@/components/TutorialDialog'
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
import {
  applyInstruction,
  classifyUtterance,
  fetchCompletion,
  transcribeAudio,
  validateApiKey,
} from '@/lib/openai'
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

interface HistoryItem {
  content: string
  cursor: number
}

type ViewMode = 'edit' | 'split' | 'preview'
type RecState = 'idle' | 'recording' | 'transcribing'

const LS = {
  key: 'noteghost_api_key',
  legacyText: 'noteghost_text',
  model: 'noteghost_model',
  fontSize: 'noteghost_font_size',
  githubPat: 'noteghost_github_pat',
  tutorial: 'noteghost_tutorial_seen',
}

const MODEL_OPTIONS = [
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'gpt-5.5', label: 'GPT-5.5' },
  { id: 'o4-mini', label: 'o4-mini' },
  { id: 'o3', label: 'o3' },
]
const DEFAULT_MODEL = MODEL_OPTIONS[1].id
const AUTOCOMPLETE_DELAY_MS = 800

export default function Home() {
  // ---------- projetos (páginas) ----------
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(false)
  const [leaving, setLeaving] = useState<LeavingPage | null>(null)

  // ---------- editor ----------
  const [cursor, setCursor] = useState(0)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ViewMode>('edit')
  const [history, setHistory] = useState<{ past: HistoryItem[]; future: HistoryItem[] }>({
    past: [],
    future: [],
  })
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem(LS.fontSize)) || 17,
  )

  // ---------- OpenAI ----------
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS.key) ?? '')
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle')
  const [keyError, setKeyError] = useState<string | undefined>()
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [storedChecked, setStoredChecked] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem(LS.model) ?? DEFAULT_MODEL)

  // ---------- extras ----------
  const [recState, setRecState] = useState<RecState>('idle')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pseudoFs, setPseudoFs] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [githubDialogOpen, setGithubDialogOpen] = useState(false)
  const [githubPat, setGithubPat] = useState(() => localStorage.getItem(LS.githubPat) ?? '')

  // ---------- tutorial ----------
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialSeen, setTutorialSeen] = useState(
    () => localStorage.getItem(LS.tutorial) === '1',
  )

  // ---------- editar com IA ----------
  const [aiEditOpen, setAiEditOpen] = useState(false)
  const [aiEditPreview, setAiEditPreview] = useState<string | null>(null)
  const [aiEditLoading, setAiEditLoading] = useState(false)
  const [aiEditSelection, setAiEditSelection] = useState<{
    start: number
    end: number
  } | null>(null)

  // ---------- refs ----------
  const textRef = useRef('')
  const cursorRef = useRef(0)
  const isAcceptingRef = useRef(false)
  const debounceRef = useRef<number | undefined>(undefined)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const editorRef = useRef<GhostEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const isTouch = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window),
    [],
  )

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId],
  )
  const activeIndex = useMemo(
    () => projects.findIndex((p) => p.id === activeId),
    [projects, activeId],
  )
  const unlocked = keyStatus === 'valid'
  const busy = leaving !== null

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
  useEffect(() => {
    localStorage.setItem(LS.githubPat, githubPat)
  }, [githubPat])

  useEffect(() => {
    localStorage.setItem(LS.tutorial, tutorialSeen ? '1' : '0')
  }, [tutorialSeen])

  // ---------- tutorial ----------
  useEffect(() => {
    if (dbReady && unlocked && !tutorialSeen) {
      setTutorialOpen(true)
    }
  }, [dbReady, unlocked, tutorialSeen])

  const markTutorialSeen = useCallback(() => {
    setTutorialSeen(true)
    setTutorialOpen(false)
  }, [])

  const reopenTutorial = useCallback(() => {
    setTutorialOpen(true)
  }, [])

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
    setHistory({ past: [], future: [] })
  }, [])

  // ---------- histórico (undo/redo) ----------
  const recordHistory = useCallback(() => {
    const current = { content: textRef.current, cursor: cursorRef.current }
    setHistory((h) => {
      const last = h.past[h.past.length - 1]
      if (last && last.content === current.content && last.cursor === current.cursor) return h
      return { past: [...h.past, current], future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h
      const prev = h.past[h.past.length - 1]
      const current = { content: textRef.current, cursor: cursorRef.current }
      textRef.current = prev.content
      cursorRef.current = prev.cursor
      updateActive({ content: prev.content })
      setCursor(prev.cursor)
      setSuggestion(null)
      editorRef.current?.setCursor(prev.cursor)
      return { past: h.past.slice(0, -1), future: [...h.future, current] }
    })
  }, [updateActive])

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h
      const next = h.future[h.future.length - 1]
      const current = { content: textRef.current, cursor: cursorRef.current }
      textRef.current = next.content
      cursorRef.current = next.cursor
      updateActive({ content: next.content })
      setCursor(next.cursor)
      setSuggestion(null)
      editorRef.current?.setCursor(next.cursor)
      return { past: [...h.past, current], future: h.future.slice(0, -1) }
    })
  }, [updateActive])

  // ---------- editar com IA ----------
  const openAiEdit = useCallback(() => {
    const sel = editorRef.current?.getSelection() ?? { start: 0, end: 0 }
    setAiEditSelection(sel.start === sel.end ? null : sel)
    setAiEditPreview(null)
    setAiEditOpen(true)
  }, [])

  const handleAiEditGenerate = useCallback(
    async (instruction: string, onlySelection: boolean) => {
      if (!apiKey || !unlocked) return
      setAiEditLoading(true)
      setAiEditPreview(null)
      try {
        const full = textRef.current
        const selected =
          aiEditSelection && onlySelection
            ? full.slice(aiEditSelection.start, aiEditSelection.end)
            : undefined
        const result = await applyInstruction({
          apiKey,
          model,
          instruction,
          fullText: full,
          selectedText: selected,
        })
        setAiEditPreview(result)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao gerar edição.')
      } finally {
        setAiEditLoading(false)
      }
    },
    [apiKey, unlocked, model, aiEditSelection],
  )

  const handleAiEditApply = useCallback(() => {
    if (!aiEditPreview) return
    recordHistory()
    if (!aiEditSelection) {
      const next = aiEditPreview
      textRef.current = next
      updateActive({ content: next })
      setCursor(next.length)
      editorRef.current?.setCursor(next.length)
    } else {
      const full = textRef.current
      const before = full.slice(0, aiEditSelection.start)
      const after = full.slice(aiEditSelection.end)
      const next = before + aiEditPreview + after
      const pos = aiEditSelection.start + aiEditPreview.length
      textRef.current = next
      updateActive({ content: next })
      setCursor(pos)
      editorRef.current?.setCursor(pos)
    }
    setAiEditOpen(false)
    setAiEditPreview(null)
    toast.success('Edição aplicada.')
  }, [aiEditPreview, aiEditSelection, recordHistory, updateActive])

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
    if (!suggestion || isAcceptingRef.current) return
    isAcceptingRef.current = true
    recordHistory()
    const pos = cursorRef.current
    const full = textRef.current
    const next = full.slice(0, pos) + suggestion.text + full.slice(pos)
    textRef.current = next
    cursorRef.current = pos + suggestion.text.length
    updateActive({ content: next })
    setCursor(pos + suggestion.text.length)
    editorRef.current?.setCursor(pos + suggestion.text.length)
    setSuggestion(null)
    scheduleCompletion()
  }, [suggestion, recordHistory, scheduleCompletion, updateActive])

  // libera a trava de aceitação quando a sugestão for efetivamente dispensada
  useEffect(() => {
    if (!suggestion) {
      isAcceptingRef.current = false
    }
  }, [suggestion])

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

  // ---------- cabeçalho da folha ----------
  const pageHeader = useMemo(() => {
    if (!active) return null
    const createdDate = new Date(active.createdAt)
    return (
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
  }, [active, activeIndex, projects.length, updateActive])

  // ---------- navegação de páginas (slide CSS) ----------
  const startPageTransition = useCallback(
    (targetId: string, kind: 'slide' | 'tear' = 'slide') => {
      if (!active) return
      const direction =
        projects.findIndex((p) => p.id === targetId) > activeIndex ? 'next' : 'prev'
      setLeaving({
        kind,
        direction,
        header: pageHeader,
        bodyHtml: staticMirrorHtml(active.content),
      })
      resetEditorState()
      setActiveId(targetId)
      // libera o estado após a animação CSS
      window.setTimeout(() => setLeaving(null), kind === 'tear' ? 700 : 450)
    },
    [active, activeIndex, pageHeader, projects, resetEditorState],
  )

  const goTo = useCallback(
    (delta: number) => {
      if (busy || activeIndex < 0) return
      const target = projects[activeIndex + delta]
      if (!target) return
      void startPageTransition(target.id)
    },
    [busy, activeIndex, projects, startPageTransition],
  )

  const addPage = useCallback(() => {
    if (busy || !active) return
    const p = newProject(`Página ${projects.length + 1}`)
    void dbPut(p)
    setProjects((prev) => [...prev, p])
    void startPageTransition(p.id)
    toast.success(`Nova página criada: ${p.name}`)
  }, [busy, active, projects.length, startPageTransition])

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
    void startPageTransition(nextId, 'tear')
  }, [active, projects, activeIndex, startPageTransition])

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
          if (!transcript) {
            toast('Não consegui entender o áudio.')
            setRecState('idle')
            return
          }
          const classified = await classifyUtterance(
            apiKey,
            model,
            transcript,
            textRef.current,
          )
          if (classified.type === 'transcription') {
            recordHistory()
            editorRef.current?.insertAtCursor(classified.payload)
            toast.success('Transcrição inserida no cursor.')
          } else {
            toast.info('Comando de edição detectado.')
            recordHistory()
            const edited = await applyInstruction({
              apiKey,
              model,
              instruction: classified.payload,
              fullText: textRef.current,
            })
            textRef.current = edited
            updateActive({ content: edited })
            setCursor(edited.length)
            editorRef.current?.setCursor(edited.length)
            toast.success('Edição aplicada pelo comando de voz.')
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
  }, [apiKey, model, recordHistory, updateActive])

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

  const importGitHubAttachments = useCallback(
    (attachments: Attachment[]) => {
      if (!active || attachments.length === 0) return
      updateActive({ attachments: [...active.attachments, ...attachments] })
      setGithubDialogOpen(false)
      toast.success(
        attachments.length === 1
          ? `${attachments[0].name} importado do GitHub.`
          : `${attachments.length} arquivos importados do GitHub.`,
      )
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

          {/* editar com IA */}
          <Button
            variant="ghost"
            size="icon"
            title="Editar com IA"
            onClick={openAiEdit}
            className="h-9 w-9 flex-none text-[#bd93f9] hover:bg-[#44475a] hover:text-[#bd93f9]"
          >
            <Wand2 className="h-5 w-5" />
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

          {/* contexto do GitHub */}
          <Button
            variant="ghost"
            size="icon"
            title="Importar contexto do GitHub"
            onClick={() => setGithubDialogOpen(true)}
            className="h-9 w-9 flex-none text-[#f8f8f2] hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            <Github className="h-5 w-5" />
          </Button>

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

      {/* ================= Folha full-page com flip CSS ================= */}
      <div className="stage-wrap">
        {dbReady && active && (
          <PageSheet
            header={pageHeader}
            fontSize={fontSize}
            leaving={leaving}
            onLeavingEnd={() => setLeaving(null)}
          >
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
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                fontSize={fontSize}
              />
            )}
            {mode === 'preview' && <MarkdownPreview source={content} />}
            {mode === 'split' && (
              <div className="grid flex-1 grid-cols-2">
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
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    fontSize={fontSize}
                  />
                </div>
                <div className="relative min-w-0">
                  <MarkdownPreview source={content} />
                </div>
              </div>
            )}
          </PageSheet>
        )}

        {!dbReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-[#6272a4]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo o bloco…
          </div>
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
          <SelectTrigger className="hidden h-7 w-40 border-[#44475a] bg-[#282a36] text-xs text-[#8be9fd] sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
            {MODEL_OPTIONS.map((m) => (
              <SelectItem
                key={m.id}
                value={m.id}
                className="text-xs focus:bg-[#44475a] focus:text-[#f8f8f2]"
              >
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </footer>

      {/* ================= Ações rápidas flutuantes no mobile (touch) ================= */}
      {isTouch && mode !== 'preview' && (
        <div className="fade-in-up fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#44475a] bg-[#21222c]/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-sm">
          <button
            onClick={() =>
              recState === 'recording' ? stopRecording() : void startRecording()
            }
            title={recState === 'recording' ? 'Parar gravação' : 'Ditar com Whisper'}
            disabled={recState === 'transcribing'}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 ${
              recState === 'recording'
                ? 'rec-pulse bg-[#ff5555]/20 text-[#ff5555]'
                : 'bg-[#50fa7b]/15 text-[#50fa7b]'
            }`}
          >
            {recState === 'transcribing' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : recState === 'recording' ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => void undo()}
            title="Desfazer"
            disabled={!canUndo}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8be9fd]/15 text-[#8be9fd] transition-transform active:scale-95 disabled:opacity-30"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => void redo()}
            title="Refazer"
            disabled={!canRedo}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8be9fd]/15 text-[#8be9fd] transition-transform active:scale-95 disabled:opacity-30"
          >
            <Redo2 className="h-5 w-5" />
          </button>
          {suggestion ? (
            <button
              onClick={() => acceptSuggestion()}
              title="Aceitar sugestão"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bd93f9] text-[#282a36] transition-transform active:scale-95"
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                openAiEdit()
              }}
              title="Editar com IA"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bd93f9]/15 text-[#bd93f9] transition-transform active:scale-95"
            >
              <Wand2 className="h-5 w-5" />
            </button>
          )}
        </div>
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
            <button
              className="drawer-btn mt-3 w-full"
              onClick={() => {
                setGithubDialogOpen(true)
                setDrawerOpen(false)
              }}
            >
              <Github className="h-5 w-5 text-[#f8f8f2]" />
              Contexto do GitHub
            </button>
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
              <button
                className="drawer-btn"
                onClick={() => {
                  openAiEdit()
                  setDrawerOpen(false)
                }}
              >
                <Wand2 className="h-5 w-5 text-[#bd93f9]" />
                IA edit
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
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="text-xs focus:bg-[#44475a] focus:text-[#f8f8f2]"
                    >
                      {m.label}
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

          {/* ajuda */}
          <div className="drawer-section">
            <div className="drawer-section-title">Ajuda</div>
            <div className="drawer-grid">
              <button
                className="drawer-btn"
                onClick={() => {
                  reopenTutorial()
                  setDrawerOpen(false)
                }}
              >
                <HelpCircle className="h-5 w-5 text-[#8be9fd]" />
                Tutorial
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

      <GitHubContextDialog
        open={githubDialogOpen}
        onOpenChange={setGithubDialogOpen}
        storedPat={githubPat}
        onPatChange={setGithubPat}
        onImport={importGitHubAttachments}
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

      <TutorialDialog
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        onFinish={markTutorialSeen}
      />

      <AiEditDialog
        open={aiEditOpen}
        onOpenChange={setAiEditOpen}
        hasSelection={Boolean(aiEditSelection)}
        preview={aiEditPreview}
        loading={aiEditLoading}
        onGenerate={handleAiEditGenerate}
        onApply={handleAiEditApply}
      />

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
