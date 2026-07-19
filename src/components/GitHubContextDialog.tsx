import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Github,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  type GitHubBranch,
  type GitHubRepo,
  type GitHubTreeItem,
  fetchBranches,
  fetchFileContent,
  fetchTree,
  fetchUserRepos,
  formatFileSize,
  isPathSelectable,
  validateGitHubPat,
} from '@/lib/github'
import type { Attachment } from '@/lib/db'

interface GitHubContextDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storedPat: string
  onPatChange: (pat: string) => void
  onImport: (attachments: Attachment[]) => void
}

type Step = 'pat' | 'repo' | 'files'

interface TreeNode {
  path: string
  name: string
  type: 'tree' | 'blob'
  size?: number
  children: TreeNode[]
}

function buildTree(items: GitHubTreeItem[]): TreeNode[] {
  const root: TreeNode = { path: '', name: '', type: 'tree', children: [] }
  const selectable = items.filter((i) => i.type === 'tree' || isPathSelectable(i.path))
  for (const item of selectable) {
    const parts = item.path.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      const isLast = i === parts.length - 1
      let child = current.children.find((c) => c.path === path)
      if (!child) {
        child = {
          path,
          name,
          type: isLast ? item.type : 'tree',
          size: isLast ? item.size : undefined,
          children: [],
        }
        current.children.push(child)
      }
      current = child
    }
  }
  return root.children
}

function collectLeafPaths(node: TreeNode): string[] {
  if (node.type === 'blob') return [node.path]
  return node.children.flatMap(collectLeafPaths)
}

export default function GitHubContextDialog({
  open,
  onOpenChange,
  storedPat,
  onPatChange,
  onImport,
}: GitHubContextDialogProps) {
  const [step, setStep] = useState<Step>('pat')
  const [pat, setPat] = useState(storedPat)
  const [patUser, setPatUser] = useState<string>()
  const [validatingPat, setValidatingPat] = useState(false)

  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [branches, setBranches] = useState<GitHubBranch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string>('')

  const [tree, setTree] = useState<TreeNode[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const activeRepo = useMemo(
    () => repos.find((r) => r.fullName === selectedRepo),
    [repos, selectedRepo],
  )

  useEffect(() => {
    setPat(storedPat)
    if (storedPat) {
      setStep('repo')
    } else {
      setStep('pat')
    }
  }, [storedPat, open])

  const loadRepos = useCallback(async () => {
    if (!pat) return
    setReposLoading(true)
    try {
      const list = await fetchUserRepos(pat)
      setRepos(list)
    } catch {
      setRepos([])
    } finally {
      setReposLoading(false)
    }
  }, [pat])

  useEffect(() => {
    if (step === 'repo' && pat && repos.length === 0 && !reposLoading) {
      void loadRepos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pat])

  useEffect(() => {
    if (!activeRepo || !pat) return
    setBranchesLoading(true)
    fetchBranches(pat, activeRepo.owner, activeRepo.name)
      .then((list) => {
        setBranches(list)
        const branch =
          list.find((b) => b.name === activeRepo.defaultBranch)?.name ?? list[0]?.name ?? ''
        setSelectedBranch(branch)
      })
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false))
  }, [activeRepo, pat])

  const handleSavePat = useCallback(async () => {
    if (!pat.trim()) return
    setValidatingPat(true)
    const r = await validateGitHubPat(pat.trim())
    setValidatingPat(false)
    if (r.ok) {
      setPatUser(r.user?.login)
      onPatChange(pat.trim())
      setStep('repo')
      void loadRepos()
    } else {
      onPatChange('')
      toast.error(r.error ?? 'PAT inválido.')
    }
  }, [pat, onPatChange, loadRepos])

  const handleRepoNext = useCallback(async () => {
    if (!activeRepo || !selectedBranch || !pat) return
    setTreeLoading(true)
    setSelectedPaths(new Set())
    try {
      const items = await fetchTree(pat, activeRepo.owner, activeRepo.name, selectedBranch)
      const built = buildTree(items)
      setTree(built)
      // expande a primeira pasta por padrão
      if (built[0]?.type === 'tree') {
        setExpandedPaths(new Set([built[0].path]))
      }
      setStep('files')
    } finally {
      setTreeLoading(false)
    }
  }, [activeRepo, selectedBranch, pat])

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const toggleFolder = useCallback((node: TreeNode, selected: boolean) => {
    const leafPaths = collectLeafPaths(node)
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      for (const p of leafPaths) {
        if (selected) next.add(p)
        else next.delete(p)
      }
      return next
    })
  }, [])

  const handleImport = useCallback(async () => {
    if (!activeRepo || !selectedBranch || !pat || selectedPaths.size === 0) return
    setImporting(true)
    const attachments: Attachment[] = []
    const errors: string[] = []
    for (const path of selectedPaths) {
      try {
        const raw = await fetchFileContent(pat, activeRepo.owner, activeRepo.name, path, selectedBranch)
        if (raw.length > 400_000) {
          errors.push(`${path}: maior que 400 KB.`)
          continue
        }
        const content = raw.slice(0, 50_000)
        attachments.push({ id: crypto.randomUUID(), name: path, content })
      } catch {
        errors.push(path)
      }
    }
    setImporting(false)
    onImport(attachments)
    if (errors.length > 0) {
      toast.error(`${errors.length} arquivo(s) não puderam ser importados.`)
    }
  }, [activeRepo, selectedBranch, pat, selectedPaths, onImport])

  const clearPat = useCallback(() => {
    setPat('')
    onPatChange('')
    setPatUser(undefined)
    setRepos([])
    setSelectedRepo('')
    setSelectedBranch('')
    setTree([])
    setSelectedPaths(new Set())
    setStep('pat')
  }, [onPatChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-[#44475a] bg-[#282a36] p-0 text-[#f8f8f2]">
        <DialogHeader className="border-b border-[#44475a] px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-[#f8f8f2]">
            <Github className="h-5 w-5" />
            Contexto do GitHub
          </DialogTitle>
          <DialogDescription className="text-[#6272a4]">
            Importe arquivos de um repositório como contexto para a IA.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          {step === 'pat' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-pat" className="text-[#f8f8f2]">
                  Personal Access Token do GitHub
                </Label>
                <Input
                  id="github-pat"
                  type="password"
                  placeholder="ghp_..."
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  className="border-[#44475a] bg-[#21222c] text-[#f8f8f2]"
                />
                <p className="text-xs text-[#6272a4]">
                  Crie um token em{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8be9fd] underline"
                  >
                    github.com/settings/tokens
                  </a>{' '}
                  com escopo <code className="text-[#bd93f9]">repo</code> (privados) ou{' '}
                  <code className="text-[#bd93f9]">public_repo</code> (públicos).
                </p>
              </div>
              <Button
                onClick={() => void handleSavePat()}
                disabled={!pat.trim() || validatingPat}
                className="bg-[#bd93f9] text-[#282a36] hover:bg-[#bd93f9]/85"
              >
                {validatingPat ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Validar e continuar
              </Button>
            </div>
          )}

          {step === 'repo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-[#44475a] bg-[#21222c] px-3 py-2 text-sm">
                <span className="text-[#f8f8f2]">
                  Logado como <strong className="text-[#bd93f9]">{patUser ?? '...'}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadRepos()}
                    disabled={reposLoading}
                    className="h-8 text-[#8be9fd] hover:bg-[#44475a] hover:text-[#8be9fd]"
                  >
                    {reposLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPat}
                    className="h-8 text-[#ff5555] hover:bg-[#44475a] hover:text-[#ff5555]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#f8f8f2]">Repositório</Label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="border-[#44475a] bg-[#21222c] text-[#f8f8f2]">
                    <SelectValue placeholder="Escolha um repositório" />
                  </SelectTrigger>
                  <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
                    {repos.map((r) => (
                      <SelectItem
                        key={r.fullName}
                        value={r.fullName}
                        className="focus:bg-[#44475a] focus:text-[#f8f8f2]"
                      >
                        {r.fullName} {r.private ? '· privado' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#f8f8f2]">Branch</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  disabled={branchesLoading || !activeRepo}
                >
                  <SelectTrigger className="border-[#44475a] bg-[#21222c] text-[#f8f8f2]">
                    <SelectValue placeholder="Escolha uma branch" />
                  </SelectTrigger>
                  <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
                    {branches.map((b) => (
                      <SelectItem
                        key={b.name}
                        value={b.name}
                        className="focus:bg-[#44475a] focus:text-[#f8f8f2]"
                      >
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-[#6272a4]">
                <span>
                  {activeRepo?.fullName} · {selectedBranch}
                </span>
                <span>{selectedPaths.size} arquivo(s) selecionado(s)</span>
              </div>
              <ScrollArea className="h-64 rounded-md border border-[#44475a] bg-[#21222c] p-2">
                {treeLoading ? (
                  <div className="flex h-full items-center justify-center text-[#6272a4]">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando arquivos…
                  </div>
                ) : tree.length === 0 ? (
                  <p className="p-4 text-sm text-[#6272a4]">Nenhum arquivo encontrado.</p>
                ) : (
                  <TreeView
                    nodes={tree}
                    selectedPaths={selectedPaths}
                    expandedPaths={expandedPaths}
                    onTogglePath={togglePath}
                    onToggleFolder={toggleFolder}
                    onToggleExpand={(path) => {
                      setExpandedPaths((prev) => {
                        const next = new Set(prev)
                        if (next.has(path)) next.delete(path)
                        else next.add(path)
                        return next
                      })
                    }}
                  />
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#44475a] px-6 py-4">
          {step === 'repo' && (
            <Button
              onClick={() => void handleRepoNext()}
              disabled={!selectedRepo || !selectedBranch || branchesLoading}
              className="bg-[#bd93f9] text-[#282a36] hover:bg-[#bd93f9]/85"
            >
              {branchesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Listar arquivos
            </Button>
          )}

          {step === 'files' && (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('repo')}
                className="border-[#44475a] bg-transparent text-[#f8f8f2] hover:bg-[#44475a] hover:text-[#f8f8f2]"
              >
                Voltar
              </Button>
              <Button
                onClick={() => void handleImport()}
                disabled={selectedPaths.size === 0 || importing}
                className="bg-[#50fa7b] text-[#282a36] hover:bg-[#50fa7b]/85"
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Importar {selectedPaths.size > 0 ? `(${selectedPaths.size})` : ''}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TreeNodeViewProps {
  node: TreeNode
  depth: number
  selectedPaths: Set<string>
  expandedPaths: Set<string>
  onTogglePath: (path: string) => void
  onToggleFolder: (node: TreeNode, selected: boolean) => void
  onToggleExpand: (path: string) => void
}

function TreeView({
  nodes,
  selectedPaths,
  expandedPaths,
  onTogglePath,
  onToggleFolder,
  onToggleExpand,
}: Omit<TreeNodeViewProps, 'node' | 'depth'> & { nodes: TreeNode[] }) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          selectedPaths={selectedPaths}
          expandedPaths={expandedPaths}
          onTogglePath={onTogglePath}
          onToggleFolder={onToggleFolder}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  )
}

function TreeNodeView({
  node,
  depth,
  selectedPaths,
  expandedPaths,
  onTogglePath,
  onToggleFolder,
  onToggleExpand,
}: TreeNodeViewProps) {
  const isExpanded = expandedPaths.has(node.path)
  const leafPaths = useMemo(() => collectLeafPaths(node), [node])
  const selectedCount = leafPaths.filter((p) => selectedPaths.has(p)).length
  const isIndeterminate = selectedCount > 0 && selectedCount < leafPaths.length
  const isSelected = selectedCount === leafPaths.length && leafPaths.length > 0

  if (node.type === 'blob') {
    return (
      <div
        className="flex items-center gap-2 rounded py-1 pr-2 text-sm hover:bg-[#44475a]/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Checkbox
          checked={selectedPaths.has(node.path)}
          onCheckedChange={() => onTogglePath(node.path)}
          className="border-[#6272a4] data-[state=checked]:border-[#bd93f9] data-[state=checked]:bg-[#bd93f9]"
        />
        <FileCode2 className="h-4 w-4 flex-none text-[#8be9fd]" />
        <span className="min-w-0 flex-1 truncate text-[#f8f8f2]">{node.name}</span>
        <span className="flex-none text-xs text-[#6272a4]">{formatFileSize(node.size)}</span>
      </div>
    )
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(node.path)}>
      <div
        className="flex items-center gap-1 rounded py-1 pr-2 hover:bg-[#44475a]/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isSelected}
          onCheckedChange={(checked) => onToggleFolder(node, checked === true)}
          className="border-[#6272a4] data-[state=checked]:border-[#bd93f9] data-[state=checked]:bg-[#bd93f9]"
        />
        <CollapsibleTrigger asChild>
          <button className="flex flex-1 items-center gap-1 text-left text-sm text-[#f8f8f2]">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-none text-[#6272a4]" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-none text-[#6272a4]" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 flex-none text-[#f1fa8c]" />
            ) : (
              <Folder className="h-4 w-4 flex-none text-[#f1fa8c]" />
            )}
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {node.children.map((child) => (
          <TreeNodeView
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPaths={selectedPaths}
            expandedPaths={expandedPaths}
            onTogglePath={onTogglePath}
            onToggleFolder={onToggleFolder}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
