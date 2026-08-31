# ⚡ Chapter 5. GitHub Actions 기초

> **소요 시간**: 60분
> **난이도**: 🟡 중급
> **선수 과목**: [Chapter 4. GitHub 리포지토리 관리](./ch04_GitHub_리포지토리_관리.md)

---

## 학습 목표

이 챕터를 마치면 다음을 할 수 있습니다.

1. GitHub Actions의 핵심 구성 요소(Workflow, Job, Step, Action, Runner)를 설명할 수 있다.
2. `.github/workflows/*.yml` 파일을 직접 작성하고 실행할 수 있다.
3. 이벤트 트리거와 필터를 조합해 원하는 시점에만 워크플로가 실행되도록 설정할 수 있다.
4. Matrix 빌드로 여러 OS·런타임 조합을 병렬로 테스트할 수 있다.
5. Repository/Environment 시크릿을 안전하게 관리하고 워크플로에서 사용할 수 있다.
6. Reusable Workflow와 Composite Action으로 공통 로직을 재사용할 수 있다.
7. GitHub Copilot을 활용해 워크플로 YAML을 빠르게 초안 작성하고 검증할 수 있다.

---

## 1. CI/CD란? — Actions의 위치

### CI vs CD vs Continuous Deployment

| 개념 | 풀네임 | 핵심 목표 | 자동화 범위 |
|------|--------|-----------|-------------|
| **CI** | Continuous Integration | 빠른 피드백으로 버그 조기 발견 | 빌드 + 테스트 |
| **CD** | Continuous Delivery | 언제든 배포 가능한 상태 유지 | CI + 스테이징 배포 |
| **CDeploy** | Continuous Deployment | 사람 개입 없이 프로덕션까지 자동 배포 | CI + CD + 프로덕션 배포 |

전통적인 파이프라인 툴(Jenkins, CircleCI, TeamCity)은 별도 서버가 필요합니다. GitHub Actions는 코드가 있는 곳에 파이프라인이 붙어 있어서, 리포지토리 이벤트를 직접 트리거로 쓸 수 있습니다.

```
개발자 push
    │
    ▼
GitHub 이벤트 감지
    │
    ▼
Actions Workflow 실행 (Runner에서)
    │
    ├── 빌드 성공 → 테스트 → 스테이징 배포 (CD)
    │
    └── 빌드 실패 → PR에 빨간 체크 → 개발자에게 알림
```

---

## 2. Actions 아키텍처 개요

### 핵심 구성 요소

```
Workflow (.github/workflows/ci.yml)
├── on: push              ← 트리거 이벤트
└── jobs:
    ├── build             ← Job 1
    │   ├── runs-on: ubuntu-latest
    │   ├── steps:
    │   │   ├── uses: actions/checkout@v4    ← Action 호출
    │   │   ├── uses: actions/setup-node@v4  ← Action 호출
    │   │   └── run: npm ci && npm test      ← Shell 명령
    │   └── (Job 1 끝)
    │
    └── deploy            ← Job 2 (build 완료 후 실행)
        ├── needs: build
        └── steps: ...
```

| 개념 | 설명 |
|------|------|
| **Workflow** | `.github/workflows/*.yml` 파일 하나. 전체 파이프라인을 정의합니다. |
| **Event** | Workflow를 시작시키는 트리거 (push, PR, schedule 등). |
| **Job** | 독립적으로 실행되는 작업 단위. 기본적으로 병렬 실행됩니다. |
| **Step** | Job 안의 순차 실행 단위. `uses:` 또는 `run:`으로 구성합니다. |
| **Action** | 재사용 가능한 스텝 묶음. Marketplace에서 가져오거나 직접 만듭니다. |
| **Runner** | Job을 실제로 실행하는 가상 머신. GitHub이 호스팅하거나 직접 운영합니다. |

### GitHub-hosted Runner vs Self-hosted Runner

| 항목 | GitHub-hosted | Self-hosted |
|------|---------------|-------------|
| 설정 | 즉시 사용 가능 | 직접 설치·관리 |
| OS | ubuntu, macos, windows | 자유 선택 |
| 보안 격리 | 매 Job마다 새 VM | 영구 환경, 격리 직접 설정 필요 |
| 성능 | 표준 (2코어, 7GB RAM) | 사양 자유 |
| 네트워크 | 공용 인터넷 | 사내망 접근 가능 |
| 비용 | 무료 할당량 내 무료 | 인프라 비용 직접 부담 |

### 무료 사용량 (2025년 기준)

| 리포지토리 유형 | 월간 무료 시간 | 스토리지 |
|----------------|---------------|---------|
| **Public** | 무제한 | 무제한 |
| **Private (Free)** | 2,000분 | 500MB |
| **Private (Pro)** | 3,000분 | 1GB |
| **Private (Team)** | 3,000분 | 2GB |
| **Private (Enterprise)** | 50,000분 | 50GB |

> macOS Runner는 Ubuntu 대비 10배, Windows는 2배 분 소비됩니다. 비용에 민감하다면 Linux를 기본으로 사용하는 것을 권장합니다.

---

## 3. 첫 워크플로 만들기 — Hello Actions

리포지토리에 `.github/workflows/hello.yml` 파일을 생성합니다. GitHub UI에서 직접 만들어도 되고, 로컬에서 커밋해도 됩니다.

```yaml
# .github/workflows/hello.yml
name: Hello Actions

on:
  push:
    branches:
      - main
      - "feature/**"

jobs:
  hello:
    runs-on: ubuntu-latest

    steps:
      - name: 리포지토리 체크아웃
        uses: actions/checkout@v4

      - name: 인사 출력
        run: echo "Hello, GitHub Actions! 현재 브랜치: ${{ github.ref_name }}"

      - name: 환경 정보 확인
        run: |
          echo "Runner OS: ${{ runner.os }}"
          echo "실행자: ${{ github.actor }}"
          echo "커밋 SHA: ${{ github.sha }}"
```

이 파일을 `main` 브랜치에 push하면 Actions 탭에서 실행 결과를 확인할 수 있습니다.

**결과 확인 흐름:**

1. GitHub 리포지토리 상단 탭에서 **Actions** 클릭
2. 왼쪽 사이드바에서 **Hello Actions** 워크플로 선택
3. 최근 실행 목록에서 방금 push한 커밋 클릭
4. `hello` Job 클릭 → 각 Step 로그 펼치기
5. 초록 체크(✓) = 성공, 빨간 X = 실패

---

## 4. Workflow YAML 문법 상세

### 최상위 키 구조

```yaml
name: 워크플로 이름            # Actions 탭에 표시되는 이름
run-name: ${{ github.actor }} triggered  # 개별 실행의 이름 (선택)

on: ...                        # 트리거 이벤트

env:                           # Workflow 전역 환경 변수
  NODE_ENV: production

concurrency:                   # 동시 실행 제어
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  job-name:
    runs-on: ubuntu-latest
    steps: ...
```

### 이벤트 타입 총정리

| 이벤트 | 트리거 시점 | 주요 용도 |
|--------|------------|----------|
| `push` | 브랜치/태그에 push | CI, 빌드·테스트 |
| `pull_request` | PR 생성·업데이트·닫힘 | PR 검증, 코드 리뷰 자동화 |
| `pull_request_target` | PR 이벤트 (base 브랜치 컨텍스트) | fork PR에서 시크릿 필요 시 (주의 필요) |
| `workflow_dispatch` | Actions 탭에서 수동 실행 | 수동 배포, 유지보수 작업 |
| `schedule` | cron 표현식 (UTC 기준) | 야간 빌드, 정기 백업 |
| `workflow_call` | 다른 워크플로에서 호출 | Reusable Workflow |
| `workflow_run` | 다른 워크플로 완료 후 | 파이프라인 체이닝 |
| `release` | Release 생성·편집·발행 | 릴리스 자동화, 패키지 배포 |
| `issue_comment` | 이슈·PR 댓글 작성 | ChatOps, 봇 명령 처리 |
| `issues` | 이슈 생성·수정·닫힘 | 이슈 자동 분류, 알림 |
| `create` | 브랜치·태그 생성 | 브랜치 초기화 자동화 |
| `delete` | 브랜치·태그 삭제 | 정리 작업 |
| `registry_package` | 패키지 publish/update | 패키지 게시 후처리 |
| `check_suite` | 체크 스위트 완료 | 외부 CI 연동 |

### 이벤트 필터

```yaml
on:
  push:
    branches:
      - main
      - "release/**"
    branches-ignore:
      - "wip/**"
    paths:
      - "src/**"
      - "package.json"
    paths-ignore:
      - "docs/**"
      - "*.md"
    tags:
      - "v*"

  pull_request:
    types:
      - opened
      - synchronize    # 새 커밋 push 시
      - reopened
    branches:
      - main

  schedule:
    - cron: "0 0 * * *"   # 매일 자정 UTC

  workflow_dispatch:
    inputs:
      environment:
        description: "배포 환경"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production
      debug:
        description: "디버그 모드"
        type: boolean
        default: false
```

### Concurrency — 중복 실행 방지

같은 브랜치에서 여러 번 push하면 워크플로가 쌓일 수 있습니다. `concurrency`로 이전 실행을 자동 취소할 수 있습니다.

```yaml
concurrency:
  # 같은 브랜치의 워크플로는 하나만 실행
  group: ${{ github.workflow }}-${{ github.ref }}
  # 새 실행이 들어오면 이전 실행 취소
  cancel-in-progress: true
```

PR 워크플로에서는 `github.head_ref`를 사용하면 PR별로 그룹이 나뉩니다.

```yaml
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

---

## 5. Job과 Step

### Job 옵션

```yaml
jobs:
  test:
    name: 단위 테스트              # Actions 탭 표시 이름
    runs-on: ubuntu-latest         # Runner 지정
    timeout-minutes: 30            # 최대 실행 시간
    continue-on-error: false       # 실패 시 다음 Job 취소 여부

    # 이전 Job이 끝난 후 실행
    needs:
      - lint
      - build

    # 조건부 실행
    if: github.event_name == 'push'

    # 다른 Job으로 값 전달
    outputs:
      artifact-name: ${{ steps.set-output.outputs.name }}

    # Job 환경 변수
    env:
      CI: true

    steps: ...
```

### Step 옵션

```yaml
steps:
  # Action 호출
  - name: 코드 체크아웃
    uses: actions/checkout@v4
    with:
      fetch-depth: 0             # 전체 git 히스토리 (기본: 1)
      token: ${{ secrets.GITHUB_TOKEN }}

  # Shell 명령 실행
  - name: 빌드
    run: npm run build
    shell: bash                  # bash(기본), sh, pwsh, python 등
    working-directory: ./app
    env:
      NODE_ENV: production

  # 조건부 스텝
  - name: 실패 시 알림
    if: failure()
    run: echo "빌드 실패!"

  # 이전 스텝 성공 여부와 무관하게 항상 실행
  - name: 정리 작업
    if: always()
    run: rm -rf ./temp

  # 출력값 설정
  - name: 버전 읽기
    id: get-version
    run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

  # 이전 스텝 출력값 사용
  - name: 버전 출력
    run: echo "버전: ${{ steps.get-version.outputs.version }}"
```

### 조건부 실행 표현식 요약

| 표현식 | 의미 |
|--------|------|
| `success()` | 이전 모든 스텝이 성공 (기본값) |
| `failure()` | 이전 스텝 중 하나라도 실패 |
| `always()` | 항상 실행 (취소된 경우 포함) |
| `cancelled()` | 워크플로가 취소된 경우 |
| `github.event_name == 'push'` | 이벤트 타입 조건 |
| `github.ref == 'refs/heads/main'` | 브랜치 조건 |
| `contains(github.event.pull_request.labels.*.name, 'deploy')` | PR 라벨 조건 |
| `startsWith(github.ref, 'refs/tags/v')` | 태그 조건 |

### Job 간 데이터 전달

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}
    steps:
      - name: 태그 생성
        id: meta
        run: echo "version=1.0.${{ github.run_number }}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: 이미지 태그 사용
        run: echo "배포할 태그: ${{ needs.build.outputs.image-tag }}"
```

---

## 6. Actions Marketplace

### 자주 쓰는 핵심 액션

| 액션 | 버전 | 역할 |
|------|------|------|
| `actions/checkout` | v4 | 리포지토리 코드를 Runner에 복사 |
| `actions/setup-node` | v4 | Node.js 버전 설치 및 캐시 설정 |
| `actions/setup-python` | v5 | Python 버전 설치 및 캐시 설정 |
| `actions/setup-java` | v4 | JDK 설치 |
| `actions/setup-dotnet` | v4 | .NET SDK 설치 |
| `actions/cache` | v4 | 의존성 캐시 (범용) |
| `actions/upload-artifact` | v4 | 빌드 결과물 저장 |
| `actions/download-artifact` | v4 | 저장된 결과물 다운로드 |
| `actions/github-script` | v7 | GitHub API를 JS로 호출 |

```yaml
steps:
  # Artifact 업로드
  - name: 빌드 결과물 업로드
    uses: actions/upload-artifact@v4
    with:
      name: build-output
      path: ./dist
      retention-days: 7        # 기본 90일, 조정 가능

  # 다른 Job에서 다운로드
  - name: 빌드 결과물 다운로드
    uses: actions/download-artifact@v4
    with:
      name: build-output
      path: ./dist
```

### 신뢰 가능한 액션 판별 방법

Marketplace에는 수만 개의 액션이 있습니다. 사용 전 다음을 확인하세요.

1. **Verified creator 배지**: 공식 GitHub 또는 검증된 파트너 조직 여부
2. **사용량**: 별(Star) 수, 주간 사용 횟수
3. **최근 업데이트**: 6개월 이상 방치된 액션은 주의
4. **버전 고정**: `@v4`처럼 Major 버전 태그 또는 `@sha`(커밋 해시)로 고정
5. **소스 코드 확인**: `action.yml`과 실제 코드가 일치하는지 검토

```yaml
# 권장: Major 버전 태그 사용
uses: actions/checkout@v4

# 최고 보안: 커밋 SHA 고정 (Enterprise 환경 권장)
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

---

## 7. Matrix 빌드

여러 OS·런타임 조합을 병렬로 테스트할 때 사용합니다. Job을 복제해서 쓸 필요가 없습니다.

```yaml
name: Matrix CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Node ${{ matrix.node }} on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false         # 하나 실패해도 나머지는 계속 실행
      matrix:
        os:
          - ubuntu-latest
          - macos-latest
          - windows-latest
        node:
          - 18
          - 20

        # 특정 조합 추가
        include:
          - os: ubuntu-latest
            node: 22           # ubuntu에서만 Node 22도 테스트
            experimental: true

        # 특정 조합 제외
        exclude:
          - os: macos-latest
            node: 18           # macOS에서 Node 18은 건너뜀

    steps:
      - uses: actions/checkout@v4

      - name: Node.js ${{ matrix.node }} 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: "npm"

      - name: 의존성 설치
        run: npm ci

      - name: 테스트 실행
        run: npm test
        continue-on-error: ${{ matrix.experimental == true }}
```

**`fail-fast`**: 기본값은 `true`입니다. 하나가 실패하면 나머지 Matrix Job이 모두 취소됩니다. 디버깅 목적으로는 `false`로 설정해서 전체 결과를 확인하는 것이 편리합니다.

---

## 8. 시크릿과 변수

### 시크릿 종류와 범위

| 종류 | 설정 위치 | 접근 가능 범위 |
|------|----------|--------------|
| **Repository Secret** | Settings > Secrets > Actions | 해당 리포지토리만 |
| **Environment Secret** | Settings > Environments > 환경 이름 | 해당 Environment Job만 |
| **Organization Secret** | Organization Settings > Secrets | 선택한 리포지토리들 |
| **Codespaces Secret** | 별도 설정 | Codespaces 전용 |

### Variables vs Secrets

| 항목 | Variables (`vars`) | Secrets (`secrets`) |
|------|-------------------|---------------------|
| 로그 마스킹 | 없음 (평문 노출 가능) | 자동 마스킹 (`***`) |
| 용도 | 비민감 설정값 (URL, 플래그 등) | 비밀번호, API 키, 토큰 |
| 로그에서 보기 | 가능 | 마스킹됨 |

```yaml
jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: 환경 변수 및 시크릿 사용
        run: |
          echo "배포 환경: ${{ vars.DEPLOY_ENV }}"
          echo "API URL: ${{ vars.API_BASE_URL }}"
          # 시크릿은 env: 블록으로 주입하는 것이 안전
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}

      - name: 기본 제공 토큰 사용
        run: gh pr comment ${{ github.event.pull_request.number }} --body "배포 완료"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 보안 주의사항

**로그 마스킹 한계**: 시크릿을 직접 `echo`로 출력하거나 JSON으로 변환하면 마스킹이 우회될 수 있습니다.

```yaml
# 위험: 시크릿이 로그에 노출될 수 있음
- run: echo "${{ secrets.API_KEY }}"

# 안전: env: 블록으로 주입
- run: echo "$API_KEY"
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

**Fork PR 이슈**: `pull_request` 이벤트는 fork에서 온 PR에서 시크릿에 접근할 수 없습니다. `pull_request_target`은 시크릿에 접근 가능하지만, 악의적인 fork 코드가 실행될 수 있어서 **신중하게 사용**해야 합니다. `pull_request_target`에서는 반드시 `actions/checkout`을 쓸 때 `ref`를 명시적으로 안전한 브랜치로 지정하세요.

---

## 9. Environments & 배포 승인

### Environment 설정

**Settings > Environments**에서 만들 수 있습니다.

| 설정 항목 | 설명 |
|----------|------|
| **Required reviewers** | 배포 전 승인자 지정 (최대 6명) |
| **Wait timer** | 배포 시작 전 대기 시간 (0~43200분) |
| **Deployment branches** | 특정 브랜치·태그만 배포 허용 |
| **Environment secrets** | 해당 Environment에서만 접근 가능한 시크릿 |
| **Environment variables** | 해당 Environment 전용 변수 |

### 워크플로에서 Environment 사용

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com   # 배포 URL (Actions 탭에 링크로 표시)
    steps:
      - name: 스테이징 배포
        run: echo "스테이징에 배포 중..."
        env:
          DB_URL: ${{ secrets.STAGING_DB_URL }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production                    # Required reviewers 설정 시 여기서 멈춤
      url: https://example.com
    steps:
      - name: 프로덕션 배포
        run: echo "프로덕션에 배포 중..."
        env:
          DB_URL: ${{ secrets.PROD_DB_URL }}
```

승인이 필요한 Environment를 지정하면, Job 실행 전 지정된 Reviewer에게 이메일 알림이 가고 승인을 기다립니다.

---

## 10. Reusable Workflow

반복되는 빌드·테스트 로직을 하나의 워크플로로 만들어 여러 리포지토리에서 호출할 수 있습니다.

### 공통 워크플로 정의 (호출 받는 쪽)

```yaml
# .github/workflows/reusable-node-ci.yml  (공유 리포: my-org/.github)
name: Reusable Node.js CI

on:
  workflow_call:
    inputs:
      node-version:
        description: "사용할 Node.js 버전"
        type: string
        required: false
        default: "20"
      working-directory:
        description: "작업 디렉토리"
        type: string
        required: false
        default: "."
      run-tests:
        description: "테스트 실행 여부"
        type: boolean
        required: false
        default: true
    secrets:
      NPM_TOKEN:
        description: "npm 인증 토큰"
        required: false
    outputs:
      artifact-name:
        description: "업로드된 Artifact 이름"
        value: ${{ jobs.build.outputs.artifact-name }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-name: ${{ steps.set-name.outputs.name }}

    steps:
      - uses: actions/checkout@v4

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "npm"
          cache-dependency-path: ${{ inputs.working-directory }}/package-lock.json

      - name: 의존성 설치
        working-directory: ${{ inputs.working-directory }}
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: 빌드
        working-directory: ${{ inputs.working-directory }}
        run: npm run build

      - name: 테스트
        if: inputs.run-tests
        working-directory: ${{ inputs.working-directory }}
        run: npm test

      - name: Artifact 이름 설정
        id: set-name
        run: echo "name=build-${{ github.run_id }}" >> $GITHUB_OUTPUT

      - name: Artifact 업로드
        uses: actions/upload-artifact@v4
        with:
          name: ${{ steps.set-name.outputs.name }}
          path: ${{ inputs.working-directory }}/dist
```

### 다른 리포에서 호출하는 쪽

```yaml
# .github/workflows/ci.yml  (내 프로젝트 리포)
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  call-shared-ci:
    # 같은 조직의 공유 워크플로 호출
    uses: my-org/.github/.github/workflows/reusable-node-ci.yml@main
    with:
      node-version: "20"
      working-directory: "./frontend"
      run-tests: true
    secrets: inherit              # 현재 리포의 시크릿을 그대로 전달

  use-artifact:
    needs: call-shared-ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: ${{ needs.call-shared-ci.outputs.artifact-name }}
```

`secrets: inherit`를 쓰면 호출하는 리포의 시크릿을 자동으로 전달합니다. 특정 시크릿만 전달하려면 `secrets:` 블록에 명시적으로 나열하면 됩니다.

---

## 11. Composite Action

여러 스텝을 하나의 Action으로 묶어서 재사용할 수 있습니다. Reusable Workflow와 달리 Job이 아닌 Step 수준에서 재사용합니다.

### action.yml 예제

```yaml
# .github/actions/setup-node-full/action.yml
name: "Node.js 전체 설정"
description: "Node.js 설치 + 캐시 + 의존성 설치를 한 번에"

inputs:
  node-version:
    description: "Node.js 버전"
    required: false
    default: "20"
  package-manager:
    description: "패키지 매니저 (npm, yarn, pnpm)"
    required: false
    default: "npm"
  working-directory:
    description: "작업 디렉토리"
    required: false
    default: "."

outputs:
  cache-hit:
    description: "캐시 히트 여부"
    value: ${{ steps.setup.outputs.cache-hit }}

runs:
  using: "composite"
  steps:
    - name: Node.js 설정 및 캐시
      id: setup
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: ${{ inputs.package-manager }}
        cache-dependency-path: ${{ inputs.working-directory }}/package-lock.json

    - name: npm 의존성 설치
      if: inputs.package-manager == 'npm'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci

    - name: yarn 의존성 설치
      if: inputs.package-manager == 'yarn'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: yarn --frozen-lockfile

    - name: pnpm 설정 및 의존성 설치
      if: inputs.package-manager == 'pnpm'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: |
        npm install -g pnpm
        pnpm install --frozen-lockfile
```

### Composite Action 사용

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 같은 리포 내 Composite Action 호출
      - name: Node.js 환경 설정
        uses: ./.github/actions/setup-node-full
        with:
          node-version: "20"
          package-manager: "npm"

      - name: 빌드
        run: npm run build
```

다른 리포에 배포된 Action이라면 `uses: my-org/my-actions/setup-node-full@v1`처럼 호출합니다.

---

## 12. 캐싱 실전

### 캐시 전략 비교

| 방법 | 장점 | 단점 |
|------|------|------|
| `actions/setup-node@v4` `cache:` 옵션 | 설정 간단, 락파일 자동 감지 | Node.js 전용 |
| `actions/cache@v4` 직접 사용 | 범용, 세밀한 제어 가능 | 설정이 약간 복잡 |

### 패키지 매니저별 캐시 키 예제

```yaml
steps:
  - uses: actions/checkout@v4

  # npm 캐시 (setup-node 내장 옵션 사용)
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: "npm"                          # package-lock.json으로 키 자동 생성

  # yarn 캐시 (수동 설정)
  - name: yarn 캐시 디렉토리 경로 확인
    id: yarn-cache-dir
    run: echo "dir=$(yarn cache dir)" >> $GITHUB_OUTPUT

  - uses: actions/cache@v4
    with:
      path: ${{ steps.yarn-cache-dir.outputs.dir }}
      key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
      restore-keys: |
        ${{ runner.os }}-yarn-

  # pnpm 캐시
  - uses: actions/cache@v4
    with:
      path: ~/.local/share/pnpm/store
      key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
      restore-keys: |
        ${{ runner.os }}-pnpm-

  # pip 캐시
  - uses: actions/cache@v4
    with:
      path: ~/.cache/pip
      key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
      restore-keys: |
        ${{ runner.os }}-pip-
```

### 캐시 동작 원리

1. **restore-keys**: `key`로 정확히 일치하는 캐시가 없으면 `restore-keys` 접두사로 가장 최근 캐시를 복원합니다.
2. **캐시 갱신**: 캐시 히트 후 의존성이 바뀌면 Job 끝에 새 캐시를 저장합니다.
3. **캐시 크기 한도**: 리포지토리당 10GB. 7일간 미사용 시 자동 삭제됩니다.

---

## 13. Copilot으로 워크플로 작성하기

GitHub Copilot Chat을 활용하면 워크플로 초안을 빠르게 만들 수 있습니다.

### 프롬프트 예시 3가지

**1. Node.js 20 CI 워크플로**

```
Node.js 20을 사용하는 Express 프로젝트의 CI 워크플로를 만들어줘.
- main 브랜치 push와 PR 때 실행
- npm ci, npm run lint, npm test 실행
- ubuntu-latest 사용
- actions/checkout@v4, actions/setup-node@v4 사용
- npm 캐시 활성화
```

**2. PR에만 실행되는 lint 워크플로**

```
PR을 열거나 새 커밋을 push할 때만 실행되는 ESLint + Prettier 검사 워크플로를 작성해줘.
- pull_request 이벤트의 opened, synchronize, reopened 타입만 트리거
- Node.js 20, ubuntu-latest 사용
- 실패 시 PR에 코멘트 남기는 기능 포함
- concurrency로 같은 PR의 중복 실행 방지
```

**3. 매일 자정 실행되는 백업 워크플로**

```
매일 자정 UTC에 실행되는 데이터베이스 백업 워크플로를 만들어줘.
- schedule: cron '0 0 * * *'
- workflow_dispatch로 수동 실행도 가능하게
- production environment 사용 (시크릿: DB_HOST, DB_PASSWORD)
- 백업 결과를 Artifact로 7일간 보관
- 실패 시 Slack 알림 (secrets.SLACK_WEBHOOK 사용)
```

### Copilot 생성 워크플로 검증 체크리스트

Copilot이 만든 YAML을 그대로 사용하기 전에 반드시 확인하세요.

- [ ] Action 버전이 최신 안정 버전인가? (`@v4` 등)
- [ ] `secrets.*`나 `vars.*`로 참조하는 값이 실제로 설정되어 있나?
- [ ] `runs-on` 값이 올바른가? (`ubuntu-latest`, `windows-latest`, `macos-latest`)
- [ ] `needs:`로 Job 의존성이 올바르게 연결되어 있나?
- [ ] 민감한 값이 `run:` 블록에 직접 노출되지 않나?
- [ ] `concurrency`가 필요한 워크플로에 설정되어 있나?
- [ ] YAML 들여쓰기(2칸)가 올바른가?

---

## 14. 실습 과제

### 과제 1: 기본 CI 파이프라인 구축 (초급)

본인의 GitHub 리포지토리에 다음 조건을 충족하는 CI 워크플로를 만드세요.

- `main` 브랜치 push와 `develop` 브랜치를 대상으로 하는 PR에서 실행
- Node.js 20 사용, `npm ci && npm run build && npm test` 실행
- `src/**` 경로 변경 시에만 실행 (`paths` 필터 사용)
- 성공·실패 여부를 Actions 탭에서 확인

**확인 포인트**: 워크플로 파일 커밋 → Actions 탭 녹색 체크 확인

### 과제 2: Matrix 빌드 + Artifact 저장 (중급)

기존 CI에 다음을 추가하세요.

- Node.js 18, 20 × Ubuntu, Windows Matrix (총 4개 조합)
- `fail-fast: false` 설정
- Ubuntu + Node 20 조합에서만 빌드 결과물을 Artifact로 업로드 (`if:` 조건 사용)
- 두 번째 Job에서 Artifact를 다운로드해서 존재 여부 확인

**확인 포인트**: Actions 탭에서 4개 Job이 병렬 실행되는 것 확인

### 과제 3: Reusable Workflow + Environment 승인 (고급)

팀 프로젝트(또는 2개 리포)를 대상으로 다음을 구현하세요.

1. 공유 리포에 `reusable-ci.yml` 작성 (`workflow_call`, `inputs`, `secrets: inherit` 포함)
2. 프로젝트 리포에서 해당 워크플로 호출
3. `staging` Environment 생성 (Wait timer: 1분)
4. `production` Environment 생성 (Required reviewer: 본인 또는 팀원)
5. 스테이징 배포 → 승인 → 프로덕션 배포 흐름 확인

**확인 포인트**: production Job이 승인 대기 상태로 멈추는 것 확인

---

## 15. 현업 팁

1. **Concurrency로 중복 실행 방지**: feature 브랜치에서 빠르게 push할 때 이전 실행이 쌓이지 않도록 항상 `concurrency`를 설정하세요. 특히 배포 워크플로에서는 필수입니다.

2. **Artifact retention 관리**: `upload-artifact`의 `retention-days`를 명시적으로 설정하세요. 기본 90일은 불필요한 스토리지 비용을 유발합니다. PR용 결과물은 7일, 릴리스 결과물은 90일이 적당합니다.

3. **비용 최적화 — macOS 자제**: macOS Runner는 Ubuntu 대비 10배 비용입니다. iOS/macOS 전용 빌드가 아니라면 Linux를 사용하세요. Matrix에서 macOS를 포함할 때는 `include:`로 꼭 필요한 조합만 추가하세요.

4. **`timeout-minutes` 항상 설정**: 무한 루프나 hang으로 인한 불필요한 Runner 시간 낭비를 막습니다. 일반 CI Job은 15~30분, 빌드가 큰 경우 60분이 적당합니다.

5. **GITHUB_TOKEN 기본 권한 최소화**: Organization 또는 리포지토리 설정에서 `GITHUB_TOKEN`의 기본 권한을 `read-all`로 설정하고, 워크플로별로 필요한 권한만 `permissions:` 블록에 명시하세요.

   ```yaml
   permissions:
     contents: read
     pull-requests: write    # PR 코멘트 남길 때만
   ```

6. **Actions 캐시 키에 OS 포함**: Matrix 빌드에서 OS별로 다른 캐시를 사용해야 합니다. `key: ${{ runner.os }}-npm-...` 형태로 항상 OS를 키에 포함하세요.

7. **워크플로 파일 변경은 PR로**: `.github/workflows/` 변경도 반드시 PR을 통해 검토하세요. 잘못된 시크릿 노출이나 무한 실행 루프를 방지할 수 있습니다. Branch protection rule에 워크플로 파일 리뷰어를 별도로 지정하는 것도 좋은 방법입니다.

---

## 요약

이번 챕터에서 다룬 핵심 내용을 정리합니다.

| 주제 | 핵심 포인트 |
|------|------------|
| 아키텍처 | Workflow > Job > Step > Action, Runner가 실행 |
| 트리거 | `on:` 이벤트 + 필터(`branches`, `paths`, `types`) |
| Concurrency | 중복 실행 방지, `cancel-in-progress: true` |
| Matrix | OS × 런타임 조합 병렬 테스트, `fail-fast: false` |
| 시크릿 | Repository/Environment/Organization 구분, env: 블록으로 안전하게 주입 |
| Environments | 배포 승인, Wait timer, 배포 브랜치 제한 |
| Reusable Workflow | `workflow_call`, `inputs`, `secrets: inherit` |
| Composite Action | `action.yml` `using: composite`, Step 수준 재사용 |
| 캐싱 | `setup-*` 내장 옵션 우선, `actions/cache@v4`로 세밀한 제어 |
| Copilot 활용 | 프롬프트로 초안 생성 → 검증 체크리스트로 확인 |

---

## 다음 단계

Actions의 기초를 익혔으니 이제 실제 Azure 서비스와 연결할 차례입니다.

→ [`ch06_Azure_배포_기초.md`](./ch06_Azure_배포_기초.md)
