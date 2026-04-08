import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore, useDraftStore, type Draft } from '../store'
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Send, MessageSquareText, Check, X, RefreshCcw, SplitSquareVertical, ExternalLink } from 'lucide-react'
import { composeUserPrompt } from '../lib/aiContext'
import { createLineDiff, type DiffLine } from '../lib/lineDiff'

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'glm-4.7-flash'
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL || 'http://localhost:5173/'

function extractProposedMarkdown(content: string): string {
  const matched = content.match(/```(?:markdown|md)?\n([\s\S]*?)```/i)
  if (matched?.[1]) {
    return matched[1].trim()
  }
  return content.trim()
}

function getDiffLineClass(type: DiffLine['type']) {
  if (type === 'add')
    return 'bg-emerald-500/12 text-emerald-900 border-l-2 border-emerald-500'
  if (type === 'remove')
    return 'bg-rose-500/12 text-rose-900 border-l-2 border-rose-500'
  return 'text-muted-foreground'
}

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { drafts, saveDraft } = useDraftStore()
  const { sessions, loadChatSession, addMessage, clearSession } = useChatStore()
  
  const [draft, setDraft] = useState<Partial<Draft>>({ title: '', content: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 })
  const [ctxSyntax, setCtxSyntax] = useState(true)
  const [ctxTemplate, setCtxTemplate] = useState(false)
  const [ctxSelection, setCtxSelection] = useState(true)
  const [leftDiffPreview, setLeftDiffPreview] = useState<{ messageId: string, mode: 'full' | 'selection', suggestion: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const sessionKey = id || 'draft_temp'
  const messages = sessions[sessionKey] || []

  useEffect(() => {
    if (id) {
      const existing = drafts.find(d => d.id === id)
      if (existing) {
        setDraft(existing)
      }
    }
  }, [id, drafts])

  useEffect(() => {
    void loadChatSession(sessionKey)
  }, [sessionKey, loadChatSession])

  const handleSave = async (redirect = false) => {
    setIsSaving(true)
    try {
      const saved = await saveDraft(draft)
      if (redirect && !id) {
        navigate(`/editor/${saved.id}`, { replace: true })
      }
      return saved
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft])

  const getSelectedText = () => {
    const content = draft.content || ''
    if (selectionRange.end <= selectionRange.start) return ''
    return content.slice(selectionRange.start, selectionRange.end)
  }

  const getComposedUserPrompt = (userInput: string) => {
    return composeUserPrompt({
      userInput,
      selectedText: getSelectedText(),
      includeSyntax: ctxSyntax,
      includeTemplate: ctxTemplate,
      includeSelection: ctxSelection,
    })
  }

  const handleImageUpload = async (file: File) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`https://mock-image-host.com/${file.name}`)
      }, 1000)
    })
  }

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = draft.content || ''
    
    const newContent = text.substring(0, start) + textToInsert + text.substring(end)
    setDraft(prev => ({ ...prev, content: newContent }))
    
    // reset cursor
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length
      textarea.focus()
    }, 0)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const uploadingText = `![图片上传中...]()\n`
          insertTextAtCursor(uploadingText)
          
          try {
            const url = await handleImageUpload(file)
            setDraft(prev => {
              const updated = prev.content?.replace(uploadingText, `![image](${url})\n`)
              if (!prev.coverImage) prev.coverImage = url // Set first image as cover
              return { ...prev, content: updated }
            })
          } catch (err) {
            setDraft(prev => ({ ...prev, content: prev.content?.replace(uploadingText, `![图片上传失败]()\n`) }))
          }
        }
      }
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files.length) return

    for (let i = 0; i < files.length; i++) {
      if (files[i].type.indexOf('image') !== -1) {
        const file = files[i]
        const uploadingText = `![图片上传中...]()\n`
        insertTextAtCursor(uploadingText)
        
        try {
          const url = await handleImageUpload(file)
          setDraft(prev => {
            const updated = prev.content?.replace(uploadingText, `![image](${url})\n`)
            if (!prev.coverImage) prev.coverImage = url
            return { ...prev, content: updated }
          })
        } catch (err) {
          setDraft(prev => ({ ...prev, content: prev.content?.replace(uploadingText, `![图片上传失败]()\n`) }))
        }
      }
    }
  }

  const applyContentToEditor = (newContent: string, mode: 'full' | 'selection') => {
    const current = draft.content || ''
    if (mode === 'selection' && selectionRange.end > selectionRange.start) {
      const merged = `${current.slice(0, selectionRange.start)}${newContent}${current.slice(selectionRange.end)}`
      setDraft(prev => ({ ...prev, content: merged }))
      return
    }

    setDraft(prev => ({ ...prev, content: newContent }))
  }

  const requestAI = async (userInput: string, composedPrompt: string) => {
    const apiKey = import.meta.env.VITE_AI_API_KEY
    if (!apiKey) {
      return '未配置 VITE_AI_API_KEY。请在 .env 中配置后重试。'
    }

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: '你是一个公众号 Markdown 排版编辑助手。只输出最终修改结果，不要输出解释、说明、步骤、注释。' },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: composedPrompt },
        ],
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return `AI 请求失败（${response.status}）：${text}`
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    return data.choices?.[0]?.message?.content || `收到请求“${userInput}”，但没有解析到模型输出。`
  }

  const sendMessage = async () => {
    const userInput = chatInput.trim()
    if (!userInput || isAiProcessing)
      return

    setChatInput('')
    const composedPrompt = getComposedUserPrompt(userInput)

    await addMessage(sessionKey, {
      role: 'user',
      content: userInput,
    })

    setIsAiProcessing(true)
    try {
      const aiOutput = await requestAI(userInput, composedPrompt)
      const cleanedOutput = extractProposedMarkdown(aiOutput)
      await addMessage(sessionKey, {
        role: 'assistant',
        content: cleanedOutput,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      await addMessage(sessionKey, {
        role: 'assistant',
        content: `请求失败：${message}`,
      })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const quickFormatFull = async () => {
    const prompt = '请基于当前全文进行排版优化，并返回可直接替换的 markdown。'
    setChatInput(prompt)
    await sendMessage()
  }

  const handleChatEnter = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await sendMessage()
    }
  }

  const handlePreview = () => {
    void handleSave()
    navigator.clipboard.writeText(draft.content || '')
    alert('Markdown 已复制。可粘贴到渲染器进行预览。')
  }

  const handleBridgeToRenderer = async () => {
    const saved = await handleSave(true)
    const markdown = draft.content || ''
    const title = draft.title || '未命名草稿'

    localStorage.setItem('wind_draft_bridge_markdown', markdown)
    localStorage.setItem('wind_draft_bridge_title', title)
    if (saved?.id) {
      localStorage.setItem('wind_draft_bridge_id', saved.id)
    }

    window.open(RENDERER_URL, '_blank', 'noopener,noreferrer')
    alert('草稿已写入本地桥接缓存，并已打开渲染器页面。')
  }

  const getBeforeTextForMode = (mode: 'full' | 'selection') => {
    const content = draft.content || ''
    if (mode === 'selection' && selectionRange.end > selectionRange.start) {
      return content.slice(selectionRange.start, selectionRange.end)
    }
    return content
  }

  const startLeftDiffPreview = (mode: 'full' | 'selection', messageId: string, suggestion: string) => {
    setLeftDiffPreview({ mode, messageId, suggestion })
  }

  const applyLeftDiffPreview = () => {
    if (!leftDiffPreview)
      return

    applyContentToEditor(leftDiffPreview.suggestion, leftDiffPreview.mode)
    setLeftDiffPreview(null)
  }

  const messageCards = useMemo(() => {
    return messages.map((msg) => {
      const suggestion = msg.role === 'assistant' ? extractProposedMarkdown(msg.content) : ''
      return { msg, suggestion }
    })
  }, [messages])

  return (
    <div className="max-w-[1280px] mx-auto h-[calc(100vh-8rem)] flex flex-col pt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="未命名草稿"
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 px-0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            {isSaving ? '保存中...' : draft.updatedAt ? `已保存 ${new Date(draft.updatedAt).toLocaleTimeString()}` : ''}
          </span>
          <button
            onClick={() => handleSave(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2"
          >
            <Save className="w-4 h-4" /> 保存
          </button>
          <button
            onClick={quickFormatFull}
            disabled={isAiProcessing || !draft.content}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2 gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'animate-pulse text-amber-500' : 'text-amber-500'}`} />
            {isAiProcessing ? '排版中...' : 'AI 排版'}
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2 ml-2"
          >
            <Send className="w-4 h-4" /> 复制预览
          </button>
          <button
            onClick={() => void handleBridgeToRenderer()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border bg-background hover:bg-accent h-9 px-4 py-2 gap-2"
          >
            <ExternalLink className="w-4 h-4" /> 发送到渲染器
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4 min-h-0">
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col relative shadow-sm min-h-0">
          <div className="border-b bg-muted/20 px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5" title="可直接粘贴或拖拽图片到编辑器">
              <ImageIcon className="w-4 h-4" />
              <span>{leftDiffPreview ? '左侧正在预览差异（增绿删红）' : '支持图片粘贴与拖拽'}</span>
            </div>
            {leftDiffPreview && (
              <div className="flex items-center gap-2">
                <button
                  onClick={applyLeftDiffPreview}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  <Check className="w-3 h-3" /> 接受修改
                </button>
                <button
                  onClick={() => setLeftDiffPreview(null)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  <X className="w-3 h-3" /> 取消预览
                </button>
              </div>
            )}
          </div>

          {leftDiffPreview ? (
            <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-6 bg-background">
              {createLineDiff(getBeforeTextForMode(leftDiffPreview.mode), leftDiffPreview.suggestion).map((line, idx) => (
                <div
                  key={`${leftDiffPreview.messageId}-${idx}-${line.text}`}
                  className={`grid grid-cols-[44px_44px_22px_1fr] items-start ${getDiffLineClass(line.type)}`}
                >
                  <span className="px-2 text-right select-none opacity-70">{line.oldLineNumber ?? ''}</span>
                  <span className="px-2 text-right select-none opacity-70">{line.newLineNumber ?? ''}</span>
                  <span className="px-1 select-none">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                  <span className={`px-2 ${line.type === 'remove' ? 'line-through decoration-rose-700/70' : ''}`}>{line.text || ' '}</span>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              id="content-editor"
              ref={textareaRef}
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              onSelect={(e) => setSelectionRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
              onKeyUp={(e) => setSelectionRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
              onClick={(e) => setSelectionRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              placeholder="在这里开始写作。可让 AI 修改选中内容或重排全文。"
              className="flex-1 w-full bg-transparent p-6 outline-none resize-none overflow-y-auto text-[15px] font-mono leading-7 selection:bg-primary/20"
              spellCheck={false}
            />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquareText className="w-4 h-4 text-primary" />
              AI 助手
            </div>
            <button
              onClick={() => void clearSession(sessionKey)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RefreshCcw className="w-3 h-3" /> 清空
            </button>
          </div>

          <div className="px-4 py-3 border-b bg-muted/20">
            <div className="text-xs text-muted-foreground mb-2">上下文</div>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs border rounded-full px-3 py-1 cursor-pointer">
                <input type="checkbox" className="mr-1" checked={ctxSyntax} onChange={(e) => setCtxSyntax(e.target.checked)} />语法规则
              </label>
              <label className="text-xs border rounded-full px-3 py-1 cursor-pointer">
                <input type="checkbox" className="mr-1" checked={ctxTemplate} onChange={(e) => setCtxTemplate(e.target.checked)} />金融模板
              </label>
              <label className="text-xs border rounded-full px-3 py-1 cursor-pointer">
                <input type="checkbox" className="mr-1" checked={ctxSelection} onChange={(e) => setCtxSelection(e.target.checked)} />编辑器选区
              </label>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              选区长度：{Math.max(selectionRange.end - selectionRange.start, 0)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messageCards.length === 0 && (
              <div className="text-sm text-muted-foreground">开始提问吧。你可以要求 AI 只改选中片段，或重排全文。</div>
            )}
            {messageCards.map(({ msg, suggestion }) => (
              <div key={msg.id} className={`rounded-lg border p-3 ${msg.role === 'user' ? 'bg-muted/30' : 'bg-background'}`}>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{msg.role === 'user' ? '用户' : '助手'}</div>
                <pre className="whitespace-pre-wrap break-words text-sm leading-6 font-sans">{msg.content}</pre>

                {msg.role === 'assistant' && suggestion && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => applyContentToEditor(suggestion, 'selection')}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Check className="w-3 h-3" /> 替换选区
                      </button>
                      <button
                        onClick={() => applyContentToEditor(suggestion, 'full')}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Check className="w-3 h-3" /> 替换全文
                      </button>
                      <button
                        onClick={() => void navigator.clipboard.writeText(suggestion)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <X className="w-3 h-3" /> 复制结果
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => startLeftDiffPreview('selection', msg.id, suggestion)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <SplitSquareVertical className="w-3 h-3" /> 左侧预览(选区)
                      </button>
                      <button
                        onClick={() => startLeftDiffPreview('full', msg.id, suggestion)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <SplitSquareVertical className="w-3 h-3" /> 左侧预览(全文)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t p-3">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatEnter}
              placeholder="输入需求，Enter 发送，Shift+Enter 换行"
              className="w-full h-20 resize-none rounded-md border bg-transparent p-2 text-sm outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => void sendMessage()}
                disabled={isAiProcessing || !chatInput.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'animate-pulse' : ''}`} /> 发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
