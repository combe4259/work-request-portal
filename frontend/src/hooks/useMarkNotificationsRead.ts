import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateNotificationReadStateByRef } from '@/features/notification/service'
import { notificationQueryKeys } from '@/features/notification/queries'

/**
 * 상세 페이지 마운트 시 해당 문서(refType + refId)와 연결된 미읽음 알림을 읽음 처리한다.
 * 인증은 axios 인터셉터의 Authorization 헤더에 위임하며, refId가 유효하지 않으면 아무 작업도 하지 않는다.
 */
export function useMarkNotificationsRead(refType: string, refId: number | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!refId || refId <= 0) {
      return
    }

    updateNotificationReadStateByRef(refType, refId).then(() => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
    }).catch(() => {
      // 읽음 처리 실패는 UX에 영향을 주지 않으므로 무시한다.
    })
  }, [refType, refId, queryClient])
}
