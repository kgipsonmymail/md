import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDraftStore, type Draft } from '../store'
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Send } from 'lucide-react'

// Dummy config for AI (mocked API URL for now)
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { drafts, saveDraft } = useDraftStore()
  
  const [draft, setDraft] = useState<Partial<Draft>>({ title: '', content: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  useEffect(() => {
    if (id) {
      const existing = drafts.find(d => d.id === id)
      if (existing) {
        setDraft(existing)
      }
    }
  }, [id, drafts])

  const handleSave = async (redirect = false) => {
    setIsSaving(true)
    try {
      const saved = await saveDraft(draft)
      if (redirect && !id) {
        navigate(`/editor/${saved.id}`, { replace: true })
      }
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

  // Mock Image Upload logic
  const handleImageUpload = async (file: File) => {
    // TODO: integrate real GitHub / OSS upload from .env
    // For now, simulate upload delay and generate an object URL or mock URL
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`https://mock-image-host.com/${file.name}`)
      }, 1000)
    })
  }

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const uploadingText = `![Uploading image...]()\n`
          insertTextAtCursor(uploadingText)
          
          try {
            const url = await handleImageUpload(file)
            setDraft(prev => {
              const updated = prev.content?.replace(uploadingText, `![image](${url})\n`)
              if (!prev.coverImage) prev.coverImage = url // Set first image as cover
              return { ...prev, content: updated }
            })
          } catch (err) {
            setDraft(prev => ({ ...prev, content: prev.content?.replace(uploadingText, `![Upload failed]()\n`) }))
          }
        }
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files.length) return

    for (let i = 0; i < files.length; i++) {
      if (files[i].type.indexOf('image') !== -1) {
        const file = files[i]
        const uploadingText = `![Uploading image...]()\n`
        insertTextAtCursor(uploadingText)
        
        try {
          const url = await handleImageUpload(file)
          setDraft(prev => {
            const updated = prev.content?.replace(uploadingText, `![image](${url})\n`)
            if (!prev.coverImage) prev.coverImage = url
            return { ...prev, content: updated }
          })
        } catch (err) {
          setDraft(prev => ({ ...prev, content: prev.content?.replace(uploadingText, `![Upload failed]()\n`) }))
        }
      }
    }
  }

  const callAILayout = async () => {
    setIsAiProcessing(true)
    try {
      // Mock AI formatting for now
      // In a real app, you would make an API call to GLM-4.6v or similar using AI_API_URL
      console.log('Calling AI API:', AI_API_URL)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const promptText = "Format this text with better markdown layout..."
      console.log('Prompt:', promptText)
      const processed = `## AI Formatted\n\n${draft.content}\n\n---\n> Formatted by AI Processor`
      
      setDraft(prev => ({ ...prev, content: processed }))
      handleSave()
    } catch (e) {
      console.error(e)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handlePreview = () => {
    handleSave()
    // Renderer bridge (URL or clipboard)
    // For now, let's copy to clipboard and notify
    navigator.clipboard.writeText(draft.content || '')
    alert('Markdown copied to clipboard. You can now paste it into the renderer.')
    // Example: window.open(`http://localhost:5173/?content=${encodeURIComponent(draft.content || '')}`)
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col pt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Untitled Draft"
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 px-0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            {isSaving ? 'Saving...' : draft.updatedAt ? `Saved ${new Date(draft.updatedAt).toLocaleTimeString()}` : ''}
          </span>
          <button 
            onClick={() => handleSave(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button 
            onClick={callAILayout}
            disabled={isAiProcessing || !draft.content}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2 gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'animate-pulse text-amber-500' : 'text-amber-500'}`} /> 
            {isAiProcessing ? 'Formatting...' : 'AI Format'}
          </button>
          <button 
            onClick={handlePreview}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2 ml-2"
          >
            <Send className="w-4 h-4" /> Preview
          </button>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col relative shadow-sm">
        <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Paste or drag/drop images directly into the editor">
            <ImageIcon className="w-4 h-4" />
            <span>Image drag & drop supported</span>
          </div>
        </div>
        
        <textarea
          id="content-editor"
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Start writing your amazing post here... Paste or drop images directly into the text."
          className="flex-1 w-full bg-transparent p-6 outline-none resize-none overflow-y-auto leading-relaxed text-[15px] font-mono leading-7 selection:bg-primary/20"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
