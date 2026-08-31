# 🔗 Chapter 7. GitHub Actions × Azure 통합 CI/CD

> **소요 시간**: 60분
> **난이도**: 🟡 중급
> **선수 과목**: [Chapter 5. GitHub Actions 기초](./ch05_GitHub_Actions_기초.md), [Chapter 6. Azure 배포 기초](./ch06_Azure_배포_기초.md)

---

## 학습 목표

이 챕터를 완료하면 다음을 할 수 있습니다.

1. OIDC(Federated Credentials) 방식으로 GitHub Actions에서 Azure에 비밀 없이 로그인할 수 있다
2. `azure/login@v2` 액션의 파라미터를 정확히 구성할 수 있다
3. Ch.6에서 만든 Federated Credential의 Subject 클레임을 배포 시나리오에 맞게 선택할 수 있다
4. Node.js 앱을 App Service에 배포하는 완전한 워크플로를 작성할 수 있다
5. dev / staging / production 3-tier 환경 분리 전략을 설계하고 구현할 수 있다
6. "Build once, Deploy many" 패턴으로 아티팩트를 여러 환경에 승격 배포할 수 있다
7. Reusable Workflow로 팀 공통 배포 로직을 표준화할 수 있다

---

## 1. 전체 CI/CD 아키텍처

이 챕터에서 구현하는 흐름을 먼저 큰 그림으로 살펴봅니다.

```
개발자 로컬
    │
    │  git push (feature/*)
    ▼
GitHub Repository
    │
    ├─► Pull Request 생성
    │       │
    │       ▼
    │   [CI 워크플로]
    │   ┌─────────────────────────────┐
    │   │  checkout → install → test  │
    │   │  lint → build → 결과 리포트  │
    │   └──────────────┬──────────────┘
    │                  │ 모든 체크 통과
    │                  ▼
    │         PR Reviewer 승인
    │
    │  머지 (main / develop)
    ▼
[CD 워크플로]
    │
    ├─ 1. Build Job
    │       checkout → install → build
    │       → 아티팩트 업로드
    │
    ├─ 2. OIDC 인증 (비밀 없음!)
    │       GitHub OIDC 토큰 발급
    │       → azure/login@v2
    │       → Azure AD Federated Credential 검증
    │       → 임시 액세스 토큰 발급
    │
    ├─ 3. 배포 (환경별 순차 승격)
    │       아티팩트 다운로드
    │       → staging 배포 → Smoke Test
    │       → Required Reviewer 승인 (production)
    │       → production 배포
    │
    └─ 4. 알림
            성공 / 실패 → Slack / Teams 알림
```

핵심은 **"한 번 빌드, 여러 번 배포"** 와 **"비밀 없는 OIDC 인증"** 두 가지입니다. 각각 5절과 7절에서 자세히 다룹니다.

---

## 2. `azure/login@v2` 액션 심화

### 2-1. Service Principal + Secret 방식 (권장하지 않음)

과거에 많이 사용되던 방식입니다. 보여주기만 합니다.

```yaml
# ⚠️ 권장하지 않음 — 장기 비밀 관리 부담 있음
- name: Azure 로그인 (SP 방식)
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

`AZURE_CREDENTIALS` 에는 JSON 형태의 서비스 프린시팔 정보가 들어갑니다. 비밀이 유출되면 즉시 모든 구독 권한이 위험해지고, 만료 관리도 수동으로 해야 하므로 OIDC 방식으로 전환을 강력히 권장합니다.

### 2-2. OIDC (Federated Credentials) 방식 — 이 커리큘럼 표준

OIDC 방식은 GitHub이 단기 토큰을 직접 발급하고, Azure AD가 이를 신뢰하는 방식입니다. **비밀을 저장할 필요가 없습니다.**

```yaml
permissions:
  id-token: write   # OIDC 토큰 요청에 필수
  contents: read    # 코드 체크아웃에 필요

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Azure 로그인 (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

**파라미터 설명**

| 파라미터 | 설명 | 비고 |
|---|---|---|
| `client-id` | 앱 등록의 Application (client) ID | Secret이 아닌 ID값 |
| `tenant-id` | Azure AD 테넌트 ID | |
| `subscription-id` | 배포 대상 구독 ID | |
| `enable-AzPSSession` | `true` 로 설정하면 Azure PowerShell 세션도 함께 초기화 | PowerShell 스텝를 쓸 때만 필요 |

**`enable-AzPSSession: true` 는 언제 쓰나?**

Azure CLI(`az`) 명령만 사용한다면 기본값(`false`)으로 충분합니다. 하지만 팀 표준 스크립트가 PowerShell Az 모듈(`Get-AzResource` 등)을 사용한다면 `true`로 설정하세요. 두 세션을 동시에 유지하므로 러너 메모리 사용이 소폭 증가합니다.

---

## 3. Ch.6에서 만든 Federated Credential 재사용

Ch.6에서 Azure Portal 또는 Azure CLI로 Federated Credential을 이미 만들었습니다. 이번 절에서는 Subject 클레임을 시나리오별로 올바르게 선택하는 방법을 다룹니다.

### 3-1. Subject 클레임 패턴 비교

| Subject 클레임 | 언제 매칭되나 | 추천 용도 |
|---|---|---|
| `repo:owner/repo:environment:production` | `environment: production` 이 지정된 Job | Production 배포 전용 |
| `repo:owner/repo:ref:refs/heads/main` | `main` 브랜치에서 트리거된 워크플로 | 브랜치 기반 배포 |
| `repo:owner/repo:pull_request` | Pull Request 이벤트로 트리거된 워크플로 | PR 환경 배포, 미리보기 |

**실전 사례**

```
시나리오 1 — Production 배포:
  Federated Credential Subject:
    repo:Ai-Advanced/my-app:environment:production
  워크플로 Job:
    environment: production

시나리오 2 — main 머지 후 자동 배포:
  Federated Credential Subject:
    repo:Ai-Advanced/my-app:ref:refs/heads/main
  워크플로 트리거:
    on:
      push:
        branches: [main]

시나리오 3 — PR 미리보기 환경:
  Federated Credential Subject:
    repo:Ai-Advanced/my-app:pull_request
  워크플로 트리거:
    on:
      pull_request:
```

> **주의:** Subject 클레임이 하나라도 불일치하면 로그인이 실패합니다. 가장 흔한 오류인 `AADSTS70021` 은 13절 트러블슈팅을 참고하세요.

### 3-2. 여러 Subject 클레임이 필요할 때

하나의 앱 등록에 Federated Credential을 여러 개 등록할 수 있습니다. staging 환경용과 production 환경용을 분리해서 각각 만드는 것이 보안상 좋은 구성입니다.

```
앱 등록: my-app-github-oidc
  Federated Credential 1:
    이름: staging-env
    Subject: repo:Ai-Advanced/my-app:environment:staging
  Federated Credential 2:
    이름: production-env
    Subject: repo:Ai-Advanced/my-app:environment:production
  Federated Credential 3:
    이름: pr-preview
    Subject: repo:Ai-Advanced/my-app:pull_request
```

---

## 4. 첫 배포 워크플로 — Node.js App Service

### 4-1. 전체 워크플로 YAML

실제로 동작하는 완전한 워크플로입니다. `.github/workflows/deploy-nodejs.yml` 로 저장하세요.

```yaml
name: Node.js CI/CD — Azure App Service

on:
  push:
    branches:
      - main

# OIDC 토큰 발급에 필요한 최소 권한
permissions:
  id-token: write
  contents: read

env:
  NODE_VERSION: '20.x'
  AZURE_WEBAPP_NAME: my-nodejs-app        # App Service 이름으로 교체
  AZURE_WEBAPP_PACKAGE_PATH: '.'

jobs:
  build-and-test:
    name: 빌드 및 테스트
    runs-on: ubuntu-latest

    steps:
      # 소스 코드 체크아웃
      - name: 소스 체크아웃
        uses: actions/checkout@v4

      # Node.js 버전 설정 (캐시 포함)
      - name: Node.js ${{ env.NODE_VERSION }} 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      # 의존성 설치 — npm ci 는 package-lock.json 을 엄격히 따름
      - name: 의존성 설치
        run: npm ci

      # 테스트 실행 — 실패 시 워크플로 전체 중단
      - name: 테스트 실행
        run: npm test

      # 프로덕션 빌드
      - name: 빌드
        run: npm run build --if-present

      # 빌드 산출물을 아티팩트로 업로드 (다음 Job에서 재사용)
      - name: 빌드 아티팩트 업로드
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: |
            .
            !node_modules
            !.github
          retention-days: 1

  deploy:
    name: Azure App Service 배포
    runs-on: ubuntu-latest
    needs: build-and-test          # 빌드·테스트 Job 완료 후 실행
    environment: production        # Subject 클레임 매칭에 사용

    steps:
      # 이전 Job에서 업로드한 아티팩트 다운로드
      - name: 빌드 아티팩트 다운로드
        uses: actions/download-artifact@v4
        with:
          name: node-app

      # 프로덕션 의존성만 설치 (devDependencies 제외)
      - name: 프로덕션 의존성 설치
        run: npm ci --omit=dev

      # OIDC 방식으로 Azure 로그인 — 비밀 없이 인증
      - name: Azure 로그인 (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # App Service에 패키지 배포
      - name: Azure App Service 배포
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          package: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}

      # 배포 후 헬스 체크
      - name: 헬스 체크
        run: |
          echo "배포 완료 후 앱 상태 확인 중..."
          sleep 30
          curl --fail --retry 5 --retry-delay 10 \
            https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net/health \
            || (echo "헬스 체크 실패" && exit 1)
```

### 4-2. 각 스텝 핵심 포인트

- **`actions/checkout@v4`**: 최신 체크아웃 액션. `sparse-checkout` 옵션으로 대형 모노레포에서 필요한 디렉토리만 가져올 수 있습니다.
- **`actions/setup-node@v4`**: `cache: 'npm'` 으로 `~/.npm` 캐시를 자동 복원해 설치 시간을 단축합니다.
- **`npm ci`**: `npm install` 과 달리 `package-lock.json` 을 변경하지 않아 재현 가능한 빌드를 보장합니다.
- **`actions/upload-artifact@v4` / `download-artifact@v4`**: 4번 버전부터 성능이 크게 개선됐습니다. `retention-days: 1` 로 스토리지 비용을 최소화합니다.
- **`azure/webapps-deploy@v3`**: Kudu API를 통해 파일을 배포합니다. ZIP 배포가 기본값입니다.

---

## 5. 환경(Environments) 분리 전략

### 5-1. 3-Tier 환경 구성

```
브랜치 전략              GitHub Environment      Azure 리소스
─────────────────────────────────────────────────────────────
feat/* push          →  dev (자동)          →  my-app-dev
develop 머지         →  staging (자동)      →  my-app-staging
main 머지            →  production (승인)   →  my-app-prod
```

### 5-2. Environment Secrets vs Repository Secrets

| 구분 | 저장 위치 | 접근 범위 | 용도 |
|---|---|---|---|
| Repository Secret | Settings > Secrets and variables > Actions | 모든 워크플로 | 공통 설정 (Client ID 등) |
| Environment Secret | Settings > Environments > [환경명] > Secrets | 해당 환경 Job만 | 환경별 DB 연결 문자열, API 키 |

**추천 구성**

```
Repository Secrets (환경 무관 공통값):
  AZURE_CLIENT_ID
  AZURE_TENANT_ID
  AZURE_SUBSCRIPTION_ID

Environment Secrets (환경별 다른 값):
  dev:
    DATABASE_URL = dev 데이터베이스 연결 문자열
    APP_CONFIG_NAME = my-app-config-dev
  staging:
    DATABASE_URL = staging 데이터베이스 연결 문자열
    APP_CONFIG_NAME = my-app-config-staging
  production:
    DATABASE_URL = prod 데이터베이스 연결 문자열
    APP_CONFIG_NAME = my-app-config-prod
```

### 5-3. Required Reviewers와 Wait Timer 설정

GitHub Repository > Settings > Environments 에서 각 환경에 보호 규칙을 설정합니다.

```
production 환경 설정:
  Required reviewers: 팀 리드 2명 이상
  Wait timer: 5분 (배포 전 의도적 냉각 시간)
  Deployment branches: main 브랜치만 허용
  Prevent self-review: 활성화 (본인이 작성한 코드는 본인이 승인 불가)
```

### 5-4. 환경별 워크플로 매핑 예시

```yaml
name: 환경별 배포

on:
  push:
    branches:
      - main
      - develop
      - 'feat/**'

jobs:
  # 공통 빌드는 항상 실행
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... 빌드 스텝

  deploy-dev:
    needs: build
    # feat/* 브랜치에서 push 할 때만 dev 배포
    if: startsWith(github.ref, 'refs/heads/feat/')
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - name: dev 환경 배포
        run: echo "dev 배포"

  deploy-staging:
    needs: build
    # develop 브랜치에서만 staging 배포
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: staging 환경 배포
        run: echo "staging 배포"

  deploy-production:
    needs: build
    # main 브랜치에서만 production 배포 (Required Reviewer 승인 필요)
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: production 환경 배포
        run: echo "production 배포"
```

---

## 6. Build Once, Deploy Many — 아티팩트 승격 패턴

### 6-1. 왜 각 환경에서 새로 빌드하면 안 되는가

1. **재현성**: 같은 소스라도 빌드 시점의 의존성 버전, 환경 변수, 도구 버전이 달라질 수 있어 staging과 production의 바이너리가 달라질 수 있습니다.
2. **시간 낭비**: 동일한 컴파일·번들링 과정을 환경 수만큼 반복하면 전체 파이프라인 시간이 선형으로 증가합니다.
3. **검증 무결성**: "staging에서 테스트한 것"과 "production에 배포되는 것"이 동일한 바이너리임을 보장해야 합니다. 재빌드는 이 보장을 깨트립니다.

### 6-2. Job 분리 전체 예시

```yaml
name: Build Once, Deploy Many

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  NODE_VERSION: '20.x'
  ARTIFACT_NAME: 'app-build-${{ github.sha }}'

jobs:
  # ── 1. 빌드 ──────────────────────────────────────────────
  build:
    name: 빌드 및 테스트
    runs-on: ubuntu-latest
    outputs:
      artifact-name: ${{ env.ARTIFACT_NAME }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run build --if-present

      # 커밋 SHA를 이름에 포함해 어떤 코드 상태인지 추적 가능
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ env.ARTIFACT_NAME }}
          path: |
            dist/
            package.json
            package-lock.json
          retention-days: 7

  # ── 2. Staging 배포 ──────────────────────────────────────
  deploy-staging:
    name: Staging 배포
    runs-on: ubuntu-latest
    needs: build
    environment: staging

    steps:
      # 빌드 Job에서 만든 바로 그 아티팩트를 가져옴
      - uses: actions/download-artifact@v4
        with:
          name: ${{ needs.build.outputs.artifact-name }}

      - name: Azure 로그인 (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Staging App Service 배포
        uses: azure/webapps-deploy@v3
        with:
          app-name: my-app-staging
          package: .

      - name: Staging 헬스 체크
        run: |
          sleep 20
          curl --fail --retry 3 \
            https://my-app-staging.azurewebsites.net/health

  # ── 3. Production 배포 ───────────────────────────────────
  deploy-production:
    name: Production 배포
    runs-on: ubuntu-latest
    needs: deploy-staging        # staging 성공 후에만 실행
    environment: production      # Required Reviewer 승인 대기

    steps:
      # staging과 완전히 동일한 아티팩트 다운로드
      - uses: actions/download-artifact@v4
        with:
          name: ${{ needs.build.outputs.artifact-name }}

      - name: Azure 로그인 (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Production App Service 배포
        uses: azure/webapps-deploy@v3
        with:
          app-name: my-app-prod
          package: .

      - name: Production 헬스 체크
        run: |
          sleep 30
          curl --fail --retry 5 --retry-delay 15 \
            https://my-app-prod.azurewebsites.net/health
```

---

## 7. 다양한 배포 대상별 액션

### 7-1. App Service — Node.js / Python

```yaml
- name: Azure App Service 배포 (코드)
  uses: azure/webapps-deploy@v3
  with:
    app-name: my-nodejs-app
    package: .
    # startup-command: 'node server.js'   # 필요할 때만
```

### 7-2. App Service — Container

```yaml
- name: Azure App Service 배포 (컨테이너)
  uses: azure/webapps-deploy@v3
  with:
    app-name: my-container-app
    images: myacr.azurecr.io/my-app:${{ github.sha }}
    # 이미지 파라미터를 사용하면 컨테이너 배포 모드로 전환됨
```

> Docker 이미지 빌드 및 ACR 푸시 상세는 Ch.8에서 다룹니다.

### 7-3. Azure Container Apps

```yaml
- name: Container Apps 배포
  uses: azure/container-apps-deploy-action@v2
  with:
    containerAppName: my-container-app
    resourceGroup: my-rg
    imageToDeploy: myacr.azurecr.io/my-app:${{ github.sha }}
    # targetPort: 3000     # 앱 포트가 기본값(80)이 아닐 때
```

### 7-4. AKS (Azure Kubernetes Service) — 개념

AKS 배포는 두 단계로 구성됩니다.

```yaml
# 1단계: kubectl 컨텍스트 설정
- name: AKS 컨텍스트 설정
  uses: azure/k8s-set-context@v4
  with:
    method: azure
    resource-group: my-rg
    cluster-name: my-aks-cluster

# 2단계: 매니페스트 배포
- name: Kubernetes 배포
  uses: azure/k8s-deploy@v5
  with:
    manifests: |
      k8s/deployment.yaml
      k8s/service.yaml
    images: |
      myacr.azurecr.io/my-app:${{ github.sha }}
```

### 7-5. Static Web Apps

```yaml
- name: Static Web Apps 배포
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: 'upload'
    app_location: '/'           # 프론트엔드 소스 위치
    api_location: 'api'         # Azure Functions API 위치 (없으면 생략)
    output_location: 'dist'     # 빌드 결과물 디렉토리
```

> Static Web Apps는 자체 CI/CD 토큰을 사용해 OIDC 방식과 별개로 동작합니다.

---

## 8. 배포 후 Smoke Test / Health Check

배포가 완료됐다고 해서 앱이 정상 동작한다는 뜻은 아닙니다. 배포 직후 기본 엔드포인트를 호출해 확인하는 것이 좋습니다.

```yaml
- name: Smoke Test — 헬스 엔드포인트 확인
  run: |
    APP_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"

    echo "앱 준비 대기 중 (30초)..."
    sleep 30

    echo "헬스 체크: $APP_URL/health"
    HTTP_STATUS=$(curl --silent --output /dev/null --write-out "%{http_code}" \
      --retry 5 --retry-delay 10 --retry-connrefused \
      "$APP_URL/health")

    if [ "$HTTP_STATUS" -ne 200 ]; then
      echo "헬스 체크 실패: HTTP $HTTP_STATUS"
      exit 1
    fi

    echo "헬스 체크 통과: HTTP $HTTP_STATUS"

- name: Smoke Test — 주요 API 응답 확인
  run: |
    APP_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"

    # API 응답 본문 확인 (jq 로 파싱)
    RESPONSE=$(curl --silent "$APP_URL/api/version")
    VERSION=$(echo "$RESPONSE" | jq -r '.version // empty')

    if [ -z "$VERSION" ]; then
      echo "버전 정보 확인 실패"
      exit 1
    fi

    echo "배포된 버전: $VERSION"
```

> 자동 롤백 전략(배포 실패 시 이전 버전으로 복구)은 Ch.9에서 자세히 다룹니다.

---

## 9. 슬롯 스왑 (Deployment Slots) 초입

App Service의 Deployment Slots 기능을 활용하면 무중단 배포를 구현할 수 있습니다. 먼저 `staging` 슬롯에 배포하고 검증한 뒤 `production` 슬롯과 스왑합니다.

### 9-1. 슬롯에 먼저 배포

```yaml
- name: Staging 슬롯에 배포
  uses: azure/webapps-deploy@v3
  with:
    app-name: my-app-prod
    slot-name: staging          # staging 슬롯 지정
    package: .
```

### 9-2. 슬롯 검증

```yaml
- name: Staging 슬롯 헬스 체크
  run: |
    # 슬롯 URL은 앱이름-슬롯이름.azurewebsites.net 형태
    curl --fail --retry 5 \
      https://my-app-prod-staging.azurewebsites.net/health
```

### 9-3. Production과 스왑

```yaml
- name: Production 슬롯 스왑
  uses: azure/CLI@v2
  with:
    inlineScript: |
      az webapp deployment slot swap \
        --name my-app-prod \
        --resource-group my-rg \
        --slot staging \
        --target-slot production
```

스왑은 DNS 수준에서 즉각 전환되므로 다운타임이 거의 없습니다. 문제가 생기면 같은 명령으로 다시 스왑해 빠르게 롤백할 수 있습니다.

---

## 10. Reusable Workflow로 팀 공통화

여러 리포지터리에서 동일한 배포 패턴을 사용한다면 Reusable Workflow로 중복을 없앨 수 있습니다.

### 10-1. Reusable Workflow 정의

`.github/workflows/reusable-deploy.yml`

```yaml
name: Reusable — Azure App Service 배포

on:
  workflow_call:
    inputs:
      app-name:
        description: 'Azure App Service 이름'
        required: true
        type: string
      environment:
        description: '배포 환경 (dev, staging, production)'
        required: true
        type: string
      node-version:
        description: 'Node.js 버전'
        required: false
        type: string
        default: '20.x'
      artifact-name:
        description: '다운로드할 아티팩트 이름'
        required: true
        type: string
    secrets:
      AZURE_CLIENT_ID:
        required: true
      AZURE_TENANT_ID:
        required: true
      AZURE_SUBSCRIPTION_ID:
        required: true

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    name: ${{ inputs.environment }} 배포
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: 아티팩트 다운로드
        uses: actions/download-artifact@v4
        with:
          name: ${{ inputs.artifact-name }}

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}

      - name: 프로덕션 의존성 설치
        run: npm ci --omit=dev

      - name: Azure 로그인 (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: App Service 배포
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ inputs.app-name }}
          package: .

      - name: 헬스 체크
        run: |
          sleep 25
          curl --fail --retry 5 \
            https://${{ inputs.app-name }}.azurewebsites.net/health
```

### 10-2. 호출하는 워크플로 (같은 리포)

```yaml
name: 메인 배포 파이프라인

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml   # 빌드도 재사용 가능

  deploy-staging:
    needs: build
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      app-name: my-app-staging
      environment: staging
      artifact-name: app-build
    secrets: inherit   # 상위 워크플로의 secrets 전달

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      app-name: my-app-prod
      environment: production
      artifact-name: app-build
    secrets: inherit
```

### 10-3. 다른 리포지터리에서 호출

```yaml
# 다른 리포의 워크플로
jobs:
  deploy:
    uses: Ai-Advanced/shared-workflows/.github/workflows/reusable-deploy.yml@main
    with:
      app-name: other-repo-app
      environment: production
      artifact-name: my-build
    secrets:
      AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
      AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

> 다른 리포에서 호출할 때는 공유 워크플로 리포의 `Settings > Actions > General > Access` 에서 접근을 허용해야 합니다.

---

## 11. 실습 과제

### 과제 1 — OIDC 로그인 확인 워크플로 만들기

1. Ch.6에서 만든 앱 등록과 Federated Credential을 사용합니다.
2. `.github/workflows/test-oidc.yml` 을 만들고 `on: workflow_dispatch` 로 수동 트리거합니다.
3. `azure/login@v2` 로 로그인 후 `az account show` 로 구독 정보를 출력합니다.
4. Subject 클레임을 일부러 잘못 설정해 `AADSTS70021` 오류를 재현하고, 올바르게 수정해 해결합니다.

### 과제 2 — 3-tier 환경 배포 파이프라인 구축

1. GitHub Environments 에서 `dev`, `staging`, `production` 세 환경을 만듭니다.
2. `production` 에 Required Reviewer 1명과 Wait Timer 2분을 설정합니다.
3. "Build once, Deploy many" 패턴으로 세 환경 모두에 같은 아티팩트를 배포하는 워크플로를 작성합니다.
4. 각 환경별 헬스 체크 결과를 워크플로 요약(`$GITHUB_STEP_SUMMARY`)에 기록합니다.

### 과제 3 — Reusable Workflow 공통화

1. 팀의 공통 배포 로직을 `reusable-deploy.yml` 로 추출합니다.
2. `inputs` 에 `health-check-path` 파라미터를 추가해 헬스 체크 경로를 커스터마이즈할 수 있게 만듭니다.
3. 기존 워크플로에서 이 Reusable Workflow를 `secrets: inherit` 방식으로 호출하도록 리팩터링합니다.

---

## 12. 자주 마주치는 이슈 & 해결

| 오류 메시지 / 증상 | 원인 | 해결 방법 |
|---|---|---|
| `AADSTS70021: No matching federated identity record found` | Subject 클레임 불일치 | Azure Portal에서 Federated Credential의 Subject 값을 확인. `environment:`, `ref:`, `pull_request` 중 워크플로 조건에 맞는 것 선택 |
| `You do not have permission to perform this action` | 앱 등록에 RBAC 역할 미할당 | Azure Portal > 리소스 > Access control (IAM) > 역할 할당에서 서비스 프린시팔에 `Contributor` 또는 필요한 역할 추가 |
| `Package deployment failed` | App Service SKU가 너무 낮거나 배포 파일 크기 초과 | Free/Shared 티어에서는 일부 배포 옵션 제한. B1 이상으로 업그레이드. `.webappignore` 로 불필요한 파일 제외 |
| 헬스 체크 실패 (배포 직후) | 앱 시작 시간 부족 | `sleep` 값을 늘리거나 `--retry-delay` 를 증가. App Service의 시작 명령 및 포트 설정 확인 |
| `Error: The process '/usr/bin/az' failed` | Azure CLI 명령 오류 | `azure/CLI@v2` 액션 사용 시 `inlineScript` 의 명령 문법 확인. `az` 명령 직접 실행보다 액션 사용 권장 |
| `permissions` 블록 없이 OIDC 실패 | `id-token: write` 누락 | 워크플로 최상단 또는 Job 수준에 `permissions: id-token: write` 추가 |
| Reusable Workflow에서 secrets 미전달 | `secrets: inherit` 또는 명시적 secrets 전달 누락 | 호출 측 `secrets: inherit` 추가 또는 각 secret을 명시적으로 전달 |

---

## 13. 현업 팁

**팁 1 — Concurrency로 동시 배포 방지**

같은 환경에 두 배포가 동시에 실행되면 배포 순서가 꼬일 수 있습니다. `concurrency` 설정으로 막으세요.

```yaml
concurrency:
  group: deploy-production-${{ github.ref }}
  cancel-in-progress: false   # true 면 이전 배포 취소, false 면 대기
```

**팁 2 — 배포 태그 자동 생성**

배포마다 Git 태그를 남기면 어느 커밋이 언제 배포됐는지 추적하기 좋습니다.

```yaml
- name: 배포 태그 생성
  run: |
    TAG="deploy-prod-$(date +'%Y%m%d-%H%M%S')"
    git tag "$TAG"
    git push origin "$TAG"
```

**팁 3 — Slack 알림 통합**

```yaml
- name: 배포 결과 Slack 알림
  if: always()   # 성공/실패 모두 알림
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      {
        "text": "${{ job.status == 'success' && '✅' || '❌' }} *${{ github.repository }}* 배포 ${{ job.status }}\n커밋: ${{ github.sha }}\n담당자: ${{ github.actor }}"
      }
```

**팁 4 — 워크플로 요약 활용**

```yaml
- name: 배포 요약 기록
  run: |
    echo "## 배포 완료 ✅" >> $GITHUB_STEP_SUMMARY
    echo "| 항목 | 값 |" >> $GITHUB_STEP_SUMMARY
    echo "|---|---|" >> $GITHUB_STEP_SUMMARY
    echo "| 앱 이름 | ${{ env.AZURE_WEBAPP_NAME }} |" >> $GITHUB_STEP_SUMMARY
    echo "| 커밋 SHA | ${{ github.sha }} |" >> $GITHUB_STEP_SUMMARY
    echo "| 배포 시각 | $(date -u '+%Y-%m-%d %H:%M:%S UTC') |" >> $GITHUB_STEP_SUMMARY
```

**팁 5 — OIDC Client ID를 Variable로 관리**

`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` 는 비밀 값이 아닙니다. Repository Variables(Secrets가 아닌 Variables)에 저장하면 로그에서도 읽을 수 있어 디버깅이 편합니다.

```yaml
client-id: ${{ vars.AZURE_CLIENT_ID }}      # Variables 사용
tenant-id: ${{ vars.AZURE_TENANT_ID }}
subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

**팁 6 — 배포 전 마이그레이션 체크**

DB 마이그레이션이 있는 프로젝트라면 배포 전 단계에서 드라이런으로 안전 여부를 확인하세요.

```yaml
- name: 마이그레이션 드라이런
  run: npm run migrate:check   # 실제 변경 없이 적용 예정 내용만 출력
```

**팁 7 — 오래된 아티팩트 정리**

`retention-days` 를 적절히 설정해 불필요한 스토리지 비용을 줄이세요. PR 빌드는 1일, 릴리스 빌드는 30일 등 용도에 맞게 구분합니다.

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: app-build
    path: dist/
    retention-days: ${{ github.ref == 'refs/heads/main' && 30 || 1 }}
```

---

## 14. 마무리 및 다음 단계

이 챕터에서 다음을 완성했습니다.

- OIDC Federated Credentials로 비밀 없이 Azure에 로그인하는 방법
- Subject 클레임을 배포 시나리오에 맞게 선택하는 기준
- Node.js App Service 전체 배포 워크플로
- dev / staging / production 3-tier 환경 분리와 보호 규칙
- "Build once, Deploy many" 아티팩트 승격 패턴
- 다양한 Azure 배포 대상별 액션 사용법
- Reusable Workflow로 팀 표준 배포 로직 공통화

다음 챕터에서는 이 기반 위에서 실제 웹 앱 배포를 자동화하는 더 복잡한 시나리오를 다룹니다. Docker 이미지 빌드, ACR 푸시, 컨테이너 기반 배포, 그리고 멀티 리전 배포 전략까지 확장합니다.

---

## 참고 자료

- [GitHub Actions — azure/login](https://github.com/Azure/login)
- [GitHub Actions — azure/webapps-deploy](https://github.com/Azure/webapps-deploy)
- [GitHub Docs — OIDC with Azure](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [GitHub Docs — Reusable Workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows)
- [GitHub Docs — Environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment)
- [Microsoft Docs — Workload Identity Federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)

---

> **다음 챕터**: [→ `ch08_실전_웹앱_배포_자동화.md`](./ch08_실전_웹앱_배포_자동화.md)
