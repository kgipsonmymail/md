import { create } from 'zustand'
import localforage from 'localforage'

// Configure localforage
localforage.config({
  name: 'WindDraft',
  storeName: 'drafts'
})

export interface Draft {
  id: string
  title: string
  content: string
  coverImage?: string
  tags: string[]
  updatedAt: number
}

interface DraftStore {
  drafts: Draft[]
  isLoading: boolean
  loadDrafts: () => Promise<void>
  saveDraft: (draft: Partial<Draft>) => Promise<Draft>
  deleteDraft: (id: string) => Promise<void>
}

export const useDraftStore = create<DraftStore>((set) => ({
  drafts: [],
  isLoading: true,
  
  loadDrafts: async () => {
    try {
      const keys = await localforage.keys()
      const drafts: Draft[] = []
      for (const key of keys) {
        const draft = await localforage.getItem<Draft>(key)
        if (draft) drafts.push(draft)
      }
      set({ drafts: drafts.sort((a, b) => b.updatedAt - a.updatedAt), isLoading: false })
    } catch (e) {
      console.error('Failed to load drafts', e)
      set({ isLoading: false })
    }
  },

  saveDraft: async (draftUpdate) => {
    const id = draftUpdate.id || crypto.randomUUID()
    
    const draft: Draft = {
      id,
      title: draftUpdate.title || 'Untitled Draft',
      content: draftUpdate.content || '',
      coverImage: draftUpdate.coverImage,
      tags: draftUpdate.tags || [],
      updatedAt: Date.now(),
      ...draftUpdate
    }
    
    await localforage.setItem(id, draft)
    
    set((state) => {
      const filtered = state.drafts.filter(d => d.id !== id)
      return { drafts: [draft, ...filtered].sort((a, b) => b.updatedAt - a.updatedAt) }
    })
    
    return draft
  },

  deleteDraft: async (id) => {
    await localforage.removeItem(id)
    set((state) => ({ drafts: state.drafts.filter(d => d.id !== id) }))
  }
}))
