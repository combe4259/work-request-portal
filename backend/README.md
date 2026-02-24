# Backend Flyway Bootstrap

이 디렉토리는 백엔드(Spring Boot) 초기 마이그레이션 기준점을 담습니다.

## 포함 파일
- `src/main/resources/db/migration/V1__baseline.sql`
- `src/main/resources/application.yml` (Flyway 기본 설정)

## 사용 방법
1. Spring Boot 프로젝트를 `backend/`에 구성합니다.
2. Flyway 의존성을 추가합니다.
3. DB 접속 정보를 환경변수(`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`)로 설정합니다.
4. 애플리케이션 실행 시 Flyway가 `V1__baseline.sql`을 적용합니다.

## 운영 DB가 이미 있는 경우
- 첫 마이그레이션 1회에 한해 `spring.flyway.baseline-on-migrate=true`를 사용합니다.
- 신규 환경에서는 `false` 유지가 안전합니다.
