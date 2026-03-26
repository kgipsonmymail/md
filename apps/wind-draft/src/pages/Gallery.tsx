import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDraftStore } from '../store'
import { PlusCircle, Search, FileText, Clock, Trash2, Edit2 } from 'lucide-react'

export default function Gallery() {
  const { drafts, isLoading, loadDrafts, deleteDraft } = useDraftStore()

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-pulse flex gap-2"><div className="w-4 h-4 rounded-full bg-primary/40"></div><div className="w-4 h-4 rounded-full bg-primary/40 animation-delay-200"></div><div className="w-4 h-4 rounded-full bg-primary/40 animation-delay-400"></div></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search drafts..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
            />
          </div>
          <Link to="/editor" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2 whitespace-nowrap">
            <PlusCircle className="w-4 h-4" />
            New Draft
          </Link>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg py-24 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No drafts yet</h3>
          <p className="text-sm text-muted-foreground mb-4 mt-2 max-w-sm">
            Create your first draft to start writing and formatting content for your social media channels.
          </p>
          <Link to="/editor" className="inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8 py-2">
            Create Draft
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {drafts.map((draft) => (
            <div key={draft.id} className="group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all flex flex-col h-full ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <Link to={`/editor/${draft.id}`} className="block relative focus:outline-none h-40 bg-muted/50 border-b overflow-hidden">
                {draft.coverImage ? (
                  <img src={draft.coverImage} alt={draft.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <FileText className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <span className="bg-white/90 text-black px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> Edit
                  </span>
                </div>
              </Link>
              
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link to={`/editor/${draft.id}`} className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors focus:outline-none">
                    {draft.title || 'Untitled Draft'}
                  </Link>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      if (confirm('Are you sure you want to delete this draft?')) {
                        deleteDraft(draft.id)
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
