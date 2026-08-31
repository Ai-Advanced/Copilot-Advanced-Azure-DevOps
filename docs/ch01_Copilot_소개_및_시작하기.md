# 🚀 Chapter 1. GitHub Copilot 소개 및 시작하기

> **소요 시간**: 40분
> **난이도**: 🟢 초급
> **선수 과목**: [Chapter 0. 사전 준비](./00_사전준비.md)

---

## 학습 목표

이 챕터를 마치면 다음을 할 수 있습니다.

- [ ] GitHub Copilot이 무엇인지, 어떤 기술을 기반으로 동작하는지 설명할 수 있다
- [ ] Copilot의 4가지 모드(Inline, Chat, Edit, Agent)를 구분하고 상황에 맞게 선택할 수 있다
- [ ] 요금제별 기능 차이를 파악하고 자신의 상황에 맞는 플랜을 고를 수 있다
- [ ] VS Code에서 Copilot 코드 제안을 받고 수락·거절하는 첫 실습을 완료할 수 있다
- [ ] 좋은 프롬프트와 나쁜 프롬프트의 차이를 이해하고, Copilot 결과를 검증하는 습관을 시작할 수 있다

---

## 1. GitHub Copilot이란?

### 1-1. 한 줄 정의

GitHub Copilot은 **코드를 작성하는 동안 실시간으로 제안을 생성해 주는 AI 페어 프로그래머**입니다. 주석, 함수 시그니처, 또는 자연어 질문을 입력하면 코드 완성(code completion), 설명, 리팩터링, 테스트까지 폭넓게 도와줍니다.

### 1-2. 어떻게 동작하나요?

Copilot은 오픈소스 코드로 학습된 대형 언어 모델(LLM, Large Language Model)을 기반으로 합니다. VS Code 같은 에디터에서 현재 열려 있는 파일의 맥락(파일명, 이미 작성된 코드, 커서 위치)을 읽어 API로 전송하고, 모델이 생성한 제안을 에디터에 표시합니다.

```
[개발자 입력] → [VS Code 확장] → [GitHub Copilot API] → [LLM 추론] → [제안 표시]
```

중요한 점은 Copilot이 "정답"을 아는 게 아니라는 겁니다. 학습 데이터에서 비슷한 패턴을 찾아 **확률적으로 가장 그럴듯한 코드**를 생성합니다. 그래서 제안을 검증하는 습관이 처음부터 필요합니다. 이 주제는 [섹션 8](#8-copilot-제안을-검증하는-습관)에서 자세히 다룹니다.

### 1-3. 탄생 배경과 역사

| 시기 | 사건 |
| :--- | :--- |
| 2021년 6월 | GitHub Copilot 기술 프리뷰 공개 (OpenAI Codex 기반) |
| 2022년 6월 | 개인 유료 플랜으로 정식 출시 |
| 2023년 3월 | GitHub Copilot X 발표 — Chat, Voice, PR 기능 추가 |
| 2023년 7월 | GitHub Copilot Business 출시 (조직 단위 관리 기능) |
| 2024년 2월 | GitHub Copilot Enterprise 출시 (코드베이스 인덱싱 + GHAS 통합) |
| 2024년 12월 | GitHub Copilot Free 플랜 출시 (월 2,000회 완성, 50회 채팅) |
| 2025년 | Copilot Agent 모드 정식 출시, MCP(Model Context Protocol) 지원 |

처음에는 단순 자동완성에 가까웠지만, 지금은 채팅으로 대화하고, 여러 파일을 한 번에 수정하고, 외부 도구까지 직접 호출하는 **에이전트(agentic)** 형태로 발전했습니다. 이 커리큘럼은 그 전체 스펙트럼을 다룹니다.

### 1-4. 지원 언어와 환경

Copilot은 특정 언어에 종속되지 않습니다. 다만 학습 데이터가 풍부한 언어일수록 제안의 품질이 높습니다.

**품질이 높은 언어**: Python, JavaScript, TypeScript, Go, Java, C#, C++, Ruby

**지원 에디터**: VS Code, Visual Studio, JetBrains IDE(IntelliJ, PyCharm 등), Neovim, Azure Data Studio

이 커리큘럼은 **VS Code + JavaScript/Python** 조합을 기준으로 합니다.

---

## 2. Copilot의 4가지 모드

Copilot은 단일 기능이 아닙니다. 상황마다 다른 모드를 쓰는 게 핵심 노하우입니다. Chapter 2에서 각 모드를 실전으로 깊이 다루고, 여기서는 개요를 정리합니다.

| 모드 | 위치 | 한 줄 요약 | 언제 쓰나요? |
| :--- | :--- | :--- | :--- |
| **Inline** | 에디터 커서 옆 | 타이핑 중 자동으로 제안 | 함수·변수 작성, 반복 패턴 완성 |
| **Chat** | 사이드 패널 | 에디터 안에서 AI와 대화 | 코드 설명 요청, 개념 질문, 방향 탐색 |
| **Edit** | 파일 전체 범위 | 자연어 지시로 여러 파일 동시 수정 | 리팩터링, 스타일 통일, 파라미터 일괄 변경 |
| **Agent** | 자율 실행 루프 | 계획 수립 → 도구 실행 → 결과 반영 | 새 기능 전체 구현, 테스트 생성·실행, 디버깅 루프 |

### 2-1. Inline 모드

에디터에서 코드를 타이핑하면 **회색 텍스트**로 제안이 나타납니다. `Tab`을 누르면 수락, `Esc`를 누르면 무시, `Alt+]` / `Alt+[`로 다음·이전 제안을 탐색할 수 있습니다. 별도로 뭔가를 열 필요 없이 코딩 흐름을 끊지 않는 게 강점입니다.

### 2-2. Chat 모드

VS Code 좌측 사이드바의 Copilot 아이콘을 클릭하거나 `Ctrl+Alt+I`로 엽니다. 채팅창에 질문을 입력하면 코드, 설명, 명령어를 함께 돌려줍니다. `@workspace`, `@terminal`, `#file` 같은 **슬래시 컨텍스트**로 참조 범위를 지정할 수 있습니다.

```
예시: "@workspace 이 프로젝트의 인증 흐름을 설명해 줘"
예시: "#file:auth.js 이 파일에서 SQL 인젝션 취약점이 있는지 확인해 줘"
```

### 2-3. Edit 모드

`Ctrl+Shift+P` → `Copilot: Open Edit Session`으로 진입합니다. 여러 파일을 선택하고 자연어로 지시하면 Copilot이 **diff 형태로 변경 내용을 제안**합니다. 수락·거절을 파일 단위로 결정할 수 있어, 대규모 리팩터링에 유용합니다.

### 2-4. Agent 모드

Chat 패널에서 모드를 **Agent**로 전환합니다. 고수준 목표("사용자 인증 API를 Express로 만들어 줘")를 주면 Copilot이 파일 생성, 코드 작성, 터미널 명령 실행까지 스스로 계획하고 수행합니다. 실행 전 각 단계를 확인하는 형태라 완전 자동은 아니지만, 반복적인 발판 코드(boilerplate)를 짜는 시간을 크게 줄여 줍니다.

> 💡 **모드 선택 원칙**: 빠른 완성이 필요하면 Inline, 질문·탐색이면 Chat, 파일 여러 개 수정이면 Edit, 큰 단위 기능 구현이면 Agent. 이 판단 기준만 익혀도 생산성이 눈에 띄게 달라집니다.

---

## 3. 요금제 비교 — 기능 관점

> 계정 생성, 라이선스 활성화 방법은 [Ch.0 사전 준비](./00_사전준비.md)에서 다뤘습니다. 여기서는 **어떤 기능 차이가 있는지**를 중심으로 정리합니다.

| 기능 | Free | Pro ($10/월) | Business ($19/월/user) | Enterprise ($39/월/user) |
| :--- | :---: | :---: | :---: | :---: |
| Inline 코드 완성 | ✅ (2,000회/월) | ✅ 무제한 | ✅ 무제한 | ✅ 무제한 |
| Copilot Chat | ✅ (50회/월) | ✅ 무제한 | ✅ 무제한 | ✅ 무제한 |
| Edit 모드 | ✅ | ✅ | ✅ | ✅ |
| Agent 모드 | ✅ | ✅ | ✅ | ✅ |
| Custom Instructions | ✅ | ✅ | ✅ | ✅ |
| MCP 서버 연결 | ✅ | ✅ | ✅ | ✅ |
| 코드베이스 인덱싱 | ❌ | ❌ | ❌ | ✅ |
| 조직 정책 관리 (IP 필터, 파일 제외 등) | ❌ | ❌ | ✅ | ✅ |
| GHAS 자동 보안 수정 제안 | ❌ | ❌ | ⚠️ 조직 설정 필요 | ✅ |
| GitHub.com 통합 (PR 요약, 이슈 탐색) | ❌ | ❌ | ✅ | ✅ |
| 감사 로그 (Audit Log) | ❌ | ❌ | ✅ | ✅ |
| 모델 선택 (GPT-4o, Claude, Gemini 등) | 일부 | ✅ | ✅ | ✅ |

**어떤 플랜을 선택해야 할까요?**

- **개인 학습·사이드 프로젝트**: Free로 시작하세요. 이 커리큘럼의 Ch.0~2 실습은 Free로 가능합니다.
- **MCP, Custom Agents 실습(Ch.3~)**: Pro 이상 필요합니다.
- **팀 도입, 조직 정책 관리 필요**: Business를 권장합니다.
- **대규모 코드베이스 탐색, GHAS 완전 통합**: Enterprise를 검토하세요.

---

## 4. Copilot vs 경쟁 도구 비교

"Copilot 말고 다른 도구는 없나요?"라는 질문을 자주 받습니다. 각 도구의 특징을 알면 팀 상황에 맞는 선택을 할 수 있습니다.

### 4-1. 도구별 특징

**Cursor**

VS Code 포크(fork) 기반의 독립 에디터입니다. Copilot과 매우 비슷하지만, 에디터 자체에 AI가 더 깊이 통합되어 있습니다. "Composer"라는 기능으로 멀티파일 편집을 기본 제공하고, 모델을 직접 지정할 수 있습니다. 단, 별도 에디터이므로 기존 VS Code 설정·확장을 그대로 쓰기 어렵습니다. GitHub 생태계(PR, Actions, GHAS)와의 통합은 Copilot보다 약합니다.

**Sourcegraph Cody**

Sourcegraph의 코드 검색 플랫폼과 통합된 AI 도우미입니다. 대규모 모노레포(monorepo)나 사내 코드베이스 전체를 인덱싱해서 맥락으로 활용하는 데 강합니다. 특히 여러 리포지토리에 걸친 코드 탐색과 질문에 유용합니다. 온프레미스 배포도 지원해 보안이 엄격한 환경에서 선택지가 됩니다.

**Amazon Q Developer**

AWS 개발자 생태계에 깊이 통합된 AI 도우미입니다. AWS 콘솔, Cloud9, JetBrains IDE를 사용하는 팀이나 AWS 서비스 코드(Lambda, CDK, CloudFormation)를 많이 작성하는 경우 제안의 품질이 높습니다. AWS 계정 기반 라이선스 관리를 선호하는 조직에 맞습니다. 비 AWS 환경에서는 Copilot에 비해 강점이 줄어듭니다.

### 4-2. 한눈에 비교

| 항목 | GitHub Copilot | Cursor | Sourcegraph Cody | Amazon Q Developer |
| :--- | :--- | :--- | :--- | :--- |
| 에디터 통합 | VS Code, JetBrains 등 | 전용 에디터 (VS Code 포크) | VS Code, JetBrains 등 | VS Code, JetBrains, Cloud9 |
| GitHub 생태계 통합 | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| AWS 생태계 통합 | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |
| 대규모 코드베이스 검색 | ⭐⭐ (Enterprise) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 모델 선택 유연성 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 무료 플랜 | ✅ | ✅ (제한적) | ✅ | ✅ |
| 온프레미스 배포 | ❌ (GHE 제외) | ❌ | ✅ | ✅ |

> 이 커리큘럼은 **GitHub + Azure DevOps 흐름**을 중심으로 하므로 Copilot이 자연스러운 선택입니다. 팀 환경이 AWS 중심이거나 대형 모노레포라면 Q Developer나 Cody도 검토할 만합니다.

---

## 5. 첫 완성 실습

이론은 여기까지입니다. 직접 Copilot 제안을 받고 수락해 봅시다.

### 전제 조건

- VS Code에 `GitHub Copilot` 확장이 설치되어 있고 로그인된 상태
- ([Ch.0](./00_사전준비.md)을 완료했다면 이미 준비됨)

### Step 1. 새 파일 만들기

VS Code에서 `Ctrl+N`으로 새 파일을 열고, `Ctrl+K M`을 눌러 언어를 **JavaScript**로 설정합니다. 또는 아래처럼 터미널에서 파일을 만들어도 됩니다.

```bash
# 작업 폴더 생성 후 파일 생성
mkdir copilot-practice && cd copilot-practice
touch practice.js
code practice.js
```

### Step 2. 주석으로 의도 전달하기

파일에 아래 주석을 입력합니다. 주석을 입력한 뒤 엔터를 누르면 Copilot이 다음 줄부터 제안을 생성합니다.

```javascript
// 문자열 배열을 받아 각 문자열의 길이 합계를 반환하는 함수
function sumStringLengths(
```

`function sumStringLengths(` 까지 타이핑하면, Copilot이 파라미터와 함수 본문 전체를 회색 텍스트로 제안합니다.

### Step 3. 제안 수락하기

| 키 | 동작 |
| :--- | :--- |
| `Tab` | 현재 제안 전체 수락 |
| `Ctrl+Right` (Windows) / `Cmd+Right` (macOS) | 제안을 단어 단위로 부분 수락 |
| `Esc` | 현재 제안 무시 |
| `Alt+]` / `Alt+[` | 다음·이전 제안으로 이동 |

`Tab`을 눌러 수락하면 아래와 유사한 코드가 완성됩니다.

```javascript
// 문자열 배열을 받아 각 문자열의 길이 합계를 반환하는 함수
function sumStringLengths(strings) {
  return strings.reduce((total, str) => total + str.length, 0);
}

// 동작 확인
console.log(sumStringLengths(["hello", "world", "copilot"])); // 17
```

### Step 4. 결과 확인하기

터미널에서 직접 실행해 결과를 검증합니다.

```bash
node practice.js
# 출력: 17
```

"hello"(5) + "world"(5) + "copilot"(7) = 17. 정확합니다. 이처럼 **실행으로 검증**하는 습관이 중요합니다. 제안을 수락한 뒤 반드시 실행해서 확인하세요.

> 🎉 첫 Copilot 완성 성공! 생각보다 간단하죠? 이제 더 복잡한 상황에서 어떻게 제안 품질을 높이는지 살펴봅니다.

---

## 6. 좋은 프롬프트 vs 나쁜 프롬프트

Copilot의 제안 품질은 **어떻게 맥락을 제공하느냐**에 크게 달라집니다. 같은 기능을 구현할 때도 주석의 구체성에 따라 결과가 천차만별입니다.

### 6-1. JavaScript 예시

**나쁜 프롬프트**

```javascript
// 이메일 확인
function checkEmail(email) {
```

"확인"이 무엇을 의미하는지 모호합니다. 형식 검증인지, DB 중복 조회인지, 존재 여부인지 알 수 없어서 Copilot도 엉뚱한 코드를 생성하기 쉽습니다.

**좋은 프롬프트**

```javascript
// RFC 5322 형식으로 이메일 주소 유효성을 검증하는 함수.
// 유효하면 true, 그렇지 않으면 false를 반환한다.
// 외부 라이브러리 없이 정규식만 사용한다.
function validateEmailFormat(email) {
```

반환 타입, 검증 기준, 의존성 제약까지 명시했습니다. Copilot이 훨씬 정확한 구현을 제안합니다.

---

**나쁜 프롬프트**

```javascript
// 데이터 정렬
function sort(data) {
```

무엇을 기준으로, 어떤 방향으로, 어떤 타입의 데이터를 정렬하는지 전혀 없습니다.

**좋은 프롬프트**

```javascript
// 사용자 객체 배열을 'createdAt' 날짜 기준으로 최신순(내림차순) 정렬하여 반환한다.
// 원본 배열은 변경하지 않는다 (불변).
// @param {Array<{id: number, name: string, createdAt: string}>} users
// @returns {Array} 정렬된 새 배열
function sortUsersByLatest(users) {
```

### 6-2. Python 예시

**나쁜 프롬프트**

```python
# 파일 읽기
def read_file(path):
```

어떤 포맷인지, 에러는 어떻게 처리하는지 불명확합니다.

**좋은 프롬프트**

```python
# 지정한 경로의 JSON 파일을 읽어 딕셔너리로 반환한다.
# 파일이 없으면 FileNotFoundError, JSON 파싱 실패 시 ValueError를 발생시킨다.
# encoding은 UTF-8을 사용한다.
def load_json_file(file_path: str) -> dict:
```

---

**나쁜 프롬프트**

```python
# 숫자 처리
def process(numbers):
```

"처리"가 무엇인지 전혀 알 수 없습니다.

**좋은 프롬프트**

```python
# 정수 리스트에서 짝수만 필터링하고, 각각을 제곱한 결과를 리스트로 반환한다.
# 빈 리스트가 들어오면 빈 리스트를 반환한다.
# @param numbers: List[int]
# @returns: List[int]
def get_squared_evens(numbers: list[int]) -> list[int]:
```

### 프롬프트 품질 체크리스트

좋은 프롬프트에는 아래 요소 중 최대한 많은 것이 들어 있습니다.

- **무엇을** 반환하거나 수행하는지 (반환 타입, 동작)
- **어떤 입력**을 받는지 (파라미터 타입, 예외 케이스)
- **제약 조건**이 있는지 (불변, 외부 의존성 없음, 특정 알고리즘)
- **에러 처리** 방식 (예외 종류, 기본값 반환 등)

---

## 7. Copilot 제안을 검증하는 습관

### 왜 검증이 필요한가요?

Copilot은 확률 모델입니다. **대부분의 경우 잘 작동하지만, 틀리거나 위험한 코드를 자신 있게 제안하는 경우도 있습니다.** 특히:

- 존재하지 않는 라이브러리 메서드를 호출하는 경우
- 보안 취약점(예: SQL 인젝션, 경쟁 조건)이 있는 패턴
- 엣지 케이스(빈 입력, null, 음수)를 처리하지 않는 경우
- 구식(deprecated) API를 사용하는 경우

### 실사례: 검증의 중요성

아래 코드는 Copilot이 생성할 법한 파일 삭제 함수입니다. 얼핏 보면 자연스러워 보이지만 문제가 있습니다.

```javascript
const fs = require("fs");

// 특정 경로의 파일을 삭제하는 함수
function deleteFile(filePath) {
  fs.unlinkSync(filePath);
  console.log(`삭제 완료: ${filePath}`);
}

// 문제: 파일 존재 여부를 확인하지 않아 없는 파일에서 예외가 발생함
// 문제: 상위 디렉터리 탐색 경로(../../../etc/passwd)를 막지 않음
```

**검증 후 개선된 버전**

```javascript
const fs = require("fs");
const path = require("path");

// 허용된 기준 디렉터리 내의 파일만 삭제하는 함수
function deleteFile(filePath, baseDir) {
  // 경로 정규화로 디렉터리 탈출 공격 방지
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error("허용되지 않은 경로입니다.");
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${resolvedPath}`);
  }

  fs.unlinkSync(resolvedPath);
  console.log(`삭제 완료: ${resolvedPath}`);
}
```

### 검증 3단계 루틴

1. **실행해 보기**: 코드를 직접 실행하고 예상 결과와 일치하는지 확인합니다.
2. **엣지 케이스 입력하기**: 빈 값, null, 경계값, 비정상 입력을 직접 넣어봅니다.
3. **코드 리뷰 관점으로 읽기**: "이 코드를 PR에서 받았다면 무엇을 물어볼까?"를 스스로에게 질문합니다.

나중에 Copilot Chat의 `/explain`이나 `/review` 명령어를 함께 쓰면 이 과정이 훨씬 빨라집니다. 자세한 활용법은 [Ch.2](./ch02_Copilot_실전_코딩.md)에서 다룹니다.

---

## 8. 실습 과제

아래 세 과제를 직접 수행해 보세요. 순서대로 난이도가 올라갑니다.

### 과제 1 — Inline 완성 경험하기 (🟢 쉬움)

새 파일 `utils.js`를 만들고, 아래 주석을 입력한 뒤 Copilot의 제안을 Tab으로 수락하세요.

```javascript
// 두 날짜(Date 객체) 사이의 일수 차이를 절댓값으로 반환하는 함수
function daysBetween(date1, date2) {
```

완성된 코드를 `node -e` 또는 별도 테스트 블록으로 실행해 아래 결과를 확인합니다.

```javascript
const d1 = new Date("2025-01-01");
const d2 = new Date("2025-01-15");
console.log(daysBetween(d1, d2)); // 14
```

### 과제 2 — 프롬프트 품질 비교하기 (🟡 보통)

Python 파일 `password_checker.py`를 만들고, **나쁜 프롬프트**와 **좋은 프롬프트** 두 버전을 차례로 시도해 보세요.

```python
# 나쁜 프롬프트 버전
# 비밀번호 체크
def check_password(pw):
    pass
```

```python
# 좋은 프롬프트 버전
# 비밀번호 강도를 검사하는 함수.
# 다음 조건을 모두 만족하면 True, 하나라도 미충족이면 False를 반환한다.
# - 길이 8자 이상
# - 대문자 1개 이상 포함
# - 숫자 1개 이상 포함
# - 특수문자(!, @, #, $, %) 1개 이상 포함
def is_strong_password(password: str) -> bool:
```

두 제안의 차이를 비교하고, 어떤 점이 달라졌는지 주석으로 기록해 두세요.

### 과제 3 — 제안 검증 습관 익히기 (🟠 도전)

아래 Python 함수를 새 파일 `api_client.py`에 작성하고 Copilot의 완성을 받으세요.

```python
import requests

# 주어진 URL에 GET 요청을 보내고 JSON 응답을 반환하는 함수.
# 타임아웃은 5초, HTTP 오류 상태 코드는 예외로 처리한다.
def fetch_json(url: str) -> dict:
```

완성된 코드에 대해 아래 질문에 스스로 답해보고, 필요하다면 코드를 수정하세요.

1. 네트워크 연결 실패(ConnectionError)는 처리하나요?
2. 타임아웃이 발생했을 때 어떻게 되나요?
3. 응답이 JSON이 아닌 경우는요?

Copilot Chat에서 `#file:api_client.py /review` 명령어로 추가 피드백을 받아보세요.

---

## 9. 현업 팁

현업에서 Copilot을 매일 쓰는 개발자들이 공통적으로 강조하는 노하우입니다.

- **주석을 먼저 써라**: 코드를 바로 짜기 전에 "이 함수가 무엇을 해야 하는지"를 주석으로 정리하는 습관을 들이면, Copilot 제안 품질도 올라가고 본인의 설계 사고도 명확해집니다.
- **제안을 통째로 수락하지 마라**: `Tab` 한 번으로 50줄짜리 함수를 통째로 수락하는 것보다, `Ctrl+Right`로 한 줄씩 확인하며 수락하는 편이 더 안전합니다. 특히 비즈니스 로직이 복잡한 부분은 천천히.
- **반복 패턴은 Inline이 최강**: 비슷한 구조의 코드(예: API 핸들러, 테스트 케이스, DTO)를 여러 개 작성할 때 Inline 모드의 패턴 인식 능력이 특히 빛납니다. 첫 번째를 잘 작성해두면 나머지는 Copilot이 대부분 맞춥니다.
- **Chat은 고민의 파트너**: 어떤 접근 방식이 나은지 모르겠을 때 Chat에 "A 방식과 B 방식 중 이 상황에서 어느 게 나은가요?"라고 물어보세요. 설계 결정을 빠르게 좁혀 나가는 데 유용합니다.
- **`.github/copilot-instructions.md`로 팀 컨벤션 등록**: 팀 코딩 스타일, 사용 금지 패턴, 선호 라이브러리를 이 파일에 정의하면 모든 팀원의 Copilot이 동일한 기준으로 제안합니다. 자세한 방법은 [Ch.3](./ch03_Copilot_고급_활용_Custom_Agents_MCP.md)에서 다룹니다.
- **보안 민감 코드는 Copilot 결과를 특히 꼼꼼히 검토**: 인증, 암호화, 파일 시스템 접근, DB 쿼리는 Copilot이 잘못된 패턴을 제안할 가능성이 높은 영역입니다. 이 영역은 제안 수락 전 항상 `#security` 태그를 붙여 Chat에서 다시 한번 검토하는 습관을 권장합니다.
- **Copilot이 틀렸을 때 포기하지 마라**: 처음 제안이 마음에 들지 않으면 `Esc`로 무시하고 더 구체적인 주석을 추가한 뒤 다시 시도해 보세요. 또는 Chat에서 "방금 제안한 코드에서 X 부분을 Y 방식으로 바꿔줘"처럼 후속 지시를 주면 됩니다.

---

## 10. 참고 자료

- [GitHub Copilot 공식 문서](https://docs.github.com/copilot) — 기능 레퍼런스, 플랜별 제한, 에디터 설정 가이드
- [GitHub Copilot 릴리스 노트](https://github.blog/changelog/label/copilot/) — 새 기능이 나올 때마다 업데이트됨
- [GitHub Copilot 공식 예제 모음](https://github.com/github/awesome-copilot) — 실제 프롬프트·활용 사례
- [GitHub Copilot Trust Center](https://resources.github.com/copilot-trust-center/) — 데이터 처리, 개인정보 보호 정책
- [Copilot 모델 선택 가이드](https://docs.github.com/copilot/using-github-copilot/ai-models/changing-the-ai-model-for-copilot-chat) — GPT-4o, Claude, Gemini 중 어느 모델을 쓸지 선택하는 방법
- [커리큘럼 전체 구조](../README.md) — 챕터 지도 및 학습 방법

---

## 다음 단계

이제 Copilot의 기본 개념, 4가지 모드, 프롬프트 작성법, 검증 습관을 익혔습니다. 다음 챕터에서는 각 모드를 실전 시나리오에 적용해 봅니다. Chat으로 코드를 설명하고, Edit으로 리팩터링하고, Agent로 기능 전체를 구현하는 과정을 차례로 경험합니다.

→ [`ch02_Copilot_실전_코딩.md`](./ch02_Copilot_실전_코딩.md)
