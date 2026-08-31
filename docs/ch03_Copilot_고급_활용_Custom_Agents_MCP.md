# 🤖 Chapter 3. Copilot 고급 활용 — Custom Agents & MCP

> **소요 시간**: 60분
> **난이도**: 🟡 중급
> **선수 과목**: [Chapter 2. Copilot 실전 코딩](./ch02_Copilot_실전_코딩.md)

---

## 학습 목표

이 챕터를 마치면 다음을 할 수 있습니다.

- [ ] `.github/copilot-instructions.md`를 작성해 팀 코딩 컨벤션을 Copilot에 주입할 수 있다
- [ ] Custom Chat Modes(`.chatmode.md`)를 만들어 역할 특화 어시스턴트를 구성할 수 있다
- [ ] Prompt Files(`.prompt.md`)로 재사용 가능한 프롬프트를 관리할 수 있다
- [ ] MCP(Model Context Protocol)의 아키텍처와 핵심 개념(Tool/Resource/Prompt)을 설명할 수 있다
- [ ] `.vscode/mcp.json`으로 MCP 서버를 VS Code에 등록하고 Copilot과 연결할 수 있다
- [ ] TypeScript로 간단한 MCP 서버를 직접 구현하고 Chat에서 호출할 수 있다
- [ ] MCP 운영 시 보안 위협과 대응 방법을 팀에 설명할 수 있다

---

## 1. 왜 Copilot을 커스터마이즈해야 하는가

기본 Copilot은 범용적입니다. 잘 만들어진 도구이지만, "우리 팀"을 모릅니다.

### 1.1 팀 컨벤션 문제

Copilot이 생성하는 코드는 공개된 코드베이스에서 학습했기 때문에, 팀마다 다른 컨벤션과 자주 충돌합니다.

```
# 팀 규칙: 예외는 반드시 커스텀 Exception 클래스를 사용
# Copilot이 생성한 코드:
throw new Error('User not found')  // ❌ 팀 컨벤션 위반

# 우리가 원하는 코드:
throw new UserNotFoundException('User not found')  // ✅
```

이런 코드가 PR마다 반복되면 리뷰어는 지칩니다. 수정 요청도 반복됩니다.

### 1.2 도메인 지식 부재 문제

Copilot은 사내 API 스펙, 내부 라이브러리 구조, 비즈니스 도메인 용어를 모릅니다. "주문 확정 처리"가 내부적으로 어떤 서비스를 호출하는지, 어떤 이벤트를 발행해야 하는지 알 방법이 없습니다.

**커스터마이즈가 해결하는 것:**

| 문제 | 해결책 |
|------|--------|
| 컨벤션 불일치 | `copilot-instructions.md` |
| 역할별 다른 컨텍스트 필요 | Custom Chat Modes |
| 반복되는 프롬프트 | Prompt Files |
| 실시간 사내 데이터 부재 | MCP 서버 연동 |

---

## 2. `.github/copilot-instructions.md` — Repository Custom Instructions

### 2.1 파일 구조와 동작 원리

`.github/copilot-instructions.md` 파일을 리포지토리 루트의 `.github/` 디렉토리에 두면, VS Code Copilot Chat이 모든 대화에 이 내용을 시스템 컨텍스트로 자동 주입합니다. 별도 설정 없이 파일 존재만으로 활성화됩니다.

```
my-project/
├── .github/
│   ├── copilot-instructions.md   ← 여기
│   ├── chatmodes/
│   └── prompts/
├── src/
└── package.json
```

**동작 방식:**
- Copilot Chat(`@workspace`, 인라인 Chat 포함)이 열릴 때 자동으로 로드됩니다
- 파일 크기 권장 상한은 약 8KB. 너무 길면 토큰 낭비가 됩니다
- Markdown 형식으로 작성하되, 지시 내용은 명확하고 간결하게 씁니다

### 2.2 작성 원칙 — Do / Don't

**Do (이렇게 쓰세요):**
- 구체적인 기술 스택과 버전 명시 (`NestJS v10`, `TypeScript 5.x`)
- 금지 패턴을 예시 코드와 함께 제시
- 선호하는 패턴을 짧은 코드 스니펫으로 보여주기
- 팀 용어 사전 (도메인 언어) 포함
- 참조 문서 링크 (사내 위키, ADR 등)

**Don't (이렇게 쓰지 마세요):**
- "좋은 코드를 써주세요" 같은 추상적인 지시
- 수백 줄의 장황한 설명 (핵심만 남기세요)
- 비밀 정보, API 키, 비밀번호 절대 포함 금지
- 자주 바뀌는 내용 (버전 업마다 깨집니다)

### 2.3 실전 예제 — TypeScript + NestJS 프로젝트용

```markdown
# Copilot Instructions — MyApp Backend

## 기술 스택
- Runtime: Node.js 20 LTS
- Framework: NestJS v10
- Language: TypeScript 5.x (strict mode)
- ORM: TypeORM 0.3.x
- Test: Jest + supertest
- DB: PostgreSQL 15

## 코드 스타일
- 들여쓰기: 2 spaces (탭 사용 금지)
- 세미콜론: 필수
- 따옴표: 작은따옴표(`'`)
- import 순서: Node 내장 → 외부 라이브러리 → 내부 모듈
- `any` 타입 사용 금지. `unknown` 또는 명시적 타입 사용

## 예외 처리 규칙
모든 예외는 `src/common/exceptions/` 아래의 커스텀 클래스를 사용합니다.

```ts
// ❌ 금지
throw new Error('Not found')
throw new HttpException('Bad request', 400)

// ✅ 올바른 방법
throw new NotFoundException('User not found')
throw new BusinessException('PAYMENT_FAILED', '결제에 실패했습니다')
```

## 서비스 레이어 패턴
- Controller는 요청 파싱과 응답 직렬화만 담당합니다
- 비즈니스 로직은 반드시 Service 레이어에 위치합니다
- Service는 Repository를 직접 호출하지 않습니다. QueryService를 경유합니다

## 이벤트 발행
도메인 이벤트는 `EventEmitter2`를 사용합니다.
이벤트 이름 컨벤션: `{도메인}.{동사}.{과거형}` (예: `order.payment.completed`)

## 테스트
- 단위 테스트 파일: `*.spec.ts`
- E2E 테스트 파일: `*.e2e-spec.ts`
- 테스트에서 실제 DB 연결 금지. `jest-mock-extended`로 Repository를 mock 처리합니다
- 새 Service 클래스를 만들 때 항상 대응되는 spec 파일을 함께 생성합니다

## 도메인 용어
- `Member`: 시스템 사용자 (User라고 쓰지 않음)
- `Order`: 주문 (구매 확정 전 상태)
- `Purchase`: 결제 완료 후 확정된 주문
- `Fulfillment`: 출고/배송 처리 단계

## 참조
- 아키텍처 결정: https://wiki.internal/adr
- API 설계 가이드: https://wiki.internal/api-guide
```

### 2.4 Personal Custom Instructions와의 차이

VS Code 설정(`settings.json`)에도 개인용 지시를 넣을 수 있습니다.

```jsonc
// settings.json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "text": "항상 한국어로 주석을 달아주세요."
    },
    {
      "file": ".github/copilot-instructions.md"
    }
  ]
}
```

| 구분 | `.github/copilot-instructions.md` | `settings.json` |
|------|-----------------------------------|-----------------|
| 적용 범위 | 리포지토리 전체 (팀 공유) | 개인 설정 (로컬) |
| 버전 관리 | Git으로 관리됨 | 관리 안 됨 |
| 우선순위 | 팀 기준 | 개인 보완 |
| 권장 사용 | 팀 컨벤션, 도메인 규칙 | 개인 취향, 언어 선호 |

**권장 전략:** 팀 규칙은 `copilot-instructions.md`에 두고, 개인 취향(주석 언어, 코드 설명 스타일 등)은 `settings.json`으로 보완하세요.

---

## 3. Custom Chat Modes — `.github/chatmodes/*.chatmode.md`

Custom Chat Modes(구 Custom Agents)는 특정 역할에 맞춰 Copilot의 행동 방식을 사전 정의한 모드입니다. PR 리뷰어, 테스트 작성자, 리팩터링 전문가 등 역할별 어시스턴트를 팀 전체가 공유할 수 있습니다.

### 3.1 파일 포맷

파일 위치: `.github/chatmodes/{이름}.chatmode.md`

```markdown
---
description: 이 채팅 모드에 대한 한 줄 설명 (드롭다운에 표시됨)
tools:
  - codebase
  - githubRepo
  - terminalLastCommand
---

여기서부터 이 모드의 시스템 프롬프트를 Markdown으로 작성합니다.
Copilot이 이 모드로 전환되면 아래 지시를 기반으로 행동합니다.
```

**frontmatter 주요 필드:**

| 필드 | 설명 | 예시 |
|------|------|------|
| `description` | 모드 설명 (드롭다운에 표시) | `"PR 변경사항을 리뷰합니다"` |
| `tools` | 사용 가능한 도구 목록 | `codebase`, `githubRepo`, `fetch` 등 |

### 3.2 실전 예제 3종

**① PR-Reviewer.chatmode.md**

```markdown
---
description: PR 변경사항을 꼼꼼하게 코드 리뷰합니다
tools:
  - codebase
  - githubRepo
  - terminalLastCommand
---

당신은 시니어 백엔드 엔지니어입니다. PR의 변경사항을 리뷰할 때 다음 기준을 적용합니다.

## 리뷰 체크리스트
1. **보안**: SQL Injection, XSS, 민감 정보 노출 여부
2. **성능**: N+1 쿼리, 불필요한 반복 연산, 캐시 누락
3. **예외 처리**: 모든 예외 경로가 핸들링되어 있는가
4. **테스트**: 변경된 로직에 대응하는 테스트가 존재하는가
5. **컨벤션**: `.github/copilot-instructions.md`의 규칙 준수 여부

## 출력 형식
리뷰 결과를 다음 형식으로 출력합니다.

### 🔴 Critical (즉시 수정 필요)
### 🟡 Warning (권장 수정)
### 🟢 Suggestion (선택적 개선)
### ✅ LGTM (문제 없음)

각 항목은 파일 경로와 라인 번호를 포함해 구체적으로 작성합니다.
```

**② Test-Writer.chatmode.md**

```markdown
---
description: 선택한 코드에 대한 Jest 단위 테스트를 생성합니다
tools:
  - codebase
---

당신은 TDD 전문가입니다. 제공된 코드를 분석해 Jest 기반 단위 테스트를 작성합니다.

## 테스트 작성 규칙
- AAA 패턴(Arrange, Act, Assert)을 반드시 사용합니다
- 외부 의존성은 `jest.mock()` 또는 `jest-mock-extended`로 격리합니다
- 각 `describe` 블록은 하나의 메서드 또는 시나리오를 다룹니다
- 엣지 케이스(빈 값, null, 경계값)를 반드시 포함합니다
- 테스트 이름은 한국어로 작성합니다: `it('입력이 null이면 NotFoundException을 던진다')`

## 생성 순서
1. Happy path (정상 케이스)
2. 예외 케이스 (잘못된 입력, 존재하지 않는 리소스)
3. 경계값 케이스

코드를 공유하면 바로 테스트 파일을 생성합니다.
```

**③ Refactor.chatmode.md**

```markdown
---
description: 코드 품질을 개선하는 리팩터링 제안을 제공합니다
tools:
  - codebase
  - terminalLastCommand
---

당신은 클린 코드와 SOLID 원칙의 전문가입니다.
리팩터링 제안 시 반드시 이유를 먼저 설명하고, 전후 코드를 함께 제시합니다.

## 리팩터링 우선순위
1. **가독성**: 변수명, 함수명이 의도를 명확히 드러내는가
2. **단일 책임**: 하나의 함수/클래스가 하나의 일만 하는가
3. **중복 제거**: DRY 원칙 위반 패턴 식별
4. **복잡도**: 순환 복잡도(Cyclomatic Complexity) 감소

## 출력 형식
```
### 리팩터링 이유
[현재 코드의 문제점 설명]

### Before
[기존 코드]

### After
[개선된 코드]

### 변경 효과
[개선 사항 요약]
```

변경 사항이 동작을 바꾸지 않음을 항상 확인하고, 테스트 필요성을 언급합니다.
```

### 3.3 활성화 방법

1. VS Code에서 Copilot Chat 패널을 엽니다 (`Ctrl+Alt+I`)
2. Chat 입력창 왼쪽의 **모드 드롭다운**을 클릭합니다
3. `.github/chatmodes/`에 있는 파일 이름이 목록에 나타납니다
4. 원하는 모드를 선택하면 해당 시스템 프롬프트로 전환됩니다

> **팁:** 모드 전환 후 `@workspace`로 코드베이스 컨텍스트를 추가하면 훨씬 정확한 결과를 얻습니다.

---

## 4. Prompt Files — `.github/prompts/*.prompt.md`

Prompt Files는 반복해서 사용하는 프롬프트 템플릿을 파일로 저장하는 기능입니다. Chat Modes가 "역할"을 정의한다면, Prompt Files는 "특정 작업"을 정의합니다.

### 4.1 파일 포맷

파일 위치: `.github/prompts/{이름}.prompt.md`

```markdown
---
mode: agent
description: 한 줄 설명
tools:
  - codebase
  - fetch
---

프롬프트 본문을 여기에 작성합니다.
변수는 ${variableName} 형식으로 사용할 수 있습니다.
```

**frontmatter 주요 필드:**

| 필드 | 설명 | 가능한 값 |
|------|------|----------|
| `mode` | 실행 모드 | `ask`, `edit`, `agent` |
| `description` | 설명 (명령 팔레트에 표시) | 문자열 |
| `tools` | 허용 도구 | `codebase`, `fetch`, `githubRepo` 등 |

### 4.2 예제 — generate-api-docs.prompt.md

```markdown
---
mode: agent
description: 선택한 NestJS Controller의 API 문서를 자동 생성합니다
tools:
  - codebase
---

다음 NestJS Controller 코드를 분석해 API 문서를 Markdown 형식으로 생성합니다.

## 문서 생성 규칙
- 엔드포인트별로 섹션을 나눕니다
- 각 엔드포인트에는 다음 항목을 포함합니다:
  - HTTP 메서드와 경로
  - 요청 파라미터 (Path, Query, Body)
  - 응답 형식과 상태 코드
  - 예제 요청/응답 (curl 형식)
- DTO 클래스가 있으면 필드 설명도 포함합니다
- 인증이 필요한 엔드포인트는 `🔐` 아이콘을 붙입니다

## 출력 형식
Markdown 코드블록 없이 바로 문서 내용을 출력합니다.
파일명 제안: `docs/api/{컨트롤러명}.md`

분석할 Controller 파일을 첨부하거나 코드를 붙여넣어 주세요.
```

**사용 방법:**

1. Copilot Chat에서 `/` 를 입력합니다
2. `generate-api-docs` 를 선택합니다
3. Controller 파일을 `#file:` 로 첨부합니다

---

## 5. Model Context Protocol (MCP) — 개념과 아키텍처

### 5.1 MCP가 무엇인가

MCP(Model Context Protocol)는 Anthropic이 2024년 말 공개한 오픈 표준 프로토콜입니다. AI 어시스턴트(클라이언트)와 외부 데이터 소스/도구(서버) 사이의 통신 방식을 표준화합니다.

한 마디로: **AI 어시스턴트를 위한 USB 규격**입니다. USB가 어떤 기기든 동일한 인터페이스로 연결하듯, MCP는 어떤 AI 클라이언트든 동일한 방식으로 외부 시스템에 연결합니다.

```
┌─────────────────────────────────────────────────────────┐
│                    MCP 아키텍처                          │
│                                                         │
│  ┌──────────────┐    MCP Protocol    ┌───────────────┐  │
│  │  MCP Client  │◄──────────────────►│  MCP Server   │  │
│  │  (VS Code    │   JSON-RPC 2.0     │  (사내 DB,    │  │
│  │   Copilot)   │   over stdio/SSE   │   Jira, 로그) │  │
│  └──────────────┘                    └───────────────┘  │
│                                                         │
│  클라이언트가 서버에 요청 → 서버가 결과 반환             │
└─────────────────────────────────────────────────────────┘
```

### 5.2 핵심 개념 — Tool, Resource, Prompt

MCP 서버는 세 가지 타입의 기능을 노출할 수 있습니다.

**Tool (도구)**
LLM이 호출할 수 있는 함수입니다. 입력 스키마(JSON Schema)를 선언하면 LLM이 필요할 때 자동으로 호출합니다.

```
예: search_confluence(query: string) → 사내 Confluence 검색 결과 반환
예: get_jira_ticket(ticket_id: string) → Jira 티켓 상세 반환
예: query_database(sql: string) → 읽기 전용 DB 쿼리 실행
```

**Resource (리소스)**
파일, 데이터베이스 레코드, 설정 등 정적/동적 데이터를 URI 형태로 노출합니다. LLM이 컨텍스트로 읽어 들일 수 있습니다.

```
예: file:///docs/api-spec.yaml
예: db://orders/recent?limit=10
```

**Prompt (프롬프트)**
서버가 미리 정의한 프롬프트 템플릿입니다. 클라이언트가 이를 가져와 LLM에게 제공합니다.

### 5.3 왜 Copilot에 MCP를 붙이나

Copilot의 컨텍스트는 기본적으로 열려 있는 파일과 리포지토리에 제한됩니다. MCP를 붙이면 이 한계를 넘습니다.

| 시나리오 | 없으면 | MCP 있으면 |
|---------|--------|-----------|
| "이 에러 원인 찾아줘" | 코드만 봄 | 실시간 로그 조회 가능 |
| "이 기능 어떻게 구현해?" | 추측으로 답변 | 사내 API 스펙 직접 조회 |
| "관련 Jira 티켓 정리해줘" | 티켓 직접 복사해야 함 | Jira MCP로 자동 조회 |
| "DB 스키마 기반으로 코드 짜줘" | 스키마 붙여넣기 필요 | DB MCP로 실시간 스키마 로드 |

---

## 6. VS Code에 MCP 서버 연결하기

### 6.1 `.vscode/mcp.json` 구조

MCP 서버 등록은 프로젝트별 `.vscode/mcp.json` 또는 사용자 전역 설정(`settings.json`)으로 합니다.

```
my-project/
├── .vscode/
│   └── mcp.json    ← MCP 서버 등록 파일
└── src/
```

기본 구조:

```jsonc
{
  "servers": {
    "서버-이름": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "${env:MY_API_KEY}"
      }
    }
  }
}
```

> **중요:** `mcp.json`을 Git에 커밋할 때 `env` 필드에 실제 시크릿을 넣지 마세요. 반드시 `${env:변수명}` 형식으로 환경 변수를 참조하세요.

### 6.2 전송 방식 비교 — stdio vs SSE vs HTTP

| 전송 방식 | 설명 | 적합한 상황 |
|----------|------|-----------|
| **stdio** | 로컬 프로세스로 실행. stdin/stdout으로 통신 | 로컬 전용 서버, 빠른 프로토타이핑 |
| **SSE** (Server-Sent Events) | HTTP 기반 단방향 스트림 | 원격 서버, 레거시 호환 필요 시 |
| **Streamable HTTP** | HTTP 기반 양방향. 2025 스펙의 권장 방식 | 원격 서버, 프로덕션 배포 |

```jsonc
// stdio 예시
{
  "servers": {
    "my-local-tool": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@myorg/mcp-server"],
      "env": {}
    }
  }
}

// HTTP(Streamable) 예시
{
  "servers": {
    "my-remote-tool": {
      "type": "http",
      "url": "https://mcp.internal.company.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:INTERNAL_MCP_TOKEN}"
      }
    }
  }
}
```

### 6.3 실전 예시 — GitHub 공식 MCP 서버 등록

GitHub MCP 서버(`@modelcontextprotocol/server-github`)를 연결하면 Copilot이 GitHub API를 직접 호출할 수 있습니다. 이슈 조회, PR 목록, 파일 내용 읽기 등이 가능해집니다.

**1단계: GitHub Personal Access Token 발급**
- GitHub Settings → Developer settings → Personal access tokens
- 필요한 스코프: `repo`, `read:org`, `read:user`

**2단계: `.vscode/mcp.json` 작성**

```jsonc
{
  "servers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

**3단계: 환경 변수 설정**

```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "ghp_your_token_here"

# macOS/Linux
export GITHUB_TOKEN="ghp_your_token_here"
```

**4단계: VS Code 재시작 후 확인**
- Copilot Chat에서 `#` 을 누르면 MCP 도구 목록이 나타납니다
- `list_issues`, `get_pull_request` 등의 도구가 보이면 연결 성공입니다

---

## 7. MCP 서버 만들어보기 — 미니 튜토리얼

사내 Confluence를 흉내 낸 간단한 MCP 서버를 직접 만들어보겠습니다.

### 7.1 프로젝트 초기화

```bash
mkdir mcp-confluence-mock
cd mcp-confluence-mock
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node ts-node
npx tsc --init
```

`tsconfig.json`에서 `"module": "nodenext"`, `"moduleResolution": "nodenext"`로 설정합니다.

### 7.2 서버 구현 — `src/index.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 가짜 Confluence 데이터
const MOCK_PAGES: Record<string, { title: string; content: string }> = {
  "onboarding-guide": {
    title: "신규 입사자 온보딩 가이드",
    content: `
# 신규 입사자 온보딩

## 개발 환경 설정
1. Node.js 20 LTS 설치
2. VS Code 설치 및 팀 Extension 팩 설치
3. 사내 NPM Registry 설정: npm set registry https://npm.internal.company.com

## 주요 연락처
- DevOps팀: devops@company.com
- 보안팀: security@company.com
    `.trim(),
  },
  "api-conventions": {
    title: "API 설계 컨벤션",
    content: `
# API 설계 컨벤션

## URL 규칙
- 소문자 케밥케이스: /user-profiles (O), /userProfiles (X)
- 복수형 명사: /orders (O), /order (X)
- 버전 접두사: /v1/orders

## 응답 형식
모든 응답은 다음 Envelope를 사용합니다:
{ "data": ..., "meta": { "timestamp": "...", "requestId": "..." } }
    `.trim(),
  },
};

// MCP 서버 생성
const server = new McpServer({
  name: "confluence-mock",
  version: "1.0.0",
});

// Tool 등록: 페이지 검색
server.registerTool(
  "search_confluence",
  {
    title: "Confluence 페이지 검색",
    description: "사내 Confluence에서 키워드로 페이지를 검색합니다",
    inputSchema: {
      query: z.string().describe("검색할 키워드"),
    },
  },
  async ({ query }) => {
    const results = Object.entries(MOCK_PAGES)
      .filter(
        ([key, page]) =>
          key.includes(query.toLowerCase()) ||
          page.title.includes(query) ||
          page.content.includes(query),
      )
      .map(([key, page]) => `- [${page.title}] (slug: ${key})`);

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `"${query}"에 대한 검색 결과가 없습니다.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `검색 결과 (${results.length}건):\n${results.join("\n")}`,
        },
      ],
    };
  },
);

// Tool 등록: 페이지 내용 조회
server.registerTool(
  "get_confluence_page",
  {
    title: "Confluence 페이지 내용 조회",
    description: "페이지 slug로 Confluence 문서의 전체 내용을 가져옵니다",
    inputSchema: {
      slug: z.string().describe("페이지 slug (예: onboarding-guide)"),
    },
  },
  async ({ slug }) => {
    const page = MOCK_PAGES[slug];

    if (!page) {
      return {
        content: [{ type: "text", text: `페이지를 찾을 수 없습니다: ${slug}` }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `# ${page.title}\n\n${page.content}`,
        },
      ],
    };
  },
);

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 서버는 console.log 대신 console.error를 사용해야 합니다
  console.error("Confluence MCP Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

### 7.3 VS Code에 등록

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "confluence-mock": {
      "type": "stdio",
      "command": "npx",
      "args": ["ts-node", "src/index.ts"],
      "cwd": "${workspaceFolder}/mcp-confluence-mock"
    }
  }
}
```

### 7.4 Chat에서 확인

```
# Copilot Chat에서
"API 설계 컨벤션 문서 내용 알려줘"
→ Copilot이 search_confluence 또는 get_confluence_page 도구를 자동 호출합니다
```

---

## 8. Copilot이 MCP Tool을 언제 호출하는가

### 8.1 툴 선택 프로세스

Copilot(LLM)이 MCP 도구를 호출하는 과정은 다음과 같습니다.

```
사용자 메시지 입력
       ↓
LLM이 메시지 분석
"외부 데이터가 필요한가?"
       ↓ YES
등록된 MCP 도구 목록과 설명 확인
(tool description을 보고 적합한 도구 선택)
       ↓
도구 호출 의사 결정 및 파라미터 구성
       ↓
[사용자 승인 요청] ← VS Code에서 팝업으로 확인 요청
       ↓ 승인
MCP 서버에 JSON-RPC 요청 전송
       ↓
서버 응답 수신
       ↓
응답을 컨텍스트로 포함해 최종 답변 생성
```

### 8.2 승인 시점과 신뢰 설정

VS Code는 MCP 도구 호출 전에 사용자 승인을 요청합니다. 서버별로 신뢰 수준을 설정할 수 있습니다.

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "confluence-mock": {
      "type": "stdio",
      "command": "npx",
      "args": ["ts-node", "src/index.ts"],
      // autoApprove: 이 도구들은 자동 승인 (읽기 전용만 허용 권장)
      "autoApprove": ["search_confluence", "get_confluence_page"]
    }
  }
}
```

> **보안 원칙:** `autoApprove`는 읽기 전용 도구에만 사용하세요. 데이터를 수정하거나 삭제하는 도구는 반드시 수동 승인을 유지합니다.

---

## 9. 실전 시나리오 3가지

### 시나리오 (a) — `copilot-instructions.md`로 팀 코드 스타일 강제

**상황:** 팀에 주니어 개발자가 합류해 컨벤션이 자주 깨집니다.

**적용 전:**
```typescript
// Copilot이 생성한 코드 (컨벤션 위반)
async function getUser(id: number): Promise<any> {
  try {
    return await db.query(`SELECT * FROM users WHERE id = ${id}`)
  } catch(e) {
    throw new Error(e.message)
  }
}
```

**`copilot-instructions.md`에 추가:**
```markdown
## 금지 패턴
- `any` 타입 사용 금지
- 템플릿 리터럴로 SQL 쿼리 구성 금지 (SQL Injection 위험)
- `throw new Error()`는 커스텀 Exception만 사용

## 선호 패턴
- DB 쿼리는 반드시 파라미터 바인딩 사용
- 반환 타입은 항상 명시
```

**적용 후 Copilot 생성 코드:**
```typescript
async function getUser(id: number): Promise<UserDto> {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException(`User not found: ${id}`);
  }
  return UserMapper.toDto(user);
}
```

### 시나리오 (b) — chatmode + prompt file 조합으로 PR 자동 리뷰

**상황:** PR 리뷰 시간을 줄이고 싶습니다.

**워크플로우:**
1. PR 브랜치로 checkout
2. Copilot Chat → `PR-Reviewer` 모드 전환
3. `/generate-review-summary` prompt 파일 실행
4. `@workspace #changes` 로 변경 파일 첨부

```
# Chat 입력
/generate-review-summary
@workspace #changes

→ Copilot이 변경된 파일을 분석해 리뷰 체크리스트 기반으로 정리
```

### 시나리오 (c) — MCP로 사내 API 스펙을 Copilot에게 실시간 제공

**상황:** 사내 OpenAPI 스펙이 자주 바뀌어 Copilot이 항상 구버전 정보를 제공합니다.

**MCP 서버 Tool 예시:**
```typescript
server.registerTool(
  "get_api_spec",
  {
    title: "사내 API 스펙 조회",
    description: "서비스 이름으로 최신 OpenAPI 스펙을 가져옵니다",
    inputSchema: {
      service: z.string().describe("서비스 이름 (예: order-service, payment-service)"),
    },
  },
  async ({ service }) => {
    // 실제 구현에서는 사내 API Registry에서 최신 스펙을 가져옵니다
    const spec = await fetch(`https://api-registry.internal/${service}/openapi.yaml`);
    const text = await spec.text();
    return { content: [{ type: "text", text }] };
  },
);
```

**Chat 활용:**
```
"payment-service의 최신 API 스펙 기준으로 결제 요청 클라이언트 코드 작성해줘"
→ Copilot이 get_api_spec 도구로 최신 스펙을 가져와 정확한 코드를 생성합니다
```

---

## 10. 실습 과제

### 과제 1 — 팀 Instructions 작성

현재 참여 중인 (또는 가상의) 프로젝트에 맞는 `copilot-instructions.md`를 작성합니다.

**요구사항:**
- 기술 스택 섹션 (언어, 프레임워크, DB)
- 금지 패턴 2가지 이상 (예시 코드 포함)
- 도메인 용어 정의 3가지 이상
- 작성 후 실제로 Copilot에게 코드 생성을 요청해 컨벤션이 적용되는지 확인

### 과제 2 — Custom Chatmode 만들기

"Security-Auditor" chatmode를 만듭니다.

**요구사항:**
- 보안 취약점 점검에 특화된 시스템 프롬프트
- OWASP Top 10 기준 체크리스트 포함
- 출력 형식 정의 (위험도별 분류)
- 실제 코드에 적용해 결과 확인

### 과제 3 — MCP 서버 구현 및 연결

간단한 MCP 서버를 만들고 VS Code에 연결합니다.

**요구사항:**
- Tool 2개 이상 구현 (예: 팀원 목록 조회, 현재 스프린트 조회)
- `.vscode/mcp.json`에 등록
- Copilot Chat에서 자연어로 도구를 호출해 결과 확인
- `autoApprove` 설정은 읽기 전용 도구만 적용

---

## 11. 현업 팁과 보안 주의사항

### 보안 (필독)

**1. MCP 서버 신뢰 문제 — Prompt Injection 위험**
악의적인 MCP 서버는 응답에 숨겨진 지시를 포함해 LLM을 조종할 수 있습니다(Prompt Injection). 신뢰할 수 없는 출처의 MCP 서버는 절대 등록하지 마세요. 팀 내에서 검증된 서버 목록을 관리합니다.

**2. 시크릿은 절대 `mcp.json`에 하드코딩 금지**
```jsonc
// ❌ 금지
{ "env": { "API_KEY": "sk-real-secret-key-here" } }

// ✅ 올바른 방법
{ "env": { "API_KEY": "${env:MY_SERVICE_API_KEY}" } }
```
`.env` 파일이나 OS 환경 변수, 또는 1Password/HashiCorp Vault 같은 시크릿 매니저를 사용하세요.

**3. `autoApprove` 범위 최소화**
데이터 수정, 삭제, 외부 전송 도구는 반드시 수동 승인을 요구합니다. 편의를 위해 `autoApprove`를 남발하면 Copilot이 예상치 못한 작업을 실행할 수 있습니다.

**4. `copilot-instructions.md`에 민감 정보 포함 금지**
이 파일은 Git에 커밋됩니다. 내부 IP, 계정 정보, API 키 등은 절대 포함하지 마세요.

### 효율성 팁

**5. chatmode와 prompt file의 역할 구분을 명확히**
chatmode는 "어떤 사람처럼 행동할 것인가"를 정의하고, prompt file은 "어떤 작업을 실행할 것인가"를 정의합니다. 두 가지를 혼동하면 관리가 복잡해집니다.

**6. `copilot-instructions.md`는 짧을수록 효과적**
파일이 길어지면 LLM이 중요한 지시를 놓칩니다. 규칙은 5~10개로 압축하고, 가장 자주 위반되는 것만 남기세요. 팀 리뷰를 통해 분기마다 정리합니다.

**7. MCP 서버 로컬 개발 시 `console.error` 사용**
stdio 전송 방식에서 `console.log`는 JSON-RPC 통신을 망가뜨립니다. 디버그 로그는 반드시 `console.error`로 출력합니다. HTTP 기반 서버에서는 이 제약이 없습니다.

---

## 정리

이번 챕터에서 배운 내용입니다.

- **`copilot-instructions.md`**: 팀 컨벤션과 도메인 지식을 Copilot에 주입하는 가장 기본적인 방법
- **Custom Chat Modes**: 역할 특화 어시스턴트를 팀 전체가 공유하는 방법
- **Prompt Files**: 반복 작업을 프롬프트 템플릿으로 표준화하는 방법
- **MCP**: AI 어시스턴트와 외부 시스템을 연결하는 오픈 표준 프로토콜
- **MCP 서버 구현**: TypeScript SDK로 Tool을 정의하고 VS Code에 연결하는 방법
- **보안**: MCP 운영 시 Prompt Injection, 시크릿 관리, 승인 정책의 중요성

커스터마이즈를 적절히 활용하면 Copilot은 범용 도구에서 "우리 팀을 아는 어시스턴트"로 진화합니다.

---

## 다음 단계

다음 챕터에서는 GitHub 리포지토리 자체를 효율적으로 관리하는 방법을 다룹니다. 브랜치 전략, 보호 규칙, Actions 자동화까지 살펴봅니다.

→ [`ch04_GitHub_리포지토리_관리.md`](./ch04_GitHub_리포지토리_관리.md)

---

*최종 수정: 2026년 8월 | GitHub Copilot Chat 1.x, MCP Specification 2025-06-18 기준*
