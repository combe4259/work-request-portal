import { Navigate, useParams } from 'react-router-dom'

export default function WorkRequestFlowLegacyRedirect() {
  const { id } = useParams()
  if (!id) {
    return <Navigate to="/workflow" replace />
  }
  return <Navigate to={`/workflow?workRequestId=${id}`} replace />
}
