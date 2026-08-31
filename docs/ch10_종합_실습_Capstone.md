# 🎓 Chapter 10. 종합 실습 — Capstone Project

> **소요 시간**: 120분 (혼자) / 2일 (팀 워크숍)  
> **난이도**: 🔴 최상급  
> **선수 과목**: Chapter 1~9 완주

---

축하드립니다! Chapter 1부터 9까지 달려오셨군요. 이제 배운 모든 것을 하나의 살아있는 프로젝트로 엮어낼 시간입니다. 이 Capstone은 단순한 복습이 아닙니다. 실제 팀 워크숍이나 사내 해커톤에서 바로 쓸 수 있는 완성형 프로젝트 경험입니다.

---

## 📋 목차

1. [학습 목표](#1-학습-목표)
2. [Capstone 프로젝트 소개: MiniLinkr](#2-capstone-프로젝트-소개-minilinkr)
3. [최종 아키텍처](#3-최종-아키텍처)
4. [Sprint 1 — 이슈부터 브랜치까지](#4-sprint-1--이슈부터-브랜치까지-ch4)
5. [Sprint 2 — Copilot으로 개발](#5-sprint-2--copilot으로-개발-ch1-3)
6. [Sprint 3 — CI 파이프라인](#6-sprint-3--ci-파이프라인-ch5-ch9)
7. [Sprint 4 — Azure 프로비저닝](#7-sprint-4--azure-프로비저닝-ch6)
8. [Sprint 5 — CD 파이프라인](#8-sprint-5--cd-파이프라인-ch7-ch8)
9. [Sprint 6 — 관측 & 롤백](#9-sprint-6--관측--롤백-ch9)
10. [Sprint 7 — 회고](#10-sprint-7--회고)
11. [제출 · 심사 기준](#11-제출--심사-기준)
12. [확장 미션 (해커톤형)](#12-확장-미션-해커톤형)
13. [참고 자료](#13-참고-자료)

---

## 1. 학습 목표

이 Capstone을 완료하면 다음 10가지를 스스로 증명할 수 있게 됩니다.

1. **GitHub Copilot을 실전 개발 도구로** 사용하여 프로젝트 전체 사이클을 가속할 수 있다.
2. **Copilot Chat · Edit · Agent 모드**를 상황에 맞게 선택하고 적용할 수 있다.
3. **GitHub Project + 이슈 + 마일스톤**으로 스프린트를 관리할 수 있다.
4. **GitHub Actions CI 파이프라인**을 직접 설계하고 PR 체크를 필수화할 수 있다.
5. **GHAS(CodeQL, Secret Scanning, Dependabot)**로 공급망 보안을 자동화할 수 있다.
6. **Bicep IaC**로 Azure 인프라를 코드로 프로비저닝하고 환경별 파라미터를 분리할 수 있다.
7. **OIDC Federated Credentials**로 비밀 없는 배포 파이프라인을 구성할 수 있다.
8. **GitHub Environments + 승인 게이트**로 dev → staging → production 배포 흐름을 완성할 수 있다.
9. **Application Insights + KQL**로 서비스 상태를 관측하고, 장애 시 자동 롤백을 트리거할 수 있다.
10. **프로젝트 전체를 처음부터 끝까지 재현 가능하게** 문서화하고 팀에 발표할 수 있다.

---

## 2. Capstone 프로젝트 소개: MiniLinkr

### 왜 URL 단축기인가?

URL 단축기는 규모가 작지만 실전에서 필요한 거의 모든 개념을 포함합니다.

- **DB 설계** (users, links, visits)
- **API 개발** (REST, 리디렉션, 통계)
- **캐싱** (Redis로 slug 조회 가속)
- **컨테이너 배포** (Docker + Azure Container Apps)
- **보안** (Key Vault, Secret Scanning, OIDC)
- **관측** (Application Insights, 클릭 수 추적)

이 규모라면 하루 안에 완성할 수 있고, 팀 워크숍에서는 2일이면 고품질 데모까지 나옵니다.

### 2.1 기능 요구사항

| # | 기능 | 설명 |
|---|------|------|
| F-1 | URL 단축 | 긴 URL을 입력하면 6자리 slug를 생성하여 단축 URL을 반환한다 |
| F-2 | 리디렉션 | `/:slug`로 접근하면 원본 URL로 301/302 리디렉션한다 |
| F-3 | 클릭 통계 | slug별 클릭 수, 최근 방문 시각을 조회할 수 있다 |
| F-4 | 만료 지원 | 링크 생성 시 TTL(분)을 지정하면 만료 후 404를 반환한다 |
| F-5 | 헬스 체크 | `GET /health`로 DB·Redis 연결 상태를 반환한다 |

### 2.2 비기능 요구사항

| # | 항목 | 목표 |
|---|------|------|
| NF-1 | 응답 지연 | p99 리디렉션 응답 100ms 이하 (Redis 캐시 히트 기준) |
| NF-2 | 보안 | 비밀 값(DB 연결 문자열, Redis 키)은 Key Vault에서만 로딩, 소스에 절대 하드코딩 금지 |
| NF-3 | 관측 가능성 | 모든 요청에 대해 Application Insights 트레이스 수집, 오류율 1% 초과 시 알림 발송 |

---

## 3. 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                          인터넷 (사용자)                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS
                    ┌───────────▼───────────┐
                    │  Azure Front Door      │  (선택 사항)
                    │  + CDN + WAF           │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Azure Container Apps  │
                    │  (Node.js + Fastify)   │◄──── ACR (이미지)
                    │  Revision 기반 배포     │
                    └──┬──────────┬─────────┘
                       │          │
           ┌───────────▼──┐  ┌───▼──────────────┐
           │  Azure Cache  │  │  Postgres         │
           │  for Redis    │  │  Flexible Server  │
           └───────────────┘  └──────────────────┘
                       │
           ┌───────────▼──────────────────────────┐
           │          Azure Key Vault              │
           │  (DB_URL, REDIS_URL, APP_SECRET)      │
           └──────────────────────────────────────┘
                       │
           ┌───────────▼──────────────────────────┐
           │       Application Insights            │
           │  + Log Analytics Workspace            │
           └──────────────────────────────────────┘

CI/CD 흐름:
  GitHub → Actions CI → ACR push → Container Apps deploy
                ↑
         OIDC (비밀 없음)
```

### 리소스 명명 규칙

모든 리소스는 `{prefix}-{env}` 패턴을 따릅니다.

| 리소스 | 개발 | 프로덕션 |
|--------|------|----------|
| Resource Group | `rg-minilinkr-dev` | `rg-minilinkr-prod` |
| Container Apps Env | `cae-minilinkr-dev` | `cae-minilinkr-prod` |
| Container App | `ca-minilinkr-dev` | `ca-minilinkr-prod` |
| Postgres | `psql-minilinkr-dev` | `psql-minilinkr-prod` |
| Redis | `redis-minilinkr-dev` | `redis-minilinkr-prod` |
| Key Vault | `kv-minilinkr-dev` | `kv-minilinkr-prod` |
| ACR | `acrminilinkr` | (공유) |

---

## 4. Sprint 1 — 이슈부터 브랜치까지 ([Ch.4](./ch04_GitHub_리포지토리_관리.md))

### 4.1 리포지토리 생성

```bash
# GitHub CLI로 리포 생성
gh repo create Ai-Advanced/minilinkr \
  --private \
  --description "MiniLinkr: URL shortener Capstone project" \
  --clone

cd minilinkr
```

### 4.2 GitHub Project 생성 & 이슈 정의

```bash
# 프로젝트 생성
gh project create \
  --owner Ai-Advanced \
  --title "MiniLinkr Capstone" \
  --format board
```

#### 이슈 템플릿 설정

`.github/ISSUE_TEMPLATE/feature.yml` 파일을 생성합니다.

```yaml
name: Feature Request
description: 새로운 기능 요청
title: "[FEAT] "
labels: ["feature", "triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        기능 요청 전에 기존 이슈를 검색해 주세요.
  - type: input
    id: summary
    attributes:
      label: 기능 요약
      placeholder: 한 문장으로 설명해 주세요.
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: 상세 설명
      description: 왜 필요한지, 어떻게 동작해야 하는지 작성해 주세요.
    validations:
      required: true
  - type: dropdown
    id: priority
    attributes:
      label: 우선순위
      options:
        - P0 - Critical
        - P1 - High
        - P2 - Medium
        - P3 - Low
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: 인수 기준 (Acceptance Criteria)
      placeholder: |
        - [ ] 조건 1
        - [ ] 조건 2
    validations:
      required: true
```

`.github/ISSUE_TEMPLATE/bug.yml` 파일을 생성합니다.

```yaml
name: Bug Report
description: 버그 신고
title: "[BUG] "
labels: ["bug", "triage"]
body:
  - type: input
    id: summary
    attributes:
      label: 버그 요약
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: 재현 단계
      placeholder: |
        1. ...
        2. ...
        3. 오류 발생
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 기대 동작
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: 실제 동작
    validations:
      required: true
  - type: dropdown
    id: severity
    attributes:
      label: 심각도
      options:
        - Critical
        - High
        - Medium
        - Low
    validations:
      required: true
```

#### Copilot으로 이슈 초안 생성

GitHub CLI와 Copilot을 조합하여 이슈를 빠르게 만들 수 있습니다.

```bash
# Copilot CLI 설치 (아직 없다면)
gh extension install github/gh-copilot

# Copilot에게 이슈 초안 요청
gh copilot suggest "F-1 URL 단축 기능 구현 이슈를 GitHub 이슈 형식으로 작성해줘. \
  POST /shorten 엔드포인트, Prisma + Postgres, 6자리 nanoid slug, \
  중복 처리, Zod 검증을 포함해야 해."
```

#### 이슈 일괄 생성

```bash
# 스프린트 1 이슈들을 CLI로 생성
gh issue create \
  --title "[FEAT] POST /shorten 엔드포인트 구현" \
  --label "feature,sprint-1" \
  --milestone "v0.1.0" \
  --body "$(cat .github/ISSUE_TEMPLATE/feature.yml | head -1)"

gh issue create \
  --title "[FEAT] GET /:slug 리디렉션 구현" \
  --label "feature,sprint-1" \
  --milestone "v0.1.0"

gh issue create \
  --title "[FEAT] GET /api/stats/:slug 통계 API 구현" \
  --label "feature,sprint-2" \
  --milestone "v0.1.0"

gh issue create \
  --title "[INFRA] Bicep IaC 작성 (ACR, Container Apps, Postgres, Redis)" \
  --label "infra,sprint-4" \
  --milestone "v0.1.0"

gh issue create \
  --title "[CI] GitHub Actions CI 파이프라인 구성" \
  --label "ci,sprint-3" \
  --milestone "v0.1.0"
```

### 4.3 브랜치 & 리포 세팅

#### `.github/copilot-instructions.md` 작성

이 파일은 Copilot이 이 프로젝트의 맥락을 이해하도록 돕습니다. ([Ch.3 참조](./ch03_Copilot_고급_활용_Custom_Agents_MCP.md))

```markdown
# Copilot Instructions — MiniLinkr

## 프로젝트 개요
MiniLinkr는 Node.js(Fastify) + Postgres + Redis 기반의 URL 단축 서비스입니다.
Azure Container Apps에 배포되며, GitHub Actions로 CI/CD가 자동화됩니다.

## 기술 스택
- **런타임**: Node.js 20 LTS
- **프레임워크**: Fastify 4.x
- **ORM**: Prisma 5.x
- **검증**: Zod 3.x
- **테스트**: Vitest 1.x
- **DB**: PostgreSQL 15 (Azure Flexible Server)
- **캐시**: Redis 7 (Azure Cache for Redis)
- **컨테이너**: Docker + Azure Container Apps
- **IaC**: Bicep

## 코드 스타일
- TypeScript strict 모드 사용
- 함수형 스타일 선호 (클래스 최소화)
- 에러는 반드시 typed error (discriminated union)로 처리
- 모든 환경 변수는 `src/config.ts`에서 Zod로 파싱
- 테스트는 Vitest, describe/it 블록, 커버리지 80% 이상 목표

## 금지 사항
- `any` 타입 사용 금지
- `console.log` 대신 Fastify 내장 로거(`req.log`) 사용
- 환경 변수를 코드에 직접 하드코딩 금지
- `try/catch` 없이 await 사용 금지

## 폴더 구조
src/
  config.ts        # 환경 변수 파싱 (Zod)
  app.ts           # Fastify 앱 팩토리
  server.ts        # 진입점
  plugins/         # Fastify 플러그인 (db, redis, auth)
  routes/          # 라우터 (shorten, redirect, stats, health)
  services/        # 비즈니스 로직
  utils/           # 유틸 함수 (slug 생성 등)
prisma/
  schema.prisma
infra/             # Bicep IaC
.github/
  workflows/       # CI/CD
```

#### `CODEOWNERS` 파일

```
# .github/CODEOWNERS
# 모든 파일의 기본 소유자
* @Ai-Advanced/minilinkr-team

# 인프라 변경은 인프라 팀 필수 리뷰
/infra/ @Ai-Advanced/infra-team
/.github/workflows/ @Ai-Advanced/infra-team

# Prisma 스키마 변경은 백엔드 리드 필수 리뷰
/prisma/ @Ai-Advanced/backend-lead
```

#### PR 템플릿

`.github/pull_request_template.md` 파일을 생성합니다.

```markdown
## 변경 사항 요약

<!-- 무엇을 왜 변경했는지 간략히 작성해 주세요 -->

## 관련 이슈

Closes #

## 변경 유형

- [ ] 버그 수정
- [ ] 새 기능
- [ ] 리팩터링
- [ ] 문서
- [ ] 인프라/CI

## 테스트

- [ ] 유닛 테스트 추가/수정
- [ ] 로컬에서 `npm test` 통과 확인
- [ ] `docker-compose up`으로 통합 테스트 확인

## Copilot 활용 내역

<!-- 이 PR에서 Copilot을 어떻게 활용했는지 간략히 기록해 주세요 -->
- [ ] Copilot Chat으로 로직 설계 도움받음
- [ ] Copilot Edit으로 파일 일괄 수정
- [ ] Copilot Agent로 테스트 스캐폴딩
- [ ] 해당 없음

## 체크리스트

- [ ] 환경 변수 하드코딩 없음
- [ ] `any` 타입 사용 없음
- [ ] 로컬 `docker-compose up` 확인
- [ ] CI 통과 확인
```

브랜치 보호 규칙을 설정합니다.

```bash
# main 브랜치 보호 설정
gh api repos/Ai-Advanced/minilinkr/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci / lint","ci / test (20)","ci / test (22)","ci / build"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

---

## 5. Sprint 2 — Copilot으로 개발 ([Ch.1](./ch01_Copilot_소개_및_시작하기.md)~[Ch.3](./ch03_Copilot_고급_활용_Custom_Agents_MCP.md))

### 5.1 프로젝트 스캐폴딩

```bash
# 브랜치 생성
git checkout -b feat/scaffold

# Node.js 프로젝트 초기화
npm init -y

# 의존성 설치
npm install fastify @fastify/redis @fastify/sensible \
  @prisma/client nanoid zod \
  @opentelemetry/api applicationinsights

npm install -D typescript @types/node prisma \
  vitest @vitest/coverage-v8 \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  tsx rimraf

# TypeScript 초기화
npx tsc --init --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext --outDir dist --rootDir src
```

#### `package.json` 스크립트

```json
{
  "name": "minilinkr",
  "version": "0.1.0",
  "description": "URL shortener — Capstone project",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "rimraf dist && tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

#### 파일 구조

```
minilinkr/
├── .github/
│   ├── copilot-instructions.md
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature.yml
│   │   └── bug.yml
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── infra/
│   ├── main.bicep
│   ├── modules/
│   │   ├── containerApps.bicep
│   │   ├── postgres.bicep
│   │   ├── redis.bicep
│   │   └── keyVault.bicep
│   ├── main.parameters.dev.json
│   └── main.parameters.prod.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config.ts
│   ├── app.ts
│   ├── server.ts
│   ├── plugins/
│   │   ├── db.ts
│   │   └── redis.ts
│   ├── routes/
│   │   ├── shorten.ts
│   │   ├── redirect.ts
│   │   ├── stats.ts
│   │   └── health.ts
│   ├── services/
│   │   └── linkService.ts
│   └── utils/
│       └── slug.ts
├── tests/
│   ├── unit/
│   │   ├── slug.test.ts
│   │   └── linkService.test.ts
│   └── integration/
│       └── api.test.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

### 5.2 핵심 도메인 코드 작성

#### Prisma 스키마

`prisma/schema.prisma` 파일을 작성합니다.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  links     Link[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Link {
  id          String    @id @default(cuid())
  slug        String    @unique @db.VarChar(12)
  originalUrl String    @map("original_url") @db.Text
  userId      String?   @map("user_id")
  user        User?     @relation(fields: [userId], references: [id])
  expiresAt   DateTime? @map("expires_at")
  visits      Visit[]
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([slug])
  @@index([userId])
  @@map("links")
}

model Visit {
  id        String   @id @default(cuid())
  linkId    String   @map("link_id")
  link      Link     @relation(fields: [linkId], references: [id])
  userAgent String?  @map("user_agent") @db.Text
  referer   String?  @db.Text
  ip        String?  @db.VarChar(45)
  visitedAt DateTime @default(now()) @map("visited_at")

  @@index([linkId])
  @@index([visitedAt])
  @@map("visits")
}
```

#### 환경 변수 설정 (`src/config.ts`)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  APPINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('환경 변수 검증 실패:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
```

#### Slug 생성 유틸 (`src/utils/slug.ts`)

```typescript
import { customAlphabet } from 'nanoid';

// URL-safe 문자만 사용, 혼동되는 문자(0, O, I, l) 제외
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const DEFAULT_LENGTH = 6;

export const generateSlug = customAlphabet(ALPHABET, DEFAULT_LENGTH);

export function isValidSlug(slug: string): boolean {
  return /^[23456789abcdefghjkmnpqrstuvwxyz]{4,12}$/.test(slug);
}
```

#### Link 서비스 (`src/services/linkService.ts`)

```typescript
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { generateSlug } from '../utils/slug.js';

const CACHE_TTL_SECONDS = 3600; // 1시간
const CACHE_PREFIX = 'slug:';

export type CreateLinkInput = {
  originalUrl: string;
  userId?: string;
  ttlMinutes?: number;
};

export type LinkResult =
  | { ok: true; slug: string; shortUrl: string; expiresAt: Date | null }
  | { ok: false; error: 'DUPLICATE_SLUG' | 'INVALID_URL' | 'DB_ERROR' };

export type ResolveResult =
  | { ok: true; originalUrl: string }
  | { ok: false; error: 'NOT_FOUND' | 'EXPIRED' };

export function createLinkService(db: PrismaClient, redis: Redis, baseUrl: string) {
  async function createLink(input: CreateLinkInput): Promise<LinkResult> {
    let slug = generateSlug();
    let attempts = 0;

    // 최대 5회 재시도로 slug 충돌 처리
    while (attempts < 5) {
      const existing = await db.link.findUnique({ where: { slug } });
      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    if (attempts >= 5) {
      return { ok: false, error: 'DUPLICATE_SLUG' };
    }

    const expiresAt = input.ttlMinutes
      ? new Date(Date.now() + input.ttlMinutes * 60 * 1000)
      : null;

    try {
      const link = await db.link.create({
        data: {
          slug,
          originalUrl: input.originalUrl,
          userId: input.userId ?? null,
          expiresAt,
        },
      });

      // 캐시에 저장
      const cacheTtl = input.ttlMinutes
        ? Math.min(input.ttlMinutes * 60, CACHE_TTL_SECONDS)
        : CACHE_TTL_SECONDS;
      await redis.setex(`${CACHE_PREFIX}${slug}`, cacheTtl, input.originalUrl);

      return {
        ok: true,
        slug: link.slug,
        shortUrl: `${baseUrl}/${link.slug}`,
        expiresAt: link.expiresAt,
      };
    } catch {
      return { ok: false, error: 'DB_ERROR' };
    }
  }

  async function resolveLink(slug: string): Promise<ResolveResult> {
    // 1. Redis 캐시 조회
    const cached = await redis.get(`${CACHE_PREFIX}${slug}`);
    if (cached) {
      return { ok: true, originalUrl: cached };
    }

    // 2. DB 조회
    const link = await db.link.findUnique({ where: { slug } });
    if (!link) {
      return { ok: false, error: 'NOT_FOUND' };
    }

    // 만료 확인
    if (link.expiresAt && link.expiresAt < new Date()) {
      return { ok: false, error: 'EXPIRED' };
    }

    // 캐시 갱신
    await redis.setex(`${CACHE_PREFIX}${slug}`, CACHE_TTL_SECONDS, link.originalUrl);

    return { ok: true, originalUrl: link.originalUrl };
  }

  async function recordVisit(slug: string, meta: { userAgent?: string; referer?: string; ip?: string }) {
    const link = await db.link.findUnique({ where: { slug }, select: { id: true } });
    if (!link) return;

    await db.visit.create({
      data: {
        linkId: link.id,
        userAgent: meta.userAgent ?? null,
        referer: meta.referer ?? null,
        ip: meta.ip ?? null,
      },
    });
  }

  async function getStats(slug: string) {
    const link = await db.link.findUnique({
      where: { slug },
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: { visitedAt: true },
        },
      },
    });

    if (!link) return null;

    return {
      slug: link.slug,
      originalUrl: link.originalUrl,
      totalVisits: link._count.visits,
      lastVisitAt: link.visits[0]?.visitedAt ?? null,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    };
  }

  return { createLink, resolveLink, recordVisit, getStats };
}
```

#### Fastify 앱 팩토리 (`src/app.ts`)

```typescript
import Fastify from 'fastify';
import { config } from './config.js';
import { shortenRoute } from './routes/shorten.js';
import { redirectRoute } from './routes/redirect.js';
import { statsRoute } from './routes/stats.js';
import { healthRoute } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // 라우트 등록
  await app.register(shortenRoute);
  await app.register(redirectRoute);
  await app.register(statsRoute);
  await app.register(healthRoute);

  return app;
}
```

#### 단축 엔드포인트 (`src/routes/shorten.ts`)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createLinkService } from '../services/linkService.js';
import { config } from '../config.js';

const shortenBodySchema = z.object({
  url: z.string().url({ message: '유효한 URL을 입력해 주세요.' }),
  ttlMinutes: z.number().int().min(1).max(525600).optional(), // 최대 1년
});

export const shortenRoute: FastifyPluginAsync = async (app) => {
  app.post('/shorten', async (req, reply) => {
    const parsed = shortenBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // 데코레이터로 주입된 서비스 사용 (app.ts에서 등록)
    const linkService = createLinkService(
      (app as any).prisma,
      (app as any).redis,
      config.BASE_URL,
    );

    const result = await linkService.createLink({
      originalUrl: parsed.data.url,
      ttlMinutes: parsed.data.ttlMinutes,
    });

    if (!result.ok) {
      req.log.error({ error: result.error }, 'Link creation failed');
      return reply.status(500).send({ error: result.error });
    }

    req.log.info({ slug: result.slug }, 'Link created');
    return reply.status(201).send(result);
  });
};
```

#### 리디렉션 라우터 (`src/routes/redirect.ts`)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { createLinkService } from '../services/linkService.js';
import { isValidSlug } from '../utils/slug.js';
import { config } from '../config.js';

export const redirectRoute: FastifyPluginAsync = async (app) => {
  app.get('/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };

    if (!isValidSlug(slug)) {
      return reply.status(400).send({ error: 'INVALID_SLUG' });
    }

    const linkService = createLinkService(
      (app as any).prisma,
      (app as any).redis,
      config.BASE_URL,
    );

    const result = await linkService.resolveLink(slug);

    if (!result.ok) {
      return reply.status(result.error === 'EXPIRED' ? 410 : 404).send({ error: result.error });
    }

    // 방문 기록 (비동기, 리디렉션 지연 없음)
    void linkService.recordVisit(slug, {
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      ip: req.ip,
    });

    return reply.redirect(result.originalUrl, 302);
  });
};
```

#### 통계 라우터 (`src/routes/stats.ts`)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { createLinkService } from '../services/linkService.js';
import { isValidSlug } from '../utils/slug.js';
import { config } from '../config.js';

export const statsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/stats/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };

    if (!isValidSlug(slug)) {
      return reply.status(400).send({ error: 'INVALID_SLUG' });
    }

    const linkService = createLinkService(
      (app as any).prisma,
      (app as any).redis,
      config.BASE_URL,
    );

    const stats = await linkService.getStats(slug);
    if (!stats) {
      return reply.status(404).send({ error: 'NOT_FOUND' });
    }

    return reply.send(stats);
  });
};
```

#### 헬스 체크 라우터 (`src/routes/health.ts`)

```typescript
import type { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async (req, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {
      db: 'ok',
      redis: 'ok',
    };

    try {
      await (app as any).prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.db = 'error';
    }

    try {
      await (app as any).redis.ping();
    } catch {
      checks.redis = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
};
```

### 5.3 테스트 & 로컬 실행

#### Vitest 유닛 테스트 (`tests/unit/slug.test.ts`)

```typescript
import { describe, expect, it } from 'vitest';
import { generateSlug, isValidSlug } from '../../src/utils/slug.js';

describe('generateSlug', () => {
  it('기본 길이 6자리 slug를 생성한다', () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(6);
  });

  it('허용된 알파벳 문자만 포함한다', () => {
    for (let i = 0; i < 100; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
    }
  });

  it('연속으로 생성한 slug는 서로 다르다', () => {
    const slugs = Array.from({ length: 1000 }, () => generateSlug());
    const unique = new Set(slugs);
    expect(unique.size).toBe(1000);
  });
});

describe('isValidSlug', () => {
  it('유효한 slug를 통과시킨다', () => {
    expect(isValidSlug('abc234')).toBe(true);
    expect(isValidSlug('abcdefgh')).toBe(true);
  });

  it('너무 짧은 slug를 거부한다', () => {
    expect(isValidSlug('ab2')).toBe(false);
  });

  it('혼동 문자를 포함한 slug를 거부한다', () => {
    expect(isValidSlug('abc0ef')).toBe(false);  // 0 포함
    expect(isValidSlug('abcOef')).toBe(false);  // O 포함
    expect(isValidSlug('abcIef')).toBe(false);  // I 포함
  });
});
```

#### `docker-compose.yml` (로컬 개발용)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: minilinkr
      POSTGRES_PASSWORD: localdevpassword
      POSTGRES_DB: minilinkr
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minilinkr"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass localdevpassword
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "localdevpassword", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

#### `.env.example`

```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://minilinkr:localdevpassword@localhost:5432/minilinkr
REDIS_URL=redis://:localdevpassword@localhost:6379
BASE_URL=http://localhost:3000
LOG_LEVEL=debug
# APPINSIGHTS_CONNECTION_STRING=  # 로컬에서는 선택 사항
```

#### 로컬 검증

```bash
# .env 파일 준비
cp .env.example .env

# 로컬 인프라 시작
docker-compose up -d

# DB 마이그레이션
npx prisma migrate dev --name init

# 개발 서버 시작
npm run dev

# 새 터미널에서 동작 확인
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/Ai-Advanced/minilinkr"}'

# 응답 예시:
# {"ok":true,"slug":"a3k9m2","shortUrl":"http://localhost:3000/a3k9m2","expiresAt":null}

# 리디렉션 확인
curl -L http://localhost:3000/a3k9m2

# 통계 확인
curl http://localhost:3000/api/stats/a3k9m2

# 테스트 실행
npm test
```

---

## 6. Sprint 3 — CI 파이프라인 ([Ch.5](./ch05_GitHub_Actions_기초.md), [Ch.9](./ch09_보안_모니터링_롤백.md))

### 6.1 CI 워크플로

`.github/workflows/ci.yml` 파일을 작성합니다.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  security-events: write  # CodeQL 결과 업로드용

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check TypeScript types
        run: npx tsc --noEmit

  test:
    name: Test (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    needs: lint

    strategy:
      matrix:
        node: ['20', '22']
      fail-fast: false

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: minilinkr
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: minilinkr_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://minilinkr:testpassword@localhost:5432/minilinkr_test
      REDIS_URL: redis://localhost:6379
      BASE_URL: http://localhost:3000
      PORT: '3000'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run DB migrations
        run: npx prisma migrate deploy

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: matrix.node == '20'
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build & Docker build check
    runs-on: ubuntu-latest
    needs: lint

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Build TypeScript
        run: npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (no push)
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: minilinkr:ci-check
          cache-from: type=gha
          cache-to: type=gha,mode=max

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    needs: lint
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci && npx prisma generate && npm run build

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript-typescript"
```

#### `Dockerfile`

```dockerfile
# --- 빌드 스테이지 ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# --- 실행 스테이지 ---
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: 비-루트 사용자로 실행
RUN addgroup -g 1001 -S nodejs && adduser -S fastify -u 1001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

USER fastify

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### 6.2 GHAS 활성화

#### Dependabot 설정 (`.github/dependabot.yml`)

```yaml
version: 2

updates:
  # npm 의존성 자동 업데이트
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Seoul"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
    groups:
      production-dependencies:
        dependency-type: "production"
      development-dependencies:
        dependency-type: "development"

  # GitHub Actions 버전 자동 업데이트
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Seoul"
    labels:
      - "dependencies"
      - "github-actions"
```

Secret Scanning과 Push Protection은 리포지토리 Settings > Security > Code security and analysis에서 활성화합니다.

---

## 7. Sprint 4 — Azure 프로비저닝 ([Ch.6](./ch06_Azure_배포_기초.md))

### 7.1 Bicep IaC

#### `infra/main.bicep`

```bicep
targetScope = 'resourceGroup'

@description('환경 이름 (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string

@description('리소스 위치')
param location string = resourceGroup().location

@description('컨테이너 이미지 태그')
param imageTag string = 'latest'

@description('Postgres 관리자 비밀번호')
@secure()
param postgresAdminPassword string

@description('알림 이메일')
param alertEmail string

var prefix = 'minilinkr'
var resourcePrefix = '${prefix}-${environment}'

// Azure Container Registry (환경 공유)
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'acrminilinkr'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-${resourcePrefix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${resourcePrefix}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${resourcePrefix}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

// Postgres Flexible Server
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: 'psql-${resourcePrefix}'
  location: location
  sku: {
    name: environment == 'prod' ? 'Standard_D2ds_v5' : 'Standard_B1ms'
    tier: environment == 'prod' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    administratorLogin: 'minilinkradmin'
    administratorLoginPassword: postgresAdminPassword
    version: '15'
    storage: {
      storageSizeGB: environment == 'prod' ? 128 : 32
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 7 : 1
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'minilinkr'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

// Redis Cache
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${resourcePrefix}'
  location: location
  properties: {
    sku: {
      name: environment == 'prod' ? 'Standard' : 'Basic'
      family: environment == 'prod' ? 'C' : 'C'
      capacity: environment == 'prod' ? 1 : 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Key Vault Secrets
resource secretDbUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: 'postgresql://minilinkradmin:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/minilinkr?sslmode=require'
  }
}

resource secretRedisUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'REDIS-URL'
  properties: {
    value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380'
  }
}

resource secretAppInsights 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'APPINSIGHTS-CONNECTION-STRING'
  properties: {
    value: appInsights.properties.ConnectionString
  }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${resourcePrefix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-${resourcePrefix}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: 'system'
        }
      ]
      secrets: []
    }
    template: {
      containers: [
        {
          name: 'minilinkr'
          image: '${acr.properties.loginServer}/minilinkr:${imageTag}'
          env: [
            { name: 'NODE_ENV', value: environment == 'prod' ? 'production' : 'development' }
            { name: 'PORT', value: '3000' }
            { name: 'BASE_URL', value: 'https://ca-${resourcePrefix}.${containerAppsEnv.properties.defaultDomain}' }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
          ]
          resources: {
            cpu: json(environment == 'prod' ? '1.0' : '0.5')
            memory: environment == 'prod' ? '2Gi' : '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 15
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: environment == 'prod' ? 2 : 0
        maxReplicas: environment == 'prod' ? 10 : 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// ACR Pull 권한 부여
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, containerApp.id, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secret User 권한 부여
resource kvSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerApp.id, 'kvSecretUser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output keyVaultName string = keyVault.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
```

#### `infra/main.parameters.dev.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "location": {
      "value": "koreacentral"
    },
    "imageTag": {
      "value": "latest"
    },
    "alertEmail": {
      "value": "team@example.com"
    }
  }
}
```

#### `infra/main.parameters.prod.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "prod"
    },
    "location": {
      "value": "koreacentral"
    },
    "imageTag": {
      "value": "stable"
    },
    "alertEmail": {
      "value": "oncall@example.com"
    }
  }
}
```

#### 배포 명령

```bash
# 환경 변수 설정
SUBSCRIPTION_ID="your-subscription-id"
RG_DEV="rg-minilinkr-dev"
POSTGRES_PASSWORD="$(openssl rand -base64 24)"

# 리소스 그룹 생성
az group create --name $RG_DEV --location koreacentral

# Bicep 배포 (dev)
az deployment group create \
  --resource-group $RG_DEV \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.dev.json \
  --parameters postgresAdminPassword="$POSTGRES_PASSWORD" \
  --name "minilinkr-dev-$(date +%Y%m%d%H%M%S)"
```

### 7.2 OIDC & Federated Credentials

```bash
# 3개 서비스 프린시펄 생성
az ad app create --display-name "minilinkr-dev-sp"
az ad app create --display-name "minilinkr-staging-sp"
az ad app create --display-name "minilinkr-prod-sp"

# dev 환경 — main 브랜치 푸시 트리거
DEV_APP_ID=$(az ad app list --display-name minilinkr-dev-sp --query '[0].appId' -o tsv)
az ad app federated-credential create \
  --id $DEV_APP_ID \
  --parameters '{
    "name": "github-dev",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:Ai-Advanced/minilinkr:environment:dev",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# staging 환경 — staging environment 트리거
STAGING_APP_ID=$(az ad app list --display-name minilinkr-staging-sp --query '[0].appId' -o tsv)
az ad app federated-credential create \
  --id $STAGING_APP_ID \
  --parameters '{
    "name": "github-staging",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:Ai-Advanced/minilinkr:environment:staging",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# prod 환경 — production environment 트리거
PROD_APP_ID=$(az ad app list --display-name minilinkr-prod-sp --query '[0].appId' -o tsv)
az ad app federated-credential create \
  --id $PROD_APP_ID \
  --parameters '{
    "name": "github-prod",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:Ai-Advanced/minilinkr:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 각 SP에 권한 부여
for SP in $DEV_APP_ID $STAGING_APP_ID $PROD_APP_ID; do
  SP_OBJECT_ID=$(az ad sp show --id $SP --query id -o tsv 2>/dev/null || \
    az ad sp create --id $SP --query id -o tsv)
  az role assignment create \
    --assignee-object-id $SP_OBJECT_ID \
    --assignee-principal-type ServicePrincipal \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID"
done

# GitHub Secrets 등록
gh secret set AZURE_CLIENT_ID_DEV --body "$DEV_APP_ID"
gh secret set AZURE_CLIENT_ID_STAGING --body "$STAGING_APP_ID"
gh secret set AZURE_CLIENT_ID_PROD --body "$PROD_APP_ID"
gh secret set AZURE_TENANT_ID --body "$(az account show --query tenantId -o tsv)"
gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID"
```

---

## 8. Sprint 5 — CD 파이프라인 ([Ch.7](./ch07_GitHub_Actions_Azure_통합_CICD.md), [Ch.8](./ch08_실전_웹앱_배포_자동화.md))

### 8.1 Environments 설정

```bash
# GitHub CLI로 환경 생성
gh api repos/Ai-Advanced/minilinkr/environments/dev \
  --method PUT \
  --field wait_timer=0

gh api repos/Ai-Advanced/minilinkr/environments/staging \
  --method PUT \
  --field reviewers='[{"type":"User","id":YOUR_USER_ID}]' \
  --field wait_timer=0

gh api repos/Ai-Advanced/minilinkr/environments/production \
  --method PUT \
  --field reviewers='[{"type":"User","id":USER1_ID},{"type":"User","id":USER2_ID}]' \
  --field wait_timer=300
```

### 8.2 배포 워크플로

`.github/workflows/deploy.yml` 파일을 작성합니다.

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: '배포 환경'
        required: true
        default: 'dev'
        type: choice
        options: [dev, staging, production]

permissions:
  id-token: write
  contents: read

env:
  ACR_NAME: acrminilinkr
  IMAGE_NAME: minilinkr

jobs:
  build-and-push:
    name: Build & Push to ACR
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.tag.outputs.tag }}

    steps:
      - uses: actions/checkout@v4

      - name: Generate image tag
        id: tag
        run: echo "tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"

      - name: Azure Login (dev SP — ACR push용)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_DEV }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to ACR
        run: az acr login --name ${{ env.ACR_NAME }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ steps.tag.outputs.tag }}
            ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-dev:
    name: Deploy to Dev
    needs: build-and-push
    runs-on: ubuntu-latest
    environment:
      name: dev
      url: https://ca-minilinkr-dev.${{ vars.CONTAINER_APPS_DOMAIN }}

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_DEV }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Container Apps (dev)
        run: |
          az containerapp update \
            --name ca-minilinkr-dev \
            --resource-group rg-minilinkr-dev \
            --image ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ needs.build-and-push.outputs.image-tag }} \
            --revision-suffix "sha-${{ github.sha }}" \
            --output none

      - name: Wait for rollout
        run: |
          az containerapp revision list \
            --name ca-minilinkr-dev \
            --resource-group rg-minilinkr-dev \
            --query "[?name=='ca-minilinkr-dev--sha-${GITHUB_SHA:0:8}'].properties.runningState" \
            --output tsv
          sleep 30

      - name: Smoke test (dev)
        run: |
          APP_URL="https://$(az containerapp show \
            --name ca-minilinkr-dev \
            --resource-group rg-minilinkr-dev \
            --query properties.configuration.ingress.fqdn -o tsv)"

          echo "Testing $APP_URL/health"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: HTTP $STATUS"
            exit 1
          fi
          echo "Dev smoke test passed"

  deploy-staging:
    name: Deploy to Staging
    needs: [build-and-push, deploy-dev]
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://ca-minilinkr-staging.${{ vars.CONTAINER_APPS_DOMAIN }}

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_STAGING }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Container Apps (staging)
        run: |
          az containerapp update \
            --name ca-minilinkr-staging \
            --resource-group rg-minilinkr-staging \
            --image ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ needs.build-and-push.outputs.image-tag }} \
            --revision-suffix "sha-${{ github.sha }}" \
            --output none

      - name: Smoke test (staging)
        run: |
          APP_URL="https://$(az containerapp show \
            --name ca-minilinkr-staging \
            --resource-group rg-minilinkr-staging \
            --query properties.configuration.ingress.fqdn -o tsv)"
          sleep 30
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: HTTP $STATUS"
            exit 1
          fi
          echo "Staging smoke test passed"

  deploy-production:
    name: Deploy to Production
    needs: [build-and-push, deploy-staging]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://ca-minilinkr-prod.${{ vars.CONTAINER_APPS_DOMAIN }}

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_PROD }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Container Apps (production) — Blue/Green
        run: |
          # 새 리비전 배포 (트래픽 0%로 시작)
          NEW_REVISION="sha-${GITHUB_SHA:0:8}"
          az containerapp update \
            --name ca-minilinkr-prod \
            --resource-group rg-minilinkr-prod \
            --image ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ needs.build-and-push.outputs.image-tag }} \
            --revision-suffix "$NEW_REVISION" \
            --output none

          sleep 30

          # 헬스 체크 후 트래픽 전환
          APP_URL="https://$(az containerapp show \
            --name ca-minilinkr-prod \
            --resource-group rg-minilinkr-prod \
            --query properties.configuration.ingress.fqdn -o tsv)"

          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed — aborting traffic switch"
            exit 1
          fi

          # 트래픽 100% 전환
          az containerapp ingress traffic set \
            --name ca-minilinkr-prod \
            --resource-group rg-minilinkr-prod \
            --revision-weight "ca-minilinkr-prod--$NEW_REVISION=100" \
            --output none

          echo "Production deployment complete"

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} Production deploy ${{ job.status }}: minilinkr @ ${{ github.sha }}",
              "attachments": [{
                "color": "${{ job.status == 'success' && 'good' || 'danger' }}",
                "fields": [
                  {"title": "Environment", "value": "production", "short": true},
                  {"title": "Triggered by", "value": "${{ github.actor }}", "short": true},
                  {"title": "Commit", "value": "${{ github.event.head_commit.message }}", "short": false}
                ]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## 9. Sprint 6 — 관측 & 롤백 ([Ch.9](./ch09_보안_모니터링_롤백.md))

### 9.1 Application Insights 통합

`src/server.ts` 파일의 맨 위에 계측 코드를 추가합니다. Application Insights SDK는 반드시 다른 import보다 먼저 초기화해야 합니다.

```typescript
// src/server.ts
import * as appInsights from 'applicationinsights';

if (process.env.APPINSIGHTS_CONNECTION_STRING) {
  appInsights
    .setup(process.env.APPINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(false)
    .start();
}

import { buildApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`MiniLinkr 서버 시작: http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
```

#### Custom Telemetry — shorten 성공/실패 카운터

`src/routes/shorten.ts`에 커스텀 이벤트를 추가합니다.

```typescript
import * as appInsights from 'applicationinsights';

// POST /shorten 핸들러 내부
const client = appInsights.defaultClient;

const result = await linkService.createLink({ ... });

if (result.ok) {
  // 성공 카운터
  client?.trackEvent({
    name: 'LinkShortenSuccess',
    properties: { slug: result.slug },
    measurements: { ttlMinutes: parsed.data.ttlMinutes ?? 0 },
  });
  client?.trackMetric({ name: 'link.shorten.success', value: 1 });
} else {
  // 실패 카운터
  client?.trackEvent({
    name: 'LinkShortenFailure',
    properties: { error: result.error },
  });
  client?.trackMetric({ name: 'link.shorten.failure', value: 1 });
}
```

### 9.2 배포 후 스모크 테스트 & 자동 롤백

배포 워크플로에서 헬스 체크가 실패하면 이전 리비전으로 트래픽을 자동 전환합니다.

```bash
#!/usr/bin/env bash
# scripts/rollback.sh
set -euo pipefail

APP_NAME="${1}"
RESOURCE_GROUP="${2}"

echo "롤백 시작: $APP_NAME in $RESOURCE_GROUP"

# 활성 리비전 목록 (최신 2개)
REVISIONS=$(az containerapp revision list \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "sort_by([].{name:name, created:properties.createdTime, active:properties.active}, &created)[-2:][].name" \
  --output tsv)

PREVIOUS_REVISION=$(echo "$REVISIONS" | head -1)
echo "이전 리비전으로 롤백: $PREVIOUS_REVISION"

az containerapp ingress traffic set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --revision-weight "${PREVIOUS_REVISION}=100" \
  --output none

echo "롤백 완료"
```

### 9.3 Log Analytics KQL 쿼리

Azure Portal의 Log Analytics Workspace에서 다음 쿼리를 사용합니다.

**쿼리 1: 최근 1시간 오류율**

```kql
requests
| where timestamp > ago(1h)
| where cloud_RoleName == "minilinkr"
| summarize
    total = count(),
    errors = countif(resultCode >= 500)
    by bin(timestamp, 5m)
| extend errorRate = round(100.0 * errors / total, 2)
| project timestamp, total, errors, errorRate
| order by timestamp desc
```

**쿼리 2: slug별 클릭 수 Top 10**

```kql
customEvents
| where name == "LinkShortenSuccess"
| where timestamp > ago(24h)
| extend slug = tostring(customDimensions.slug)
| summarize clicks = count() by slug
| top 10 by clicks desc
| render barchart
```

**쿼리 3: 배포 후 응답 시간 비교**

```kql
requests
| where cloud_RoleName == "minilinkr"
| where timestamp > ago(6h)
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by bin(timestamp, 10m), name
| where name in ("GET /:slug", "POST /shorten")
| order by timestamp desc
```

### 9.4 알림 설정 (Slack Webhook)

GitHub Actions 배포 완료 시 Slack에 알림을 보내는 재사용 가능한 워크플로를 만듭니다.

```yaml
# .github/workflows/notify.yml
name: Notify Deployment

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      status:
        required: true
        type: string
      app-url:
        required: true
        type: string
    secrets:
      SLACK_WEBHOOK_URL:
        required: true

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "${{ inputs.status == 'success' && ':white_check_mark:' || ':x:' }} *MiniLinkr 배포 ${{ inputs.status == 'success' && '성공' || '실패' }}*\n환경: `${{ inputs.environment }}`"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*커밋*\n`${{ github.sha }}`"},
                    {"type": "mrkdwn", "text": "*트리거*\n${{ github.actor }}"},
                    {"type": "mrkdwn", "text": "*브랜치*\n${{ github.ref_name }}"},
                    {"type": "mrkdwn", "text": "*앱 URL*\n${{ inputs.app-url }}"}
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## 10. Sprint 7 — 회고

### 10.1 완성 후 회고 체크리스트

이 섹션은 프로젝트 완료 후 팀이 함께 채워나가는 공간입니다.

#### Copilot이 가장 큰 도움을 준 순간 (예시)

| 순간 | 내용 | 절약된 시간 (추정) |
|------|------|-------------------|
| 1 | Prisma 스키마 작성 — 테이블 관계와 인덱스를 정확하게 한 번에 생성 | 20분 |
| 2 | Bicep main.bicep — 5개 리소스 연결 코드를 Copilot Edit으로 한 번에 생성 | 45분 |
| 3 | CI 워크플로 matrix 설정 — postgres/redis 서비스 컨테이너 문법 제안 | 15분 |

#### 검증에서 잡아낸 실수 예시

```
- CodeQL이 잡아낸 것: redirect 라우터에서 사용자 입력 URL을 검증 없이 Location 헤더에 반영
  수정: Zod로 URL 스키마 검증 + allowlist 도메인 필터 추가

- Secret Scanning이 잡아낸 것: .env 파일이 실수로 커밋된 흔적 (git history)
  수정: git filter-repo로 히스토리 정리, .gitignore 강화

- Dependabot이 잡아낸 것: nanoid 구버전의 알려진 취약점
  수정: 자동 PR 머지로 즉시 패치
```

#### 배포 총 소요 시간 (참고값)

| 단계 | 소요 시간 |
|------|----------|
| CI (lint + test × 2 + build + CodeQL) | 약 4분 30초 |
| Docker build & push to ACR | 약 2분 |
| Dev 배포 + 스모크 테스트 | 약 1분 30초 |
| Staging 승인 대기 + 배포 | 약 3분 (승인 제외) |
| Production 승인 대기 + 배포 | 약 5분 (승인 제외) |
| **총합 (승인 시간 제외)** | **약 16분** |

#### 개선점

- [ ] `linkService.ts`가 두 가지 책임(생성 + 조회)을 가지고 있음. `createService`와 `resolveService`로 분리 검토
- [ ] 통합 테스트가 실제 Redis/Postgres에 의존. `testcontainers` 도입으로 격리성 강화
- [ ] 배포 알림에 이전 버전과의 diff 요약 추가 (GitHub API 활용)
- [ ] prod 환경 최소 replica 2개인데, 비용 최적화를 위해 KEDA HTTP Scaler 튜닝 필요

---

## 11. 제출 · 심사 기준

팀 워크숍이나 사내 교육 수료 평가 시 아래 루브릭을 사용합니다.

### 발표 형식

- 발표 시간: 15분 데모 + 5분 Q&A
- 필수 데모 항목:
  1. `POST /shorten` 실시간 호출 (curl 또는 브라우저)
  2. GitHub Actions CI 통과 화면
  3. Production 배포 승인 → 완료 흐름
  4. Application Insights 대시보드 (최소 1개 KQL 결과)

### 심사 루브릭

| 항목 | 배점 | 기준 |
|------|------|------|
| **코드 품질** | 25점 | TypeScript strict, 테스트 커버리지 70%+, `any` 없음, Copilot 활용 흔적(PR 코멘트) + 직접 리팩터링 증거 |
| **파이프라인 완성도** | 25점 | CI: lint+test+build+CodeQL 모두 통과. CD: dev→staging→prod 세 환경 모두 동작, 승인 게이트 확인 |
| **보안** | 15점 | Secret Scanning 활성화, Dependabot 설정, OIDC 비밀 없는 배포, Key Vault 연동 |
| **관측 가능성** | 15점 | App Insights 자동 계측 + 커스텀 이벤트 1개+, KQL 쿼리 2개+ 실행 증거 |
| **IaC** | 10점 | Bicep으로 전체 인프라 선언, `az deployment group create`로 재현 가능 |
| **문서화** | 5점 | README에 로컬 실행 방법, 아키텍처 다이어그램, 환경 변수 설명 포함 |
| **발표** | 5점 | 명확한 데모, Q&A 응답, 개선점 자가 진단 |
| **합계** | **100점** | |

### 가산점 (최대 10점)

| 항목 | 점수 |
|------|------|
| 확장 미션 1개 완성 (QR, Feature Flag, CDN 중 하나) | +5 |
| 자동 롤백 스크립트 실제 동작 데모 | +3 |
| 팀원 PR 리뷰 흔적 (CODEOWNERS + 리뷰 코멘트) | +2 |

---

## 12. 확장 미션 (해커톤형)

기본 Capstone을 완료했다면 아래 미션에 도전해 보세요. 각 미션은 독립적이며 순서 없이 진행할 수 있습니다.

### 미션 A — QR 코드 지원

단축 URL 생성 시 QR 코드 이미지(PNG/SVG)를 함께 반환합니다.

```bash
npm install qrcode
npm install -D @types/qrcode
```

`POST /shorten` 응답에 `qrCodeUrl` 필드를 추가하거나, `GET /api/qr/:slug` 엔드포인트를 별도로 만듭니다.

```typescript
import QRCode from 'qrcode';

// GET /api/qr/:slug
app.get('/api/qr/:slug', async (req, reply) => {
  const { slug } = req.params as { slug: string };
  const shortUrl = `${config.BASE_URL}/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(shortUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return reply.send({ slug, shortUrl, qrCodeDataUrl: qrDataUrl });
});
```

### 미션 B — AB 테스트 with Feature Flag

Azure App Configuration의 Feature Management 기능으로 신규 리디렉션 로직(302 대신 301)을 일부 사용자에게만 적용합니다.

```bash
# App Configuration 리소스 생성
az appconfig create \
  --name appcfg-minilinkr-dev \
  --resource-group rg-minilinkr-dev \
  --location koreacentral \
  --sku Free

# Feature Flag 생성
az appconfig feature set \
  --name appcfg-minilinkr-dev \
  --feature use-301-redirect \
  --yes

# 50% 필터 설정 (Percentage Filter)
az appconfig feature filter add \
  --name appcfg-minilinkr-dev \
  --feature use-301-redirect \
  --filter-name Microsoft.Percentage \
  --filter-parameters Percentage=50
```

Node.js에서 Azure App Configuration SDK로 Feature Flag를 읽어 리디렉션 코드를 동적으로 결정합니다.

```bash
npm install @azure/app-configuration @azure/identity
```

```typescript
import { AppConfigurationClient } from '@azure/app-configuration';
import { DefaultAzureCredential } from '@azure/identity';

const appConfigClient = new AppConfigurationClient(
  process.env.AZURE_APP_CONFIG_ENDPOINT!,
  new DefaultAzureCredential(),
);

async function getRedirectCode(slug: string): Promise<301 | 302> {
  try {
    const setting = await appConfigClient.getConfigurationSetting({
      key: '.appconfig.featureflag/use-301-redirect',
    });
    const flag = JSON.parse(setting.value ?? '{}');
    return flag.enabled ? 301 : 302;
  } catch {
    return 302; // 안전 기본값
  }
}
```

### 미션 C — Azure Front Door + CDN

전 세계 사용자를 위해 Azure Front Door로 글로벌 가속을 추가합니다.

```bicep
// infra/modules/frontDoor.bicep
resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'afd-minilinkr'
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoor
  name: 'minilinkr'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'container-apps-origin'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
  }
}
```

Front Door 도입 후 KQL로 캐시 히트율을 모니터링합니다.

```kql
AzureDiagnostics
| where ResourceType == "FRONTDOORS"
| where Category == "FrontDoorAccessLog"
| summarize
    cacheHits = countif(cacheStatus_s == "HIT"),
    total = count()
    by bin(TimeGenerated, 5m)
| extend cacheHitRate = round(100.0 * cacheHits / total, 1)
| order by TimeGenerated desc
```

---

## 13. 참고 자료

### 커리큘럼 전체 챕터 링크

| 챕터 | 제목 | 핵심 개념 |
|------|------|----------|
| [Ch.0](./00_사전준비.md) | 사전 준비 | 환경 설정, Azure 구독, GitHub 계정 |
| [Ch.1](./ch01_Copilot_소개_및_시작하기.md) | Copilot 소개 및 시작하기 | 인라인 완성, Chat, 기본 사용법 |
| [Ch.2](./ch02_Copilot_실전_코딩.md) | Copilot 실전 코딩 | Edit 모드, 다중 파일 편집 |
| [Ch.3](./ch03_Copilot_고급_활용_Custom_Agents_MCP.md) | Copilot 고급 활용 | Custom Instructions, Agent 모드, MCP |
| [Ch.4](./ch04_GitHub_리포지토리_관리.md) | GitHub 리포지토리 관리 | Project, Issue, Milestone, CODEOWNERS |
| [Ch.5](./ch05_GitHub_Actions_기초.md) | GitHub Actions 기초 | Workflow, Job, Step, Matrix, Cache |
| Ch.6 | Azure 프로비저닝 | Bicep, IaC, OIDC, Federated Credentials |
| Ch.7 | GitHub Actions 고급 | Reusable workflows, Environments, Secrets |
| Ch.8 | 배포 전략 | Blue/Green, Canary, Revision, Rollback |
| Ch.9 | GHAS & 보안 | CodeQL, Secret Scanning, Dependabot |
| **Ch.10** | **종합 실습 (현재)** | **전체 통합** |

### 공식 문서

- [GitHub Copilot 공식 문서](https://docs.github.com/en/copilot)
- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)
- [Azure Container Apps 공식 문서](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Azure Bicep 공식 문서](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Fastify 공식 문서](https://fastify.dev/docs/latest/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Application Insights Node.js SDK](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)

---

## 🎉 완주를 축하드립니다!

여기까지 오신 여러분은 단순히 도구 사용법을 배운 것이 아닙니다. GitHub Copilot을 중심으로 현대적인 소프트웨어 개발의 전체 사이클, 즉 아이디어에서 이슈, 코드에서 테스트, 컨테이너에서 클라우드, 배포에서 관측까지를 직접 경험했습니다.

### 이 프로젝트로 증명한 것들

- GitHub Copilot은 코드를 대신 써주는 도구가 아니라 **생각을 빠르게 검증하는 파트너**라는 것
- 파이프라인은 한 번 잘 만들면 **팀 전체가 두려움 없이 배포**할 수 있게 된다는 것
- 인프라도 코드다. **Bicep으로 선언하고, PR로 리뷰하고, CI로 검증**할 수 있다는 것
- 관측 가능성은 사후 대응이 아니라 **처음부터 설계에 포함**해야 한다는 것

### 다음 학습 여정 제안

| 방향 | 추천 학습 | 예상 기간 |
|------|-----------|----------|
| **Azure 심화** | AZ-204 (Azure Developer) 자격증 | 2~3개월 |
| **클라우드 설계** | AZ-305 (Azure Solutions Architect) | 3~4개월 |
| **Kubernetes** | AKS 심화, Helm, KEDA, GitOps (Flux/Argo CD) | 2~3개월 |
| **Copilot 공인** | GitHub Copilot Fundamentals Certification | 1개월 |
| **DevSecOps** | GitHub Actions 고급, Supply Chain Security, SLSA | 2개월 |
| **SRE 실무** | Azure Monitor 심화, Chaos Engineering, SLO/SLI 설계 | 3개월 |

MiniLinkr는 끝이 아닙니다. 이 리포지토리를 계속 발전시키면서 AKS로 이전해 보세요. Feature Flag를 본격적으로 운영해 보세요. 그리고 팀 동료에게 직접 워크숍을 진행해 보세요. 가르치는 것이 가장 깊이 배우는 방법입니다.

**함께 만들어 주셔서 감사합니다. 코드로 세상을 바꿔나가는 여러분을 응원합니다! 🚀**

---

*이 문서는 Ai-Advanced 커리큘럼의 일부입니다. 오류나 개선 제안은 이슈로 등록해 주세요.*
