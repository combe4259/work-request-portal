export interface RelatedRefPayload {
  refType: string
  refId: number
  sortOrder: number
}

const DOC_PREFIX_TO_REF_TYPE: Record<string, string> = {
  WR: 'WORK_REQUEST',
  TK: 'TECH_TASK',
  TS: 'TEST_SCENARIO',
  DF: 'DEFECT',
  DP: 'DEPLOYMENT',
  MN: 'MEETING_NOTE',
  ID: 'PROJECT_IDEA',
  KB: 'KNOWLEDGE_BASE',
}

export function parseDocNoToRelatedRef(docNo: string, sortOrder: number): RelatedRefPayload | null {
  const [prefixText, idText] = docNo.trim().toUpperCase().split('-')
  const refType = DOC_PREFIX_TO_REF_TYPE[prefixText]
  const refId = Number(idText)

  if (!refType || !Number.isFinite(refId)) {
    return null
  }

  return {
    refType,
    refId,
    sortOrder,
  }
}

export function toRelatedRefsPayload(docNos: string[]): RelatedRefPayload[] {
  const seen = new Set<string>()
  const result: RelatedRefPayload[] = []

  docNos.forEach((docNo, index) => {
    const parsed = parseDocNoToRelatedRef(docNo, index + 1)
    if (!parsed) {
      return
    }

    const uniqueKey = `${parsed.refType}:${parsed.refId}`
    if (seen.has(uniqueKey)) {
      return
    }
    seen.add(uniqueKey)
    result.push(parsed)
  })

  return result
}
