import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { addPrefix } from '@/utils'
import { store } from '@/utils/storage'
import { computed } from 'vue'

export interface Draft {
  id: string
  title: string
  content: string // Raw text with images
  coverImage?: string // URL extracted from content
  tags: string[] // Platform tags like 'wechat', 'xiaohongshu', 'douyin'
  createDatetime: Date
  updateDatetime: Date
}

export const useDraftStore = defineStore('draft', () => {
  const drafts = store.reactive<Draft[]>(addPrefix('drafts'), [])
  const currentDraftId = store.reactive(addPrefix('current_draft_id'), '')

  const currentDraft = computed(() => drafts.value.find(d => d.id === currentDraftId.value))

  function extractFirstImage(content: string): string | undefined {
    const mdImgRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/
    const match = content.match(mdImgRegex)
    return match ? match[1] : undefined
  }

  function addDraft(title: string = '未命名草稿', content: string = '') {
    const newDraft: Draft = {
      id: uuid(),
      title,
      content,
      coverImage: extractFirstImage(content),
      tags: ['wechat'],
      createDatetime: new Date(),
      updateDatetime: new Date()
    }
    drafts.value.unshift(newDraft)
    currentDraftId.value = newDraft.id
    return newDraft
  }

  function updateDraft(id: string, updates: Partial<Draft>) {
    const draft = drafts.value.find(d => d.id === id)
    if (draft) {
      if (updates.content !== undefined) {
        draft.content = updates.content
        draft.coverImage = extractFirstImage(updates.content)
      }
      if (updates.title !== undefined) draft.title = updates.title
      if (updates.tags !== undefined) draft.tags = updates.tags
      draft.updateDatetime = new Date()
    }
  }

  function deleteDraft(id: string) {
    const index = drafts.value.findIndex(d => d.id === id)
    if (index !== -1) {
      drafts.value.splice(index, 1)
      if (currentDraftId.value === id) {
        currentDraftId.value = drafts.value[0]?.id || ''
      }
    }
  }

  function setCurrentDraft(id: string) {
    if (drafts.value.some(d => d.id === id)) {
      currentDraftId.value = id
    }
  }

  // Ensure currentDraftId valid
  if (drafts.value.length > 0 && !drafts.value.some(d => d.id === currentDraftId.value)) {
    currentDraftId.value = drafts.value[0].id
  }

  return {
    drafts,
    currentDraftId,
    currentDraft,
    addDraft,
    updateDraft,
    deleteDraft,
    setCurrentDraft
  }
})
