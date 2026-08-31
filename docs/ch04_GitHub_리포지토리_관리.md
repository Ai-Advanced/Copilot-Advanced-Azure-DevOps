# 📦 Chapter 4. GitHub 리포지토리 관리

> **소요 시간**: 50분
> **난이도**: 🟢 초급
> **선수 과목**: Git 기본 명령어 숙지

---

## 목차

1. [학습 목표](#1-학습-목표)
2. [왜 리포지토리 관리가 중요한가](#2-왜-리포지토리-관리가-중요한가)
3. [브랜치 전략 3가지 비교](#3-브랜치-전략-3가지-비교)
4. [Feature 브랜치 워크플로](#4-feature-브랜치-워크플로)
5. [Pull Request 실전](#5-pull-request-실전)
6. [Code Review 문화](#6-code-review-문화)
7. [Branch Protection Rules](#7-branch-protection-rules)
8. [CODEOWNERS 파일](#8-codeowners-파일)
9. [Issue & Projects v2](#9-issue--projects-v2)
10. [Labels 시스템](#10-labels-시스템)
11. [실전 시나리오](#11-실전-시나리오)
12. [실습 과제](#12-실습-과제)
13. [현업 팁](#13-현업-팁)
14. [다음 단계](#14-다음-단계)

---

## 1. 학습 목표

이 챕터를 마치면 다음을 할 수 있습니다.

1. GitFlow, GitHub Flow, Trunk-Based Development의 차이를 설명하고 팀 상황에 맞는 전략을 선택할 수 있다.
2. Conventional Commits 스펙에 따라 의미 있는 커밋 메시지를 작성하고 `.gitmessage` 템플릿을 설정할 수 있다.
3. PR 템플릿, Draft PR, 적정 PR 크기 원칙을 적용해 리뷰 친화적인 PR을 만들 수 있다.
4. GitHub Copilot Code Review를 활성화하고, AI 코드 리뷰 결과를 실무에 활용할 수 있다.
5. Branch Protection Rules와 Rulesets를 설정해 `main` 브랜치를 보호할 수 있다.
6. CODEOWNERS 파일을 작성해 코드 영역별 자동 리뷰어 지정을 구성할 수 있다.
7. Issue Templates, Projects v2, Labels를 조합해 팀의 작업 흐름을 추적할 수 있다.

---

## 2. 왜 리포지토리 관리가 중요한가

개발 속도가 빨라질수록 협업 규칙이 없으면 코드베이스가 빠르게 망가집니다. 현장에서 반복적으로 발생하는 협업 실패에는 세 가지 공통 패턴이 있습니다.

### 패턴 1: main 브랜치 오염

누군가 직접 `main`에 푸시합니다. 빌드가 깨지고, 다른 개발자들은 자신이 작성하지 않은 코드 때문에 로컬 환경이 망가집니다. 원인을 추적해보면 "급해서 그냥 올렸어요"라는 답변이 돌아옵니다.

**결과**: 배포 불가, 팀 전체 블로킹, 신뢰 손상.

### 패턴 2: 리뷰 없이 머지

"간단한 수정이라 리뷰 없이 머지했어요." 그 간단한 수정이 프로덕션 장애로 이어지는 것은 흔한 일입니다. 리뷰 프로세스는 버그를 잡는 것뿐 아니라 지식 공유와 설계 개선의 기회이기도 합니다.

**결과**: 숨겨진 버그, 지식 사일로, 설계 부채 누적.

### 패턴 3: 롤백 불가

커밋이 뒤섞여 있어 특정 기능만 되돌리기가 불가능합니다. 스쿼시 머지도, 의미 있는 커밋 단위도 없이 "wip", "fix", "tmp" 같은 커밋 메시지만 남아 있습니다.

**결과**: 장애 대응 시간 증가, 배포 위험도 상승.

이 세 가지 패턴을 방지하는 것이 리포지토리 관리 체계의 핵심 목적입니다.

---

## 3. 브랜치 전략 3가지 비교

### 3.1 GitFlow

Vincent Driessen이 2010년에 제안한 전통적인 전략입니다. `main`, `develop`, `feature/*`, `release/*`, `hotfix/*` 등 여러 장수(long-lived) 브랜치를 사용합니다.

```
main ──────────────────────────────────── v1.0 ── v1.1
      \                                  /
develop ──────────────────────────────────
         \      /    \         /
          feat/A      feat/B
                            \
                         release/1.1
```

**적합한 상황**: 분기별 릴리스, 엄격한 QA 사이클, 다중 버전 동시 지원이 필요한 엔터프라이즈 제품.

**단점**: 브랜치 수가 많아 관리 복잡도가 높고, 장기 브랜치로 인한 머지 충돌이 빈번합니다.

---

### 3.2 GitHub Flow

GitHub이 권장하는 심플한 전략입니다. `main`과 `feature` 브랜치 두 종류만 사용합니다. 기능 완성 즉시 PR을 열고 리뷰 후 `main`에 머지합니다.

```
main ────────────────────────────────────
         \           /   \           /
          feat/#123-A     feat/#456-B
```

**이 커리큘럼의 권장 전략**입니다. 빠른 배포 주기, 작은 PR, 지속적 통합과 잘 맞습니다.

**적합한 상황**: SaaS, 웹 서비스, CI/CD 파이프라인이 갖춰진 팀.

---

### 3.3 Trunk-Based Development (TBD)

모든 개발자가 `main`(trunk)에 직접, 또는 매우 짧은 수명의 브랜치를 통해 하루 수차례 통합합니다. 미완성 기능은 Feature Flag으로 숨깁니다.

```
main (trunk) ──●──●──●──●──●──●──●──●──
               ^  ^  ^  ^  ^  ^  ^  ^
               여러 개발자가 소량씩 커밋
```

**적합한 상황**: 성숙한 CI, 강한 테스트 커버리지, Feature Flag 인프라가 갖춰진 팀 (Google, Meta 수준).

**단점**: 진입 장벽이 높습니다. 테스트와 Feature Flag 없이 시도하면 오히려 위험합니다.

---

### 3.4 비교표

| 항목 | GitFlow | GitHub Flow | Trunk-Based Dev |
|---|---|---|---|
| **브랜치 수** | 5종 이상 (장수 브랜치) | 2종 (main + feature) | 1종 (main 중심) |
| **릴리스 주기** | 수 주 ~ 수 개월 | 수 일 ~ 수 주 | 수 시간 ~ 수 일 |
| **배포 방식** | release 브랜치 → 태그 | main 머지 = 배포 트리거 | main 커밋 = 즉시 배포 |
| **팀 규모** | 중~대형, 다중 버전 | 소~중형, 단일 버전 | 시니어 중심, 강한 자동화 |
| **Feature Flag 필요** | 선택 | 선택 | 필수 |
| **학습 곡선** | 높음 | 낮음 | 매우 높음 |

---

### 3.5 의사결정 트리

```
팀에 릴리스 브랜치가 필요한가?
│
├── YES → 다중 버전 동시 지원?
│         ├── YES → GitFlow
│         └── NO  → GitHub Flow + release tag
│
└── NO  → CI/CD와 Feature Flag이 완전히 갖춰졌는가?
          ├── YES → Trunk-Based Development
          └── NO  → GitHub Flow (이 커리큘럼 권장)
```

---

## 4. Feature 브랜치 워크플로

### 4.1 전체 흐름

```
1. GitHub Issue 생성 (#123)
2. 브랜치 생성: feat/#123-add-login
3. 로컬에서 작업 + Conventional Commits
4. PR 오픈 (Draft → Ready)
5. 코드 리뷰 + Copilot Review
6. 승인 후 Squash Merge
7. 브랜치 삭제
```

### 4.2 브랜치 네이밍 규칙

이슈 번호를 브랜치 이름에 포함하면 GitHub이 자동으로 PR과 이슈를 연결합니다.

```bash
# 패턴: <type>/#<issue-number>-<짧은-설명>
git switch -c feat/#123-add-login
git switch -c fix/#456-null-pointer-auth
git switch -c chore/#789-update-deps
git switch -c docs/#101-readme-setup
```

### 4.3 Conventional Commits

[conventionalcommits.org](https://www.conventionalcommits.org) 스펙을 기반으로 합니다. 커밋 메시지를 구조화하면 CHANGELOG 자동 생성, 시맨틱 버저닝 자동화가 가능합니다.

**기본 형식**:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**type 목록**:

| type | 의미 | 버전 범프 |
|---|---|---|
| `feat` | 새로운 기능 | MINOR |
| `fix` | 버그 수정 | PATCH |
| `docs` | 문서 변경만 | 없음 |
| `style` | 코드 의미 변화 없는 포맷팅 | 없음 |
| `refactor` | 기능 변화 없는 리팩터링 | 없음 |
| `perf` | 성능 개선 | PATCH |
| `test` | 테스트 추가/수정 | 없음 |
| `chore` | 빌드, 도구, 의존성 변경 | 없음 |
| `ci` | CI 설정 변경 | 없음 |
| `revert` | 이전 커밋 되돌리기 | 상황에 따름 |

**BREAKING CHANGE**: `!`를 type 뒤에 붙이거나 footer에 `BREAKING CHANGE:` 를 기재하면 MAJOR 버전 범프입니다.

**실전 예시**:

```bash
# 새 기능
git commit -m "feat(auth): add OAuth2 login with GitHub provider"

# 버그 수정
git commit -m "fix(api): handle null user object in /me endpoint"

# 브레이킹 체인지
git commit -m "feat(auth)!: remove legacy session-based login

BREAKING CHANGE: 세션 기반 로그인 엔드포인트(/login-legacy)가 제거되었습니다.
JWT 기반 /auth/login 을 사용하세요."

# 문서
git commit -m "docs: add environment variable setup guide to README"

# 테스트
git commit -m "test(auth): add unit tests for token refresh logic"
```

### 4.4 `.gitmessage` 템플릿 설정

커밋 메시지 템플릿을 설정하면 `git commit`을 실행할 때 에디터에 양식이 미리 채워집니다.

```bash
# ~/.gitmessage 파일 생성
cat > ~/.gitmessage << 'EOF'
# <type>[scope]: <subject> (72자 이내)
# type: feat|fix|docs|style|refactor|perf|test|chore|ci|revert
# scope: 선택사항, 변경된 모듈/영역 (auth, api, ui 등)
#
# [본문] 무엇을, 왜 변경했는지 설명 (선택)
#
# [footer]
# Closes #<issue-number>
# BREAKING CHANGE: <설명>
EOF

# Git 전역 설정
git config --global commit.template ~/.gitmessage
```

**Copilot 활용 팁**: VS Code에서 `git commit`을 실행하면 터미널 에디터 대신 Source Control 패널이 열립니다. 커밋 메시지 입력란 위에 Copilot 아이콘을 클릭하면 스테이징된 diff를 분석해 Conventional Commits 형식의 메시지 초안을 자동으로 생성합니다. 초안을 그대로 쓰기보다 검토 후 수정하는 습관을 들이세요.

---

## 5. Pull Request 실전

### 5.1 PR 템플릿

`.github/pull_request_template.md` 파일을 리포지토리에 추가하면 PR 생성 시 본문이 자동으로 채워집니다.

```markdown
<!-- .github/pull_request_template.md -->

## 변경 요약

<!-- 이 PR이 무엇을 변경하는지 한두 문장으로 설명하세요 -->

## 관련 이슈

Closes #

## 변경 유형

- [ ] 버그 수정 (fix)
- [ ] 새 기능 (feat)
- [ ] 브레이킹 체인지 (BREAKING CHANGE)
- [ ] 문서 업데이트 (docs)
- [ ] 리팩터링 (refactor)
- [ ] 기타 (chore, ci, test 등)

## 체크리스트

- [ ] 로컬에서 테스트를 실행했고 통과했습니다
- [ ] 새로운 코드에 테스트를 추가했습니다 (해당 시)
- [ ] 문서를 업데이트했습니다 (해당 시)
- [ ] 브레이킹 체인지 여부를 확인했습니다

## 스크린샷 / 로그 (선택)

<!-- UI 변경이라면 전후 스크린샷, 버그 수정이라면 에러 로그를 첨부하세요 -->

## 리뷰어를 위한 참고사항

<!-- 리뷰어가 집중해서 봐줬으면 하는 부분이나 결정 배경을 설명하세요 -->
```

### 5.2 Draft PR vs Ready for Review

| 상태 | 목적 | 머지 가능 여부 |
|---|---|---|
| **Draft PR** | 작업 중 피드백 요청, 논의, WIP 표시 | 불가 |
| **Ready for Review** | 정식 리뷰 요청, 머지 준비 완료 | 가능 (승인 후) |

Draft PR은 아직 완성되지 않았지만 방향성을 공유하거나 조기 피드백을 받고 싶을 때 유용합니다. "Ready for Review" 버튼을 누르는 순간 리뷰어에게 알림이 갑니다.

```bash
# gh CLI로 Draft PR 생성
gh pr create --draft --title "feat: #123 로그인 기능 추가" --body "WIP: 토큰 갱신 로직 미완성"

# Draft → Ready 전환
gh pr ready <pr-number>
```

### 5.3 좋은 PR 크기

**권장 diff: 300줄 이하 (추가 + 삭제 합산)**

그 이유는 명확합니다. 연구에 따르면 리뷰어가 집중력을 유지하며 코드를 읽을 수 있는 분량은 약 200~400줄입니다. 그 이상이 되면 리뷰 품질이 급격히 떨어지고 "LGTM 리뷰"(제대로 읽지 않고 승인)가 늘어납니다.

큰 기능이라면 PR을 나누는 방법을 고민하세요.

- 기반 인프라 PR → 기능 구현 PR → 통합 테스트 PR
- 백엔드 PR → 프론트엔드 PR
- 데이터 마이그레이션 PR → 로직 변경 PR

```bash
# 현재 diff 크기 확인
git diff main --stat | tail -1
# 예시 출력: 15 files changed, 248 insertions(+), 89 deletions(-)
```

### 5.4 Copilot Code Review 활성화 및 사용법

GitHub Copilot Code Review는 2025년 GA(General Availability)로 출시된 기능입니다. PR에서 AI가 코드를 분석하고 구체적인 리뷰 코멘트를 남깁니다.

**활성화 방법**:

1. 리포지토리 설정에서 `Settings > Copilot > Code review` 항목을 활성화합니다.
2. 또는 조직 수준에서 `Organization Settings > Copilot > Policies`에서 Code Review를 허용합니다.

**사용 방법**:

PR 페이지에서 "Reviewers" 패널에 `Copilot`이 표시됩니다.

- **자동 리뷰**: PR이 생성되거나 Ready 상태로 전환되면 Copilot이 자동으로 리뷰를 시작합니다 (설정에 따라 다름).
- **수동 요청**: PR 페이지에서 Copilot을 리뷰어로 지정하거나, PR 코멘트에 `@github-copilot review`를 입력합니다.

**Copilot이 리뷰하는 항목**:

- 잠재적 버그 (null 참조, 예외 처리 누락 등)
- 보안 취약점 패턴
- 코드 중복 및 개선 가능한 구조
- 성능 관련 안티패턴
- 테스트 커버리지 누락

**주의사항**: Copilot 리뷰는 인간 리뷰를 대체하지 않습니다. AI가 놓치는 비즈니스 로직, 도메인 지식, 팀 컨벤션은 여전히 사람이 리뷰해야 합니다.

---

## 6. Code Review 문화

### 6.1 리뷰어 관점: 무엇을 봐야 하는가

코드 리뷰는 단순히 오타나 스타일을 잡는 것이 아닙니다. 다음 순서로 검토하세요.

**1. 기능 (Correctness)**
- PR이 이슈에서 요구한 것을 실제로 구현하고 있는가?
- 엣지 케이스(null, 빈 배열, 권한 없는 사용자)를 처리하는가?
- 기존 동작을 의도치 않게 깨뜨리는 부분은 없는가?

**2. 설계 (Design)**
- 이 코드가 기존 아키텍처 패턴과 일관성 있는가?
- 책임이 적절히 분리되어 있는가?
- 너무 복잡하게 만든 부분은 없는가? (YAGNI)

**3. 보안 (Security)**
- 사용자 입력을 적절히 검증하고 있는가?
- 민감한 데이터(비밀번호, 토큰)를 로그에 노출하지 않는가?
- SQL Injection, XSS 등 기본 취약점 패턴은 없는가?

**4. 테스트 (Tests)**
- 새 기능에 테스트가 있는가?
- 테스트가 의미 있는 시나리오를 커버하는가? (하나의 assert만 있는 형식적 테스트는 아닌지)

**5. 스타일 (Style)**
- 팀 컨벤션을 따르는가? (린터가 잡지 못하는 네이밍, 주석 스타일 등)

### 6.2 리뷰이 관점: 답변하는 법

**blocking vs non-blocking 구분**

리뷰 코멘트에 명확한 레이블을 붙이면 리뷰이가 우선순위를 파악하기 쉽습니다.

```
[blocking] 이 부분은 머지 전에 반드시 수정이 필요합니다.
           null 체크가 없어서 프로덕션에서 NPE가 발생할 수 있습니다.

[nit] 변수명을 `userData` 대신 `user`로 짧게 해도 될 것 같습니다.
      (선택 사항, 취향 차이)

[question] 여기서 왜 캐시를 bypass하는 건가요? 의도적인 결정인지 궁금합니다.

[suggestion] 이 로직을 별도 함수로 추출하면 테스트하기 더 편할 것 같습니다.
```

**답변 원칙**:

- 모든 코멘트에 응답하세요. 동의하면 수정 후 `Done`, 동의하지 않으면 이유를 설명하세요.
- 방어적으로 반응하지 마세요. 코드가 아닌 로직을 리뷰하는 것입니다.
- "왜"를 설명하는 코멘트를 남겼다면, 그 설명을 코드 주석으로 옮기는 것도 고려하세요.

### 6.3 Copilot으로 리뷰 답변 초안 만들기

리뷰 코멘트를 받았을 때 VS Code에서 다음과 같이 Copilot을 활용할 수 있습니다.

```
# GitHub PR 코멘트에서 복사한 리뷰 내용을 VS Code 터미널 또는 채팅에 붙여넣고:

"다음 코드 리뷰 코멘트에 대해 수정 방향과 답변 초안을 작성해줘:
[리뷰 코멘트 내용]"
```

Copilot Chat (`Ctrl+Alt+I`)에서 파일을 첨부하고 "이 코드의 null 처리를 개선하는 방법을 알려줘" 같은 프롬프트로 구체적인 수정 코드를 받을 수 있습니다.

---

## 7. Branch Protection Rules

`main` 브랜치에 직접 푸시하거나 리뷰 없이 머지하는 것을 시스템 수준에서 막는 설정입니다.

### 7.1 설정 위치

`Settings > Branches > Branch protection rules > Add rule`

### 7.2 권장 설정 체크리스트

```
Branch name pattern: main

[ v ] Require a pull request before merging
      [ v ] Require approvals
            Minimum number of approvals: 1  (팀 규모에 따라 2 권장)
      [ v ] Dismiss stale pull request approvals when new commits are pushed
            (새 커밋이 추가되면 기존 승인을 무효화 — 승인 후 변경 방지)
      [ v ] Require review from Code Owners
            (CODEOWNERS에 명시된 소유자의 승인 필수)
      [   ] Restrict who can dismiss pull request reviews (선택)

[ v ] Require status checks to pass before merging
      [ v ] Require branches to be up to date before merging
      Status checks that are required:
        - CI / build (GitHub Actions 워크플로 이름)
        - CI / test
        - CI / lint

[ v ] Require conversation resolution before merging
      (모든 리뷰 코멘트 해결 필수)

[ v ] Require signed commits
      (GPG 또는 SSH 키로 서명된 커밋만 허용 — 현업 팁 참고)

[ v ] Require linear history
      (Merge commit 금지, Squash or Rebase only)

[ v ] Include administrators
      (관리자도 이 규칙을 따름 — 예외 없음)

[   ] Restrict who can push to matching branches (선택, 소규모 팀)

[ v ] Do not allow bypassing the above settings
```

### 7.3 Rulesets vs 기존 Branch Protection Rules

2023년 말 GitHub은 **Rulesets**를 정식 출시했습니다. 기존 Branch Protection Rules와 비교하면:

| 항목 | Branch Protection Rules | Rulesets |
|---|---|---|
| **적용 대상** | 단일 브랜치 패턴 | 여러 브랜치 + 태그 |
| **조직 수준 적용** | 리포지토리별 설정 필요 | 조직 전체에 한 번에 적용 가능 |
| **레이어링** | 단일 규칙 세트 | 여러 Ruleset 중첩 적용 가능 |
| **Bypass 권한** | 불가 (Include admins 설정 시) | 역할/팀 단위 Bypass 지정 가능 |
| **내보내기/가져오기** | 불가 | JSON으로 내보내기 가능 |

새 프로젝트라면 Rulesets 사용을 권장합니다. `Settings > Rules > Rulesets`에서 설정합니다.

---

## 8. CODEOWNERS 파일

### 8.1 개요

`.github/CODEOWNERS` 파일에 코드 영역별 소유자(팀 또는 개인)를 지정합니다. PR에서 해당 파일이 변경되면 GitHub이 지정된 소유자를 자동으로 리뷰어에 추가합니다.

### 8.2 문법과 매칭 규칙

- 한 줄에 `<패턴> <소유자...>` 형식으로 작성합니다.
- 패턴은 `.gitignore`와 동일한 glob 규칙을 따릅니다.
- 파일에서 **마지막으로 매칭된 패턴**이 우선합니다.
- 소유자는 `@username`, `@org/team-name`, 또는 이메일 주소를 사용합니다.

### 8.3 실전 예제

```gitignore
# .github/CODEOWNERS

# 기본 소유자: 모든 파일은 테크리드가 리뷰
*   @Ai-Advanced/tech-leads

# 인프라 관련 파일
/.github/           @Ai-Advanced/devops-team
/terraform/         @Ai-Advanced/devops-team
/k8s/               @Ai-Advanced/devops-team
Dockerfile          @Ai-Advanced/devops-team

# 백엔드 API
/src/api/           @Ai-Advanced/backend-team
/src/services/      @Ai-Advanced/backend-team
/src/models/        @Ai-Advanced/backend-team

# 프론트엔드
/src/components/    @Ai-Advanced/frontend-team
/src/pages/         @Ai-Advanced/frontend-team
/src/styles/        @Ai-Advanced/frontend-team

# 인증/보안 관련 코드 — 보안팀 필수 리뷰
/src/auth/          @Ai-Advanced/security-team @Ai-Advanced/backend-team

# 데이터베이스 마이그레이션
/migrations/        @Ai-Advanced/dba-team @Ai-Advanced/backend-team

# 문서
/docs/              @Ai-Advanced/tech-writers
*.md                @Ai-Advanced/tech-writers

# CI/CD 설정
/.github/workflows/ @Ai-Advanced/devops-team @Ai-Advanced/tech-leads

# 특정 파일은 특정 개인이 소유
/src/config/production.yaml  @hongildong @Ai-Advanced/tech-leads
```

### 8.4 자동 리뷰어 지정 흐름

```
개발자가 PR 생성
       │
       ▼
GitHub이 변경된 파일 목록 분석
       │
       ▼
CODEOWNERS 패턴과 대조 (마지막 매칭 패턴 우선)
       │
       ▼
해당 소유자를 Reviewers에 자동 추가 + 알림 전송
       │
       ▼
Branch Protection Rules의 "Require review from Code Owners" 설정 시
→ 해당 소유자의 승인 없이는 머지 불가
```

**주의사항**: CODEOWNERS 파일 자체는 CODEOWNERS 파일에 지정된 소유자만 변경할 수 있어야 합니다. 위 예시에서 `/.github/` 경로에 `@Ai-Advanced/tech-leads`를 지정한 것이 이 때문입니다.

---

## 9. Issue & Projects v2

### 9.1 Issue Templates

`.github/ISSUE_TEMPLATE/` 디렉터리에 YAML 파일을 추가하면 이슈 생성 시 타입을 선택하는 화면이 나타납니다.

**버그 리포트 템플릿** (`.github/ISSUE_TEMPLATE/bug_report.yml`):

```yaml
name: 버그 리포트
description: 버그나 예상치 못한 동작을 보고합니다
title: "[Bug] "
labels: ["type/bug", "status/triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        버그를 보고해 주셔서 감사합니다. 아래 항목을 최대한 상세히 작성해 주세요.

  - type: textarea
    id: description
    attributes:
      label: 버그 설명
      description: 무슨 일이 일어났나요?
      placeholder: 명확하고 간결하게 설명해 주세요.
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: 재현 단계
      description: 버그를 재현하는 방법을 알려주세요.
      value: |
        1. '...' 페이지로 이동합니다
        2. '...' 버튼을 클릭합니다
        3. 에러가 발생합니다
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: 기대하는 동작
      description: 어떤 결과를 기대했나요?
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: 실제 동작
      description: 실제로 무슨 일이 일어났나요?
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: 심각도
      options:
        - P0 (서비스 중단)
        - P1 (주요 기능 영향)
        - P2 (일반)
        - P3 (사소함)
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: 환경
      value: |
        - OS:
        - 브라우저:
        - 앱 버전:
```

**기능 요청 템플릿** (`.github/ISSUE_TEMPLATE/feature_request.yml`):

```yaml
name: 기능 요청
description: 새로운 기능이나 개선 사항을 제안합니다
title: "[Feat] "
labels: ["type/enhancement", "status/triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: 해결하려는 문제
      description: 어떤 문제나 불편함이 있나요?
      placeholder: "현재 ... 하려면 ... 해야 하는데 불편합니다."
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: 제안하는 해결책
      description: 어떤 기능을 원하시나요?
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: 고려한 대안
      description: 다른 방법을 고려했나요?

  - type: dropdown
    id: priority
    attributes:
      label: 우선순위
      options:
        - P1 (높음)
        - P2 (보통)
        - P3 (낮음)
```

**템플릿 선택 화면 설정** (`.github/ISSUE_TEMPLATE/config.yml`):

```yaml
blank_issues_enabled: false
contact_links:
  - name: 보안 취약점 보고
    url: https://github.com/Ai-Advanced/your-repo/security/advisories/new
    about: 보안 취약점은 공개 이슈가 아닌 Security Advisory를 통해 보고해 주세요.
```

### 9.2 Projects v2 활용

Projects v2는 스프레드시트처럼 이슈와 PR을 관리하는 도구입니다. 커스텀 필드를 통해 팀에 맞는 워크플로를 만들 수 있습니다.

**권장 커스텀 필드 구성**:

| 필드명 | 타입 | 옵션 예시 |
|---|---|---|
| **Status** | Single select | Backlog, In Progress, In Review, Done, Blocked |
| **Priority** | Single select | P0, P1, P2, P3 |
| **Sprint** | Iteration | Sprint 1 (2주 단위) |
| **Estimate** | Number | 스토리 포인트 (1, 2, 3, 5, 8) |
| **Area** | Single select | Backend, Frontend, Infra, Docs |

**뷰(View) 활용**:

- **Board 뷰**: Status 기준 칸반 보드. 스탠드업에 유용.
- **Table 뷰**: 전체 이슈를 스프레드시트로 조회. 스프린트 계획에 유용.
- **Roadmap 뷰**: Sprint 또는 날짜 기준 타임라인.

### 9.3 Milestones vs Projects 차이

| 항목 | Milestones | Projects v2 |
|---|---|---|
| **목적** | 릴리스 단위 진행률 추적 | 전반적인 작업 관리 |
| **단위** | 이슈/PR 완료 여부 (%) | 커스텀 필드 기반 상태 |
| **여러 리포지토리** | 리포지토리별 독립 | 조직 수준에서 여러 리포지토리 통합 가능 |
| **자동화** | 제한적 | GitHub Actions 연동, 자동 상태 변경 가능 |
| **추천 사용처** | v1.0 릴리스 추적 | 일상적인 스프린트 관리 |

두 도구는 함께 사용할 수 있습니다. Milestone으로 "v2.0 릴리스"를 추적하고, Projects로 각 스프린트의 세부 작업을 관리하는 조합이 효과적입니다.

---

## 10. Labels 시스템

### 10.1 Prefix 기반 레이블 규칙

레이블에 일관된 prefix를 붙이면 필터링과 자동화가 편해집니다.

**type/** — 작업 유형:
```
type/bug          #d73a4a  빨강
type/enhancement  #a2eeef  하늘
type/docs         #0075ca  파랑
type/refactor     #e4e669  노랑
type/chore        #d0d0d0  회색
type/security     #e11d48  진빨강
```

**area/** — 코드 영역:
```
area/backend      #c5def5  연파랑
area/frontend     #bfd4f2  연보라
area/infra        #f9d0c4  연주황
area/database     #1d76db  진파랑
area/auth         #e11d48  진빨강
```

**priority/** — 우선순위:
```
priority/p0       #b60205  진빨강  (서비스 중단 — 즉시 대응)
priority/p1       #d93f0b  주황
priority/p2       #fbca04  노랑
priority/p3       #0e8a16  초록    (여유 있을 때 처리)
```

**status/** — 진행 상태:
```
status/triage     #ededed  연회색  (분류 대기)
status/blocked    #e4e669  노랑
status/wontfix    #ffffff  흰색
```

### 10.2 Auto-label with Actions

PR이나 이슈의 경로, 제목을 분석해 레이블을 자동으로 지정할 수 있습니다. `actions/labeler` 액션을 사용합니다. 자세한 내용은 **Ch.5 GitHub Actions 기초**에서 다룹니다.

```yaml
# .github/labeler.yml (간단 예시)
area/backend:
  - src/api/**
  - src/services/**

area/frontend:
  - src/components/**
  - src/pages/**

area/infra:
  - .github/workflows/**
  - terraform/**
  - Dockerfile
```

---

## 11. 실전 시나리오

### 시나리오 (a): 새 기능 개발 전체 흐름

```
1. [GitHub] 기능 이슈 생성
   제목: "[Feat] 소셜 로그인 기능 추가 - GitHub OAuth"
   레이블: type/enhancement, area/auth, priority/p2
   Projects 추가: Sprint 3 / Status: Backlog

2. [로컬] 브랜치 생성
   git switch main && git pull
   git switch -c feat/#42-github-oauth-login

3. [로컬] 작업 + 커밋
   git commit -m "feat(auth): add GitHub OAuth2 provider configuration"
   git commit -m "feat(auth): implement callback handler and token exchange"
   git commit -m "test(auth): add integration tests for OAuth flow"

4. [GitHub] Draft PR 생성
   gh pr create --draft \
     --title "feat(auth): #42 GitHub OAuth 로그인 구현" \
     --body "Closes #42"
   → Projects Status 자동 업데이트: In Progress

5. [GitHub] 구현 완료 → Ready for Review 전환
   gh pr ready 57

6. [GitHub] Copilot Code Review 자동 실행
   → 보안 이슈 코멘트: "GitHub secret은 환경 변수로 분리하세요"
   → 수정 후 커밋

7. [GitHub] 팀원 리뷰 요청
   CODEOWNERS 규칙으로 @security-team 자동 지정
   → 승인 완료

8. [GitHub] Squash and Merge
   최종 커밋 메시지: "feat(auth): add GitHub OAuth2 login (#57)"
   → Issue #42 자동 Close
   → Projects Status: Done
   → feat/#42 브랜치 자동 삭제

9. [CI/CD] Ch.5~7에서 배울 GitHub Actions로 자동 배포 트리거
```

### 시나리오 (b): 핫픽스 워크플로

```
1. [Slack/모니터링] 프로덕션 장애 감지
   예: 로그인 API 500 에러 급증

2. [GitHub] P0 이슈 즉시 생성
   제목: "[Bug] 로그인 API 500 에러 — JWT 만료 처리 누락"
   레이블: type/bug, priority/p0, area/auth

3. [로컬] main에서 핫픽스 브랜치
   git switch main && git pull
   git switch -c fix/#99-jwt-expiry-500-error

4. [로컬] 최소 변경으로 수정 + 테스트
   git commit -m "fix(auth): handle expired JWT with 401 instead of 500"
   git commit -m "test(auth): add test for expired token scenario"

5. [GitHub] PR 즉시 생성 (Draft 생략)
   gh pr create \
     --title "fix(auth): #99 JWT 만료 시 500 에러 수정" \
     --body "Closes #99\n\n긴급 핫픽스 — P0 장애 대응"

6. [팀] 긴급 리뷰 요청 (Slack 공유)
   → 최소 1명 승인 후 즉시 머지

7. [CI/CD] 자동 배포 + 장애 해소 확인
```

---

## 12. 실습 과제

### 과제 1: 브랜치 전략 설계서 작성

여러분의 팀 또는 가상의 팀(서비스 유형, 팀 규모, 배포 주기 설정)을 설정하고, 이 챕터의 의사결정 트리를 따라 가장 적합한 브랜치 전략을 선택하세요. 선택 이유와 예상되는 트레이드오프를 200자 이상으로 작성해 팀 위키 또는 `docs/branching-strategy.md`에 기록합니다.

**체크포인트**:
- [ ] 팀 상황 설명 (서비스 유형, 팀 규모, 배포 주기)
- [ ] 선택한 전략과 이유
- [ ] 고려했지만 선택하지 않은 전략과 이유

### 과제 2: 리포지토리 보호 설정

본인 소유의 GitHub 리포지토리(없다면 새로 생성)에서 다음을 설정합니다.

1. `.github/pull_request_template.md` 작성
2. `.github/CODEOWNERS` 파일 작성 (본인 GitHub ID 사용)
3. `.github/ISSUE_TEMPLATE/bug_report.yml` 작성
4. Branch Protection Rules: 최소 승인 1명, Required checks, Require conversation resolution 활성화

**체크포인트**:
- [ ] PR 생성 시 템플릿이 자동 적용되는 것 확인
- [ ] 이슈 생성 시 템플릿 선택 화면이 나타나는 것 확인
- [ ] 직접 push 시도 → 거부되는 것 확인

### 과제 3: 실전 Conventional Commits 연습

간단한 기능 구현(Hello World API, 할일 목록 CRUD 등 자유 선택)을 진행하며 다음 조건을 모두 충족하는 커밋 히스토리를 만듭니다.

- `feat:` 커밋 1개 이상
- `test:` 커밋 1개 이상
- `fix:` 커밋 1개 이상 (의도적으로 버그를 만들고 수정)
- `docs:` 커밋 1개 (README 업데이트)

PR을 생성하고 Copilot Code Review를 활성화해 AI 리뷰 결과를 확인합니다.

**체크포인트**:
- [ ] `git log --oneline` 결과가 Conventional Commits 형식을 따르는 것 확인
- [ ] Copilot Code Review 코멘트 1개 이상 수신
- [ ] 해당 코멘트에 응답(resolve 또는 반론)

---

## 13. 현업 팁

**1. Signed Commits (필수 설정 권장)**

서명된 커밋은 "이 커밋이 정말 나(또는 이 시스템)에서 왔음"을 암호학적으로 증명합니다. GitHub에서 커밋 옆에 "Verified" 배지가 표시됩니다.

```bash
# GPG 키 생성
gpg --full-generate-key  # RSA 4096bit 권장

# 키 ID 확인
gpg --list-secret-keys --keyid-format=long

# Git에 키 등록
git config --global user.signingkey <KEY_ID>
git config --global commit.gpgsign true

# GitHub에 공개 키 등록
gpg --armor --export <KEY_ID>
# 출력 결과를 Settings > SSH and GPG keys > New GPG key에 붙여넣기
```

SSH 키로도 서명할 수 있습니다 (Git 2.34+ 이상):

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

**2. gh CLI로 PR 워크플로 가속화**

```bash
# 현재 브랜치에서 바로 PR 생성
gh pr create --fill  # 커밋 메시지를 PR 제목/본문으로 자동 채우기

# PR 목록 확인
gh pr list --assignee @me

# 리뷰 상태 확인
gh pr status

# PR 체크 상태 확인
gh pr checks

# 승인된 PR 머지
gh pr merge --squash --delete-branch
```

**3. git aliases로 반복 명령 단축**

```bash
git config --global alias.sw 'switch'
git config --global alias.lg 'log --oneline --graph --decorate --all'
git config --global alias.st 'status -sb'
git config --global alias.aa 'add --all'
git config --global alias.cm 'commit -m'
git config --global alias.pushf 'push --force-with-lease'  # 안전한 force push
```

```bash
# 사용 예시
git sw -c feat/#123-new-feature
git lg  # 브랜치 그래프 보기
```

**4. force-with-lease 습관화**

리베이스 후 푸시할 때는 `--force` 대신 `--force-with-lease`를 사용하세요. 다른 사람이 그 사이에 커밋을 올렸다면 푸시를 거부해 다른 사람의 작업을 덮어쓰는 사고를 방지합니다.

**5. PR 크기를 자동으로 추적하기**

```bash
# PR diff 크기를 확인하는 alias
git config --global alias.diffsize '!git diff --stat | tail -1'

# 현재 브랜치와 main의 diff 크기 확인
git diff main --stat | tail -1
```

300줄을 넘는다면 PR을 나누는 것을 고려하세요.

**6. Stale 브랜치 정리**

```bash
# 원격에서 삭제된 브랜치 참조 정리
git fetch --prune

# 로컬에서 main에 이미 머지된 브랜치 삭제
git branch --merged main | grep -v "main\|master\|develop" | xargs git branch -d
```

**7. 리뷰 요청 전 셀프 체크 루틴**

리뷰어에게 보내기 전 본인이 먼저 PR diff를 GitHub UI에서 읽어보세요. 에디터에서 작성할 때와 다른 시각으로 코드를 보게 되어 스스로 문제를 발견하는 경우가 많습니다. "내가 처음 보는 코드라면 이해할 수 있는가?"를 기준으로 체크합니다.

---

## 14. 다음 단계

이 챕터에서 리포지토리를 안전하게 관리하는 규칙과 워크플로를 배웠습니다. PR을 만들어 머지했다면, 이제 그 머지를 자동으로 빌드하고 테스트하고 배포하는 파이프라인이 필요합니다.

다음 챕터에서는 **GitHub Actions**로 이 모든 과정을 자동화하는 방법을 배웁니다.

---

> **다음 챕터**: [`ch05_GitHub_Actions_기초.md`](./ch05_GitHub_Actions_기초.md)
>
> 브랜치 보호 규칙에서 설정한 "Required status checks"를 실제로 만들고, PR이 생성될 때마다 자동으로 테스트를 실행하는 워크플로를 작성합니다.

---

*마지막 업데이트: 2026-08 | Ai-Advanced 커리큘럼 Ch.4*
