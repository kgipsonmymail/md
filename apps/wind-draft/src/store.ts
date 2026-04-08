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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface DraftStore {
  drafts: Draft[]
  isLoading: boolean
  loadDrafts: () => Promise<void>
  saveDraft: (draft: Partial<Draft>) => Promise<Draft>
  deleteDraft: (id: string) => Promise<void>
}

interface ChatStore {
  sessions: Record<string, ChatMessage[]>
  loadChatSession: (draftId: string) => Promise<void>
  addMessage: (draftId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>
  clearSession: (draftId: string) => Promise<void>
}

export const useDraftStore = create<DraftStore>((set) => ({
  drafts: [],
  isLoading: true,
  
  loadDrafts: async () => {
    try {
      const keys = await localforage.keys()
      const drafts: Draft[] = []
      for (const key of keys) {
        if (key.startsWith('chat_'))
          continue
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
      title: draftUpdate.title || '未命名草稿',
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
    await localforage.removeItem(`chat_${id}`)
    set((state) => ({ drafts: state.drafts.filter(d => d.id !== id) }))
  }
}))

export const useChatStore = create<ChatStore>((set) => ({
  sessions: {},

  loadChatSession: async (draftId) => {
    try {
      const messages = await localforage.getItem<ChatMessage[]>(`chat_${draftId}`)
      set((state) => ({
        sessions: {
          ...state.sessions,
          [draftId]: messages || [],
        },
      }))
    }
    catch (e) {
      console.error('Failed to load chat session', e)
    }
  },

  addMessage: async (draftId, message) => {
    const fullMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    set((state) => {
      const existing = state.sessions[draftId] || []
      const updated = [...existing, fullMessage]

      void localforage.setItem(`chat_${draftId}`, updated)

      return {
        sessions: {
          ...state.sessions,
          [draftId]: updated,
        },
      }
    })
  },

  clearSession: async (draftId) => {
    await localforage.removeItem(`chat_${draftId}`)
    set((state) => {
      const next = { ...state.sessions }
      delete next[draftId]
      return { sessions: next }
    })
  },
}))
