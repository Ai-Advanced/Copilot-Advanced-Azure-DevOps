# ⚙️ Chapter 2. Copilot 실전 코딩

> **소요 시간**: 60분
> **난이도**: 🟢 초급
> **선수 과목**: [Chapter 1. Copilot 소개 및 시작하기](./ch01_Copilot_소개_및_시작하기.md)

---

## 학습 목표

이 챕터를 마치면 다음을 할 수 있습니다.

- [ ] Inline Suggestions, Chat, Edit, Agent 4가지 모드의 차이를 설명하고 상황에 맞게 선택할 수 있다
- [ ] 좋은 컨텍스트를 만들어 Copilot의 Inline 제안 품질을 높일 수 있다
- [ ] `@workspace`, `@vscode`, `@terminal` 참여자(participant)와 슬래시 명령어를 실전에 적용할 수 있다
- [ ] Edit 모드로 여러 파일을 한 번에 수정하고 변경 사항을 검토·승인할 수 있다
- [ ] Agent 모드로 라우터·컨트롤러·테스트를 한 번에 자동 생성할 수 있다
- [ ] `/tests` 명령어와 Agent 조합으로 Jest / pytest 테스트를 자동 생성할 수 있다

---

## 1. 4가지 모드 개요

GitHub Copilot은 하나의 도구가 아닙니다. 상황에 따라 골라 쓰는 **4가지 모드**가 있고, 올바른 선택이 생산성 차이를 만듭니다.

### 모드 요약표

| 모드 | 진입 방법 | 적합한 상황 | 파일 편집 범위 |
| :--- | :--- | :--- | :--- |
| **Inline Suggestions** | 에디터에서 코드 입력 (자동 트리거) | 함수 구현, 보일러플레이트 작성 | 현재 커서 위치 |
| **Copilot Chat** | `Ctrl+Alt+I` / 사이드바 아이콘 | 질문, 설명 요청, 빠른 수정 제안 | 제안만 함, 직접 적용은 수동 |
| **Copilot Edit** | Chat 패널 상단 "Edit" 탭 또는 `Ctrl+Shift+I` | 여러 파일 동시 수정, 마이그레이션 | 선택한 여러 파일 |
| **Copilot Agent** | Chat에서 "Agent" 모드 선택 | 복잡한 다단계 작업, 터미널 실행 포함 | 프로젝트 전체 (자율 결정) |

> **선택 기준 한 줄 요약**: 타이핑하다 자연스럽게 완성이 필요하면 **Inline**, 질문·설명이면 **Chat**, 여러 파일 동시 수정이면 **Edit**, 스텝이 3개 이상이면 **Agent**.

---

## 2. Inline Suggestions 심화

### 2.1 트리거 방법과 Ghost Text

Inline Suggestions는 코드를 입력하는 순간 자동으로 활성화됩니다. VS Code에서 회색으로 나타나는 미리보기 텍스트를 **Ghost Text**라고 부릅니다.

| 동작 | 단축키 |
| :--- | :--- |
| 제안 수락 | `Tab` |
| 단어 단위 수락 | `Ctrl+Right` (macOS: `Cmd+Right`) |
| 제안 거절 | `Esc` |
| 다음 대안 보기 | `Alt+]` (macOS: `Option+]`) |
| 이전 대안 보기 | `Alt+[` (macOS: `Option+[`) |
| 모든 대안 패널 열기 | `Ctrl+Enter` |

**Multi-line 제안** 받기: 함수 시그니처와 주석을 작성한 뒤 줄바꿈하면 Copilot이 함수 본문 전체를 한 번에 제안합니다. 제안이 마음에 들지 않으면 `Alt+]`로 대안을 순회하세요.

### 2.2 좋은 컨텍스트 만드는 법

Copilot은 현재 열려 있는 파일과 탭을 컨텍스트로 삼습니다. 품질 좋은 제안을 받으려면 다음 세 가지를 신경 쓰세요.

**파일명**: `utils.js`보다 `dateFormatter.js`처럼 구체적인 이름이 훨씬 좋습니다. Copilot이 파일명에서 의도를 유추합니다.

**임포트 선언**: 파일 상단에 사용할 라이브러리를 미리 `import`해 두면 Copilot이 해당 API를 적극 활용한 코드를 제안합니다.

**주석**: 함수 바로 위에 JSDoc 또는 한 줄 설명 주석을 달면 제안 정확도가 크게 올라갑니다.

```js
// dateFormatter.js 상단에 미리 선언
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * ISO 8601 날짜 문자열을 한국식 표기로 변환합니다.
 * @param {string} isoString - 변환할 ISO 날짜 문자열
 * @param {string} [pattern='yyyy년 MM월 dd일'] - 출력 패턴
 * @returns {string} 포맷된 날짜 문자열, 유효하지 않으면 빈 문자열
 */
// 여기서 Enter 누르면 Copilot이 함수 본문 전체를 제안합니다
```

**열린 탭**: 관련 파일(타입 정의, 인터페이스)을 같이 열어두면 Copilot이 타입을 정확히 추론합니다.

### 2.3 실전 예제 1: 유틸 함수 작성 (JavaScript)

**시나리오**: API 응답 배열에서 중복을 제거하고 특정 키로 정렬하는 유틸 함수가 필요합니다.

**프롬프트 (주석으로 입력)**

```js
// apiResponse.js

/**
 * 객체 배열에서 주어진 키를 기준으로 중복을 제거하고 오름차순 정렬합니다.
 * @param {Object[]} arr - 원본 배열
 * @param {string} key - 중복 제거 및 정렬 기준 키
 * @returns {Object[]} 중복 제거 후 정렬된 배열
 */
```

**Copilot 응답 (요약)**: `Map`을 사용해 마지막으로 등장한 항목을 보존하며 중복을 제거하고, 이후 `localeCompare`로 정렬하는 구현을 제안합니다.

**결과 코드**

```js
// apiResponse.js
/**
 * 객체 배열에서 주어진 키를 기준으로 중복을 제거하고 오름차순 정렬합니다.
 * @param {Object[]} arr - 원본 배열
 * @param {string} key - 중복 제거 및 정렬 기준 키
 * @returns {Object[]} 중복 제거 후 정렬된 배열
 */
export function deduplicateAndSort(arr, key) {
  const map = new Map();
  for (const item of arr) {
    map.set(item[key], item);
  }
  return [...map.values()].sort((a, b) =>
    String(a[key]).localeCompare(String(b[key]))
  );
}

// 사용 예
const users = [
  { id: 'u2', name: 'Bob' },
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bobby' }, // id 중복 → 마지막 항목(Bobby)이 남음
];

console.log(deduplicateAndSort(users, 'id'));
// [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bobby' }]
```

> **팁**: `Ctrl+Enter`로 모든 대안을 패널에서 한꺼번에 보고, 가장 마음에 드는 구현을 선택하세요. Map 대신 `reduce`나 `filter` 기반 구현 등 여러 스타일이 나옵니다.

---

## 3. Copilot Chat 활용

### 3.1 Chat 열기

- **사이드바 Copilot 아이콘** 클릭
- 단축키: `Ctrl+Alt+I` (macOS: `Ctrl+Cmd+I`)
- 에디터 우클릭 후 "Copilot" 메뉴에서 인라인 Chat(`Ctrl+I`)을 열 수도 있습니다

### 3.2 참여자 (Participants)

Chat 메시지에서 `@`로 시작하는 참여자는 특정 컨텍스트를 Chat에 주입합니다.

| 참여자 | 역할 |
| :--- | :--- |
| `@workspace` | 리포지토리 전체 코드베이스를 컨텍스트로 추가. "이 프로젝트에서 인증을 어떻게 처리하나요?" 같은 질문에 적합 |
| `@vscode` | VS Code 자체 설정·확장·기능에 관한 질문. "디버그 설정 만들어줘" 등 |
| `@terminal` | 터미널 마지막 출력을 컨텍스트로 전달. 에러 로그를 그대로 붙여 "이 오류 왜 났어?" 라고 물을 수 있음 |
| `@github` | GitHub.com 이슈·PR·커밋 데이터 참조 (GitHub Copilot Enterprise 플랜) |

### 3.3 슬래시 명령어

| 명령어 | 동작 |
| :--- | :--- |
| `/explain` | 선택한 코드의 동작을 자연어로 설명 |
| `/fix` | 버그·오류를 분석하고 수정 코드를 제안 |
| `/tests` | 선택한 코드에 대한 단위 테스트 생성 |
| `/doc` | JSDoc / docstring 주석 자동 생성 |
| `/new` | 새 파일·프로젝트 스캐폴딩 생성 |

> **주의**: 위 목록은 2025~2026년 VS Code Copilot Chat에 실제로 존재하는 명령어입니다. 존재하지 않는 명령어를 입력하면 Chat이 일반 텍스트로 응답합니다.

### 3.4 실전 예제 2: `@workspace`로 코드베이스 이해 및 리팩터링 제안

**시나리오**: 새로 합류한 팀에서 레거시 Express.js 프로젝트를 파악해야 합니다.

**프롬프트 1: 전체 구조 파악**

```
@workspace 이 프로젝트에서 인증(authentication)은 어떻게 구현되어 있나요?
미들웨어 파일과 핵심 로직이 어디에 있는지 알려주세요.
```

**Copilot 응답 (요약)**: `src/middleware/auth.js`에서 JWT 검증을 처리하고 있으며, `src/routes/index.js`에서 미들웨어를 라우터에 연결하고 있다고 파일 경로와 코드 위치를 함께 설명합니다.

**프롬프트 2: 리팩터링 제안**

```
@workspace src/middleware/auth.js 의 토큰 검증 로직이 중복됩니다.
공통 함수로 추출하고 에러 처리도 개선해주세요.
```

**Copilot 응답 (요약)**: 중복된 `jwt.verify` 호출을 `verifyToken(token)` 헬퍼 함수로 추출하고, 에러 타입별로 분기하는 개선 코드를 제안합니다.

**결과 코드 (Copilot 제안 기반)**

```js
// src/middleware/auth.js

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT 토큰을 검증하고 페이로드를 반환합니다.
 * @param {string} token
 * @returns {{ userId: string, role: string }}
 * @throws {Error} 토큰이 유효하지 않거나 만료된 경우
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw Object.assign(new Error('토큰이 만료되었습니다.'), { statusCode: 401 });
    }
    throw Object.assign(new Error('유효하지 않은 토큰입니다.'), { statusCode: 403 });
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  try {
    req.user = verifyToken(authHeader.slice(7));
    next();
  } catch (err) {
    res.status(err.statusCode ?? 401).json({ message: err.message });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    next();
  };
}
```

> **팁**: Chat 응답에 있는 코드 블록 우측 상단 "Apply in Editor" 버튼을 누르면 해당 파일에 바로 적용됩니다. 수동 복사 없이 한 번에 적용하세요.

---

## 4. Copilot Edit (다중 파일 편집)

### 4.1 Chat과의 차이점

| 구분 | Copilot Chat | Copilot Edit |
| :--- | :--- | :--- |
| 편집 범위 | 제안을 채팅으로 보여줌, 직접 적용은 수동 | 선택한 파일들을 직접 수정 |
| 파일 선택 | 불가 (열린 파일 컨텍스트만) | 여러 파일 명시적 선택 가능 |
| 변경 검토 | 채팅 메시지 내에서 비교 | diff 뷰어로 파일별 변경 전후 비교 |
| 적합한 작업 | 코드 설명, 질문, 단순 수정 | 마이그레이션, 리팩터링, 다중 파일 동시 변경 |

### 4.2 Edit 모드 진입 방법

1. **Chat 패널 상단**에서 "Chat" 탭 옆 **"Edit"** 탭 클릭
2. 단축키: `Ctrl+Shift+I` (macOS: `Cmd+Shift+I`)
3. 편집할 파일을 "+" 버튼으로 추가하거나 에디터에서 파일을 열어 자동 포함

### 4.3 변경 승인 프로세스

Edit 요청을 실행하면 Copilot이 각 파일을 수정합니다. 완료 후 다음 흐름으로 검토합니다.

```
Edit 요청 제출
    ↓
Copilot이 파일 수정 (diff 생성)
    ↓
파일별 diff 뷰어에서 변경 전후 확인
    ↓
[Accept All] 또는 파일별 [Accept] / [Discard]
    ↓
적용 완료 → 테스트 실행
```

> 마음에 들지 않는 파일만 **Discard**하고 나머지는 **Accept**할 수 있습니다. 파일 단위, 블록 단위 선택 승인이 가능합니다.

### 4.4 실전 예제 3: React 컴포넌트를 TypeScript로 마이그레이션

**시나리오**: JavaScript로 작성된 React 컴포넌트 2개를 TypeScript로 마이그레이션합니다.

**Edit 모드에 추가할 파일**: `src/components/UserCard.jsx`, `src/components/UserList.jsx`

**프롬프트**

```
위 두 파일을 TypeScript(.tsx)로 마이그레이션해주세요.
- props 타입을 interface로 정의할 것
- useState, useEffect에 타입 파라미터를 명시할 것
- any 타입은 사용하지 말 것
- 원본 .jsx 파일은 삭제하지 말고 .tsx를 새로 생성할 것
```

**Copilot 응답 (요약)**: `UserCard.tsx`와 `UserList.tsx`를 새로 생성하고, 각 파일에 `UserCardProps`, `UserListProps` 인터페이스를 추가하며, 훅에 적절한 제네릭 타입을 부여한 전체 코드를 생성합니다.

**결과 코드: `src/components/UserCard.tsx`**

```tsx
// src/components/UserCard.tsx

interface UserCardProps {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  onClick?: (userId: string) => void;
}

export function UserCard({ userId, name, email, avatarUrl, onClick }: UserCardProps) {
  return (
    <div
      className="user-card"
      onClick={() => onClick?.(userId)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {avatarUrl && <img src={avatarUrl} alt={`${name} 프로필`} className="avatar" />}
      <div className="user-info">
        <p className="user-name">{name}</p>
        <p className="user-email">{email}</p>
      </div>
    </div>
  );
}
```

**결과 코드: `src/components/UserList.tsx`**

```tsx
// src/components/UserList.tsx
import { useState, useEffect } from 'react';
import { UserCard } from './UserCard';

interface User {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UserListProps {
  onSelectUser?: (userId: string) => void;
}

export function UserList({ onSelectUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<User[]>;
      })
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>불러오는 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <ul className="user-list">
      {users.map((user) => (
        <li key={user.userId}>
          <UserCard {...user} onClick={onSelectUser} />
        </li>
      ))}
    </ul>
  );
}
```

> **팁**: Edit 완료 후 터미널에서 `npx tsc --noEmit`을 실행해 타입 오류가 없는지 확인하세요. Copilot이 놓친 타입 오류를 잡을 수 있습니다.

---

## 5. Copilot Agent Mode

### 5.1 Agent란?

Agent 모드는 Copilot이 **자율적으로 여러 단계**를 수행하는 모드입니다. 단순히 코드를 제안하는 것이 아니라, 파일을 읽고 수정하고, 터미널 명령을 실행하고, 결과를 확인한 뒤 다음 단계를 스스로 결정합니다.

### 5.2 Agent가 사용하는 도구 (Tools)

| 도구 | 설명 |
| :--- | :--- |
| 파일 읽기/쓰기 | 프로젝트 내 파일 탐색, 수정, 새 파일 생성 |
| 터미널 실행 | `npm install`, `pytest`, `git` 명령 실행 |
| 웹 검색 | 최신 API 문서, 패키지 버전 확인 (설정에 따라) |
| 코드 검색 | 프로젝트 내 심볼·패턴 검색 |

### 5.3 Agent 모드 진입

1. Chat 패널에서 드롭다운을 클릭해 **"Agent"** 선택
2. 또는 Chat 입력창 좌측 아이콘에서 모드 전환

### 5.4 인간의 승인 (Human Consent) 시점

Agent는 다음 시점에 **반드시 사용자 확인**을 요청합니다.

- 터미널에서 명령을 실행하기 전
- 외부 서비스 호출(웹 검색, API 요청) 전
- 삭제 또는 덮어쓰기를 수행하기 전

각 단계에서 **"Allow"** 또는 **"Deny"**를 선택할 수 있습니다. Agent가 어떤 의도로 해당 명령을 실행하려는지 설명을 보여주므로, 이해하고 승인하는 습관을 가지세요.

> **중요**: Agent 모드라도 최종 결정권은 항상 개발자에게 있습니다. 자동화를 신뢰하되 맹목적으로 허용하지 마세요.

### 5.5 실전 예제 4: 새 API 엔드포인트 자동 생성

**시나리오**: Express.js + TypeScript 프로젝트에 `POST /api/products` 엔드포인트가 필요합니다. 라우터, 컨트롤러, 서비스, 테스트 파일까지 한 번에 만들어야 합니다.

**프롬프트**

```
@workspace 이 프로젝트에 POST /api/products 엔드포인트를 추가해줘.
- 기존 라우터 패턴과 동일하게 구현할 것 (src/routes/ 참고)
- 컨트롤러(src/controllers/), 서비스(src/services/) 레이어 분리
- 요청 바디: { name: string, price: number, stock: number }
- 유효성 검사: name은 필수, price와 stock은 0 이상
- Jest 단위 테스트도 함께 생성 (src/tests/)
- 필요한 패키지가 있으면 npm install까지 실행해줘
```

**Agent 수행 흐름 (요약)**

```
1. src/routes/ 파일 탐색 → 기존 패턴 확인
2. src/controllers/productController.ts 생성
3. src/services/productService.ts 생성
4. src/routes/productRouter.ts 생성
5. src/app.ts에 라우터 등록 (기존 파일 수정)
6. [사용자 승인 요청] npm install zod --save 실행
7. src/tests/productController.test.ts 생성
8. [사용자 승인 요청] npx jest src/tests/productController.test.ts 실행
9. 테스트 결과 확인 후 완료 보고
```

**결과 코드: `src/controllers/productController.ts`**

```ts
// src/controllers/productController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/productService';

const createProductSchema = z.object({
  name: z.string().min(1, '상품명은 필수입니다.'),
  price: z.number().min(0, '가격은 0 이상이어야 합니다.'),
  stock: z.number().int().min(0, '재고는 0 이상 정수여야 합니다.'),
});

export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const product = await productService.create(parsed.data);
  res.status(201).json(product);
}
```

**결과 코드: `src/services/productService.ts`**

```ts
// src/services/productService.ts

interface CreateProductInput {
  name: string;
  price: number;
  stock: number;
}

interface Product extends CreateProductInput {
  id: string;
  createdAt: Date;
}

// 실제 프로젝트에서는 DB 레이어로 교체하세요
const products: Product[] = [];

export const productService = {
  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date(),
    };
    products.push(product);
    return product;
  },

  async findAll(): Promise<Product[]> {
    return products;
  },
};
```

**결과 코드: `src/tests/productController.test.ts`**

```ts
// src/tests/productController.test.ts
import request from 'supertest';
import app from '../app';

describe('POST /api/products', () => {
  it('유효한 데이터로 상품을 생성한다', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: '테스트 상품', price: 9900, stock: 50 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: '테스트 상품', price: 9900, stock: 50 });
    expect(res.body.id).toBeDefined();
  });

  it('name이 없으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ price: 9900, stock: 50 });

    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('price가 음수면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: '상품', price: -1, stock: 10 });

    expect(res.status).toBe(400);
  });
});
```

---

## 6. 테스트 코드 자동 생성

### 6.1 `/tests` 명령어 활용

Chat에서 테스트할 함수나 파일을 선택(드래그)하거나 `#editor`로 현재 파일을 참조한 뒤 `/tests`를 입력하면 됩니다.

```
/tests #editor
```

Copilot은 파일에서 export된 함수와 클래스를 자동으로 파악하고 기본적인 단위 테스트를 생성합니다.

### 6.2 Jest 예제 (Node.js/TypeScript)

**프롬프트**

```
/tests #editor
- jest와 supertest 사용
- 성공 케이스, 경계값, 에러 케이스를 모두 포함할 것
- describe/it 블록으로 구조화할 것
```

**결과 코드: `src/utils/dateFormatter.test.ts`**

```ts
// src/utils/dateFormatter.test.ts
import { formatKoreanDate } from './dateFormatter';

describe('formatKoreanDate', () => {
  describe('정상 케이스', () => {
    it('ISO 날짜를 한국식 표기로 변환한다', () => {
      expect(formatKoreanDate('2025-03-15')).toBe('2025년 03월 15일');
    });

    it('커스텀 패턴을 적용한다', () => {
      expect(formatKoreanDate('2025-03-15', 'yy/MM/dd')).toBe('25/03/15');
    });
  });

  describe('경계값', () => {
    it('연초(1월 1일)를 처리한다', () => {
      expect(formatKoreanDate('2025-01-01')).toBe('2025년 01월 01일');
    });

    it('연말(12월 31일)을 처리한다', () => {
      expect(formatKoreanDate('2025-12-31')).toBe('2025년 12월 31일');
    });
  });

  describe('에러 케이스', () => {
    it('유효하지 않은 날짜는 빈 문자열을 반환한다', () => {
      expect(formatKoreanDate('not-a-date')).toBe('');
    });

    it('빈 문자열은 빈 문자열을 반환한다', () => {
      expect(formatKoreanDate('')).toBe('');
    });
  });
});
```

### 6.3 pytest 예제 (Python)

**프롬프트**

```
아래 Python 함수에 대한 pytest 테스트를 작성해줘.
- parametrize로 경계값을 커버할 것
- 예외 테스트도 포함할 것

def calculate_discount(price: float, rate: float) -> float:
    if not (0 <= rate <= 1):
        raise ValueError(f"할인율은 0~1 사이여야 합니다. 입력값: {rate}")
    return round(price * (1 - rate), 2)
```

**결과 코드: `tests/test_discount.py`**

```python
# tests/test_discount.py
import pytest
from src.utils.pricing import calculate_discount


@pytest.mark.parametrize("price, rate, expected", [
    (10000, 0.1,  9000.0),   # 10% 할인
    (10000, 0.0,  10000.0),  # 할인 없음
    (10000, 1.0,  0.0),      # 100% 할인
    (9999,  0.33, 6699.33),  # 소수점 반올림
    (0,     0.5,  0.0),      # 가격 0
])
def test_calculate_discount_normal(price, rate, expected):
    assert calculate_discount(price, rate) == expected


@pytest.mark.parametrize("rate", [-0.01, 1.01, 2.0, -1.0])
def test_calculate_discount_invalid_rate(rate):
    with pytest.raises(ValueError, match="할인율은 0~1 사이여야 합니다"):
        calculate_discount(10000, rate)
```

### 6.4 Agent + `/tests` 조합

Agent 모드에서 `/tests`를 함께 쓰면 테스트 파일 생성 후 테스트 실행까지 자동으로 수행합니다.

```
@workspace src/services/productService.ts 의 모든 public 메서드에 대한
Jest 테스트를 작성하고 npm test 로 실행해줘. 실패한 테스트가 있으면
원인을 분석해서 함께 수정해줘.
```

Agent는 테스트 파일 생성 후 `npm test`를 실행하고 실패 시 스택 트레이스를 분석해 소스 코드 또는 테스트를 수정합니다.

---

## 7. 리팩터링 실전

### 7.1 상황별 도구 선택

| 상황 | 추천 도구 | 이유 |
| :--- | :--- | :--- |
| 단일 함수의 명백한 버그 수정 | `/fix` (Chat) | 빠르고 정확, 수정 범위가 제한적 |
| 한 파일 전체를 다른 스타일로 변경 | Edit | diff 뷰어로 파일 전체를 검토 가능 |
| 여러 파일에 걸친 패턴 변경 | Edit (다중 파일 선택) | 파일별 승인 가능 |
| 설계 개선 + 테스트 재작성 + 린트 수정 | Agent | 자율 다단계 수행, 터미널 실행 포함 |

### 7.2 `/fix` 활용

에디터에서 버그가 있는 코드를 선택하고 Chat에서 `/fix`를 입력합니다.

```
/fix
이 함수에서 비동기 에러가 잡히지 않는 경우가 있습니다.
```

Copilot은 `try/catch` 누락, `Promise` 체이닝 오류, `async/await` 혼용 문제 등을 탐지하고 수정 코드를 제안합니다.

### 7.3 Code Smell 감지 프롬프트 예시

```
@workspace 이 프로젝트에서 다음 코드 스멜(code smell)을 찾아주세요.
1. 함수가 너무 길거나 책임이 너무 많은 경우 (God Function)
2. 중복 로직이 3곳 이상 반복되는 경우 (DRY 위반)
3. 매직 넘버(magic number)가 상수로 추출되지 않은 경우
4. 에러 처리가 없는 async 함수

각 항목마다 파일명과 라인 번호를 함께 알려주세요.
```

Copilot은 `@workspace` 인덱스를 활용해 파일 전체를 검색하고 해당 위치를 링크와 함께 보고합니다.

### 7.4 리팩터링 후 검증 체크리스트

```
리팩터링 완료 후 반드시 확인:
- [ ] 기존 테스트 모두 통과 (npm test / pytest)
- [ ] 타입 검사 통과 (npx tsc --noEmit)
- [ ] 린트 통과 (npm run lint)
- [ ] 변경 전후 동작 동일 확인 (수동 또는 E2E 테스트)
```

---

## 8. 실습 과제

아래 3가지 과제를 직접 수행해보세요. 각 과제는 실제 현업에서 자주 마주치는 시나리오입니다.

### 과제 1: 유틸 라이브러리 작성 (Inline + Chat)

1. `src/utils/stringHelper.ts` 파일을 새로 만드세요.
2. JSDoc 주석만 작성한 뒤 Inline Suggestions로 다음 함수를 구현하세요.
   - `truncate(str, maxLength)`: 문자열을 maxLength로 자르고 `...` 추가
   - `slugify(str)`: 한국어 포함 문자열을 URL 슬러그로 변환
   - `maskEmail(email)`: `user@example.com` → `u***@example.com`
3. Chat에서 `/tests`로 테스트 파일을 생성하고 통과시키세요.

**완료 기준**: `npm test` 또는 `pytest`가 녹색으로 통과

### 과제 2: 레거시 코드 마이그레이션 (Edit 모드)

1. 다음 JavaScript 파일을 Edit 모드로 TypeScript로 변환하세요.

```js
// src/components/SearchBar.jsx (변환 전)
import { useState } from 'react';

export default function SearchBar({ onSearch, placeholder }) {
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || '검색어를 입력하세요'}
      />
      <button type="submit">검색</button>
    </form>
  );
}
```

2. 변환 후 `npx tsc --noEmit`으로 타입 오류가 없는지 확인하세요.

**완료 기준**: `.tsx` 파일 생성, 타입 오류 0개

### 과제 3: Agent로 CRUD 엔드포인트 생성

1. Agent 모드에서 다음 프롬프트를 실행하세요.

```
@workspace 이 Express + TypeScript 프로젝트에 Comment CRUD API를 추가해줘.
- GET /api/comments?postId=xxx
- POST /api/comments
- DELETE /api/comments/:id
기존 코드 패턴을 참고하고, zod 유효성 검사와 Jest 테스트까지 포함해줘.
```

2. Agent가 각 단계에서 사용자 승인을 요청할 때 어떤 내용인지 확인하며 진행하세요.
3. 최종적으로 `npm test`가 통과하는지 확인하세요.

**완료 기준**: 3개 엔드포인트 동작, 테스트 통과

---

## 9. 현업 팁

### 팁 1: `.copilotignore`로 민감한 파일 제외

`.gitignore`와 동일한 문법으로 작동합니다. Copilot이 컨텍스트로 읽지 않아야 할 파일을 지정하세요.

```
# .copilotignore
.env
.env.*
secrets/
*.pem
*.key
infra/terraform/
```

환경변수, 시크릿, 인프라 설정 파일은 Copilot 컨텍스트에서 제외하는 것이 보안상 안전합니다.

### 팁 2: 팀 프롬프트 라이브러리 관리

자주 쓰는 프롬프트는 `.github/copilot-instructions.md`에 팀 컨벤션으로 등록해두세요. 모든 팀원이 일관된 제안을 받을 수 있습니다.

```md
<!-- .github/copilot-instructions.md -->
## 코드 스타일
- TypeScript strict 모드 사용
- 에러 처리: `Result<T, E>` 패턴 또는 명시적 try/catch
- 비동기: async/await (Promise 체이닝 지양)

## 테스트
- 테스트 프레임워크: Jest + supertest
- 커버리지 목표: 80% 이상
- describe/it 구조, 한국어 설명 사용

## API 설계
- RESTful 컨벤션 준수
- 응답 형식: { data, message, statusCode }
- 유효성 검사: zod 사용
```

### 팁 3: PR 요약 자동 생성

GitHub PR 작성 시 "Copilot으로 요약 생성" 버튼을 누르면 diff를 분석해 PR 설명을 자동 작성합니다. Chat에서도 가능합니다.

```
@github 이 PR의 변경 사항을 한국어로 요약해줘.
영향을 받는 파일 목록과 주요 변경 이유를 포함해줘.
```

### 팁 4: 인라인 Chat으로 빠른 설명 요청

에디터에서 이해하기 어려운 코드를 선택한 뒤 `Ctrl+I`로 인라인 Chat을 열고 `/explain`을 입력하면, 별도 창 없이 에디터 안에서 바로 설명을 받을 수 있습니다.

### 팁 5: Ghost Text를 줄 단위로 수락

`Tab`을 누르면 제안 전체를 수락하지만, `Ctrl+Right`(macOS: `Cmd+Right`)를 반복하면 **단어 또는 토큰 단위**로 수락할 수 있습니다. 긴 제안의 앞부분만 원할 때 유용합니다.

### 팁 6: 여러 파일 동시에 열어 컨텍스트 확장

Copilot은 현재 열린 에디터 탭을 컨텍스트로 참고합니다. 관련 파일(인터페이스 정의, 타입 파일, 관련 서비스)을 모두 탭으로 열어두면 더 정확한 제안을 받을 수 있습니다.

### 팁 7: Agent 모드 "Always Allow" 설정 주의

자주 쓰는 명령(`npm test` 등)은 "Always Allow"로 설정해 매번 승인을 건너뛸 수 있지만, 삭제나 외부 서비스 호출 명령은 항상 수동 승인을 유지하세요. 실수로 승인한 명령은 되돌리기 어렵습니다.

---

## 정리

이 챕터에서 배운 것을 한 줄씩 정리합니다.

| 모드 | 핵심 기억 포인트 |
| :--- | :--- |
| **Inline** | 주석과 파일명이 좋은 제안의 핵심. `Alt+]`로 대안 순회 |
| **Chat** | `@workspace`, `/explain`, `/fix`, `/tests`를 상황에 맞게 조합 |
| **Edit** | 다중 파일 마이그레이션·리팩터링. diff 뷰어로 반드시 검토 |
| **Agent** | 다단계 자율 작업. 각 단계 승인 흐름을 이해하고 사용 |

---

## 다음 단계

Copilot의 4가지 모드를 실전에서 쓸 수 있게 됐습니다. 다음 챕터에서는 팀 전체가 일관된 Copilot 경험을 갖도록 `copilot-instructions.md`를 설계하고, MCP 서버를 연결해 사내 DB와 API를 Copilot과 연동하는 방법을 배웁니다.

→ [`ch03_Copilot_고급_활용_Custom_Agents_MCP.md`](./ch03_Copilot_고급_활용_Custom_Agents_MCP.md)
