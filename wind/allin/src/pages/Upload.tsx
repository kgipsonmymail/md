import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_CONVERTER_API || 'http://localhost:3000'

interface ConvertResult {
  success: boolean
  markdown?: string
  error?: string
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      setError('仅支持 .doc 或 .docx 文件')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: formData,
      })

      const result: ConvertResult = await response.json()

      if (!result.success || !result.markdown) {
        throw new Error(result.error || '解析失败')
      }

      navigate('/content-optimizer', {
        state: {
          originalMd: result.markdown,
          filename: file.name,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile()
      if (file && (file.name.endsWith('.doc') || file.name.endsWith('.docx'))) {
        handleFile(file)
        break
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto pt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">上传文档</h1>
        <p className="text-muted-foreground">上传 .doc 或 .docx 文件，开始智能排版</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">正在解析文档...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {dragOver ? (
                <FileText className="w-8 h-8 text-primary" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium">
                {dragOver ? '释放文件以上传' : '点击或拖拽文件到此处'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                支持 .doc, .docx 格式
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => navigate('/editor')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          前往编辑器 <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}