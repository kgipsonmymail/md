import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Sparkles, ExternalLink, Loader2, ArrowRight } from 'lucide-react'

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'glm-4.7-flash'
const MD8_URL = 'https://md8.netlify.app'

interface LocationState {
  originalMd: string
  filename: string
}

export default function ContentOptimizer() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null

  const [originalMd, setOriginalMd] = useState('')
  const [formattedMd, setFormattedMd] = useState('')
  const [isFormatting, setIsFormatting] = useState(false)
  const [copiedLeft, setCopiedLeft] = useState(false)
  const [copiedRight, setCopiedRight] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.originalMd) {
      setOriginalMd(state.originalMd)
      setFormattedMd(state.originalMd)
    }
  }, [state])

  const copyToClipboard = async (text: string, side: 'left' | 'right') => {
    await navigator.clipboard.writeText(text)
    if (side === 'left') {
      setCopiedLeft(true)
      setTimeout(() => setCopiedLeft(false), 2000)
    } else {
      setCopiedRight(true)
      setTimeout(() => setCopiedRight(false), 2000)
    }
  }

  const jumpToMd8 = async () => {
    await navigator.clipboard.writeText(formattedMd)
    window.open(MD8_URL, '_blank', 'noopener,noreferrer')
  }

  const requestAIFormat = async () => {
    const apiKey = import.meta.env.VITE_AI_API_KEY
    if (!apiKey) {
      setFormatError('未配置 VITE_AI_API_KEY')
      return
    }

    if (!formattedMd.trim()) {
      setFormatError('内容为空')
      return
    }

    setIsFormatting(true)
    setFormatError(null)

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: 'system',
              content: `你是一个公众号 Markdown 排版编辑助手。根据用户需求优化排版，只返回排版后的 Markdown 内容，不要输出解释。`,
            },
            {
              role: 'user',
              content: `请对以下文章进行排版优化，只返回排版后的 Markdown 内容：\n\n${formattedMd}`,
            },
          ],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        throw new Error(`AI 请求失败（${response.status}）`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content

      if (result) {
        let cleaned = result.trim()
        cleaned = cleaned.replace(/^```markdown\s*/i, '').replace(/\s*```$/i, '').trim()
        setFormattedMd(cleaned)
      }
    } catch (err) {
      setFormatError(err instanceof Error ? err.message : '格式化失败')
    } finally {
      setIsFormatting(false)
    }
  }

  if (!state?.originalMd) {
    return (
      <div className="max-w-xl mx-auto pt-20 text-center">
        <p className="text-muted-foreground mb-4">没有可用的文档内容</p>
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> 返回上传
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">内容优化</h1>
            <p className="text-sm text-muted-foreground">{state.filename}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {formatError && (
            <span className="text-sm text-destructive mr-2">{formatError}</span>
          )}
          <button
            onClick={requestAIFormat}
            disabled={isFormatting || !formattedMd.trim()}
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50"
          >
            {isFormatting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isFormatting ? '排版中...' : 'AI 重排版'}
          </button>
          <button
            onClick={jumpToMd8}
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium border bg-background hover:bg-accent h-9 px-4 py-2"
          >
            <ExternalLink className="w-4 h-4" />
            跳转 md8
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-sm min-h-0">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
            <span className="text-sm font-medium">原始内容</span>
            <button
              onClick={() => copyToClipboard(originalMd, 'left')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedLeft ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLeft ? '已复制' : '复制'}
            </button>
          </div>
          <textarea
            value={originalMd}
            onChange={(e) => setOriginalMd(e.target.value)}
            className="flex-1 w-full bg-transparent p-4 outline-none resize-none overflow-y-auto text-[14px] font-mono leading-6"
            spellCheck={false}
            placeholder="原始 Markdown 内容..."
          />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-sm min-h-0">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
            <span className="text-sm font-medium">优化后内容</span>
            <button
              onClick={() => copyToClipboard(formattedMd, 'right')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedRight ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedRight ? '已复制' : '复制'}
            </button>
          </div>
          <textarea
            value={formattedMd}
            onChange={(e) => setFormattedMd(e.target.value)}
            className="flex-1 w-full bg-transparent p-4 outline-none resize-none overflow-y-auto text-[14px] font-mono leading-6"
            spellCheck={false}
            placeholder="AI 优化后的 Markdown 内容..."
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 上传新文档
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>跳转 md8.netlify.app 后可粘贴右侧内容进行预览</span>
        </div>
      </div>
    </div>
  )
}