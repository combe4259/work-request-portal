#!/bin/bash
# Schemathesis — OpenAPI 기반 자동 API 테스트
# 백엔드 서버가 http://localhost:8080 에서 실행 중이어야 합니다.
#
# 사용법:
#   ./scripts/schemathesis.sh              # 전체 테스트 (인증 필요 없는 엔드포인트)
#   ./scripts/schemathesis.sh --auth <JWT> # Bearer 토큰 포함 전체 테스트
#   ./scripts/schemathesis.sh --url http://localhost:8080  # 서버 주소 커스텀

set -euo pipefail

BASE_URL="${SCHEMATHESIS_BASE_URL:-http://localhost:8080}"
OPENAPI_URL="${BASE_URL}/v3/api-docs"
TEAM_ID="${SCHEMATHESIS_TEAM_ID:-1}"
AUTH_TOKEN="${SCHEMATHESIS_TOKEN:-}"

# 옵션 파싱
while [[ $# -gt 0 ]]; do
  case $1 in
    --auth) AUTH_TOKEN="$2"; shift 2 ;;
    --url)  BASE_URL="$2"; OPENAPI_URL="${BASE_URL}/v3/api-docs"; shift 2 ;;
    --team) TEAM_ID="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1"; exit 1 ;;
  esac
done

echo "=== Schemathesis API 테스트 ==="
echo "OpenAPI URL: $OPENAPI_URL"
echo "X-Team-Id: $TEAM_ID"

# 공통 헤더
HEADERS=(
  --header "X-Team-Id: ${TEAM_ID}"
  --header "Content-Type: application/json"
)

if [[ -n "$AUTH_TOKEN" ]]; then
  HEADERS+=(--header "Authorization: Bearer ${AUTH_TOKEN}")
fi

st run "$OPENAPI_URL" \
  "${HEADERS[@]}" \
  --checks all \
  --max-examples 30 \
  --output-truncate-schemas=false \
  --hypothesis-seed 42
