import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { RefType } from '@/features/common/refTypes'

export interface AttachmentItem {
  id: number
  refType: RefType
  refId: number
  originalName: string
  storedPath: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: number
  createdAt: string
}

interface ApiAttachmentItem {
  id: number
  refType: RefType
  refId: number
  originalName: string
  storedPath: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: number
  createdAt: string | null
}

interface ApiCreateAttachmentResponse {
  id: number
}

function toDateTime(value: string | null | undefined): string {
  return value?.replace('T', ' ').slice(0, 16) ?? '-'
}

function mapAttachmentItem(item: ApiAttachmentItem): AttachmentItem {
  return {
    id: item.id,
    refType: item.refType,
    refId: item.refId,
    originalName: item.originalName,
    storedPath: item.storedPath,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    uploadedBy: item.uploadedBy,
    createdAt: toDateTime(item.createdAt),
  }
}

export async function listAttachments(refType: RefType, refId: string | number): Promise<AttachmentItem[]> {
  const { data } = await api.get<ApiAttachmentItem[]>('/attachments', {
    params: { refType, refId },
  })
  return data.map(mapAttachmentItem)
}

export async function createAttachment(input: {
  refType: RefType
  refId: number
  originalName: string
  storedPath: string
  fileSize?: number | null
  mimeType?: string | null
  uploadedBy: number
}): Promise<number> {
  const { data } = await api.post<ApiCreateAttachmentResponse>('/attachments', input)
  return data.id
}

export async function createAttachmentsFromFiles(input: {
  refType: RefType
  refId: string | number
  files: File[]
}): Promise<void> {
  if (input.files.length === 0) {
    return
  }

  const auth = useAuthStore.getState()
  if (!auth.user) {
    throw new Error('로그인 사용자 정보가 없습니다.')
  }

  const numericRefId = Number(input.refId)
  if (!Number.isInteger(numericRefId) || numericRefId <= 0) {
    throw new Error('문서 ID가 올바르지 않습니다.')
  }

  await Promise.all(
    input.files.map((file) => {
      const safeName = file.name.replaceAll('/', '_')
      return createAttachment({
        refType: input.refType,
        refId: numericRefId,
        originalName: file.name,
        storedPath: `local://${input.refType}/${numericRefId}/${Date.now()}-${safeName}`,
        fileSize: file.size,
        mimeType: file.type || null,
        uploadedBy: auth.user!.id,
      })
    }),
  )
}
