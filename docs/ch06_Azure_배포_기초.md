# ☁️ Chapter 6. Azure 배포 기초

> **소요 시간**: 50분
> **난이도**: 🟡 중급
> **선수 과목**: [Chapter 0. 사전 준비](./00_사전준비.md) (Azure CLI 로그인)

---

## 학습 목표

이 챕터를 마치면 다음 7가지를 할 수 있습니다.

1. Azure의 핵심 계층 구조(Region → Subscription → Resource Group → Resource)를 설명할 수 있다.
2. App Service, Container Apps, AKS 세 가지 컴퓨트 서비스 중 상황에 맞는 것을 고를 수 있다.
3. ACR, Key Vault, Application Insights 같은 지원 리소스의 역할을 이해한다.
4. Managed Identity와 Service Principal의 차이를 설명하고, OIDC Federated Credentials를 직접 만들 수 있다.
5. Azure CLI로 App Service 앱을 배포하고 삭제하는 전체 흐름을 실습한다.
6. Container Apps를 CLI로 생성하는 기본 흐름을 파악한다.
7. Bicep으로 인프라를 코드화하는 이유와 기초 문법을 이해한다.

---

## 1. Azure를 앱 개발자 시각으로 이해하기

### 1.1 핵심 계층 구조

Azure 리소스는 아래 네 단계 계층으로 구성됩니다. 처음에는 이 그림 하나만 기억해도 충분합니다.

```
Azure Tenant (조직 단위)
└── Subscription (청구 단위)
    └── Resource Group (논리적 묶음)
        └── Resource (실제 서비스: App Service, ACR, DB 등)
```

**Region (지역)**은 계층 밖에 있지만 모든 리소스에 적용됩니다. 리소스를 만들 때 어느 지역 데이터센터에 올릴지 지정합니다. 이 커리큘럼에서는 주로 `koreacentral`(서울)을 사용합니다.

| 계층 | 역할 | 예시 |
|---|---|---|
| Subscription | 청구·권한 경계 | `Azure for Students`, `Pay-As-You-Go` |
| Resource Group | 라이프사이클 묶음 | `rg-copilot-training` |
| Resource | 실제 서비스 단위 | `app-copilot-api`, `acr-copilotdev` |

> **실무 팁**: Resource Group을 잘 설계하면 `az group delete` 한 줄로 실습 전체를 깔끔하게 정리할 수 있습니다. 프로젝트 단위 또는 환경(dev/staging/prod) 단위로 나누는 게 일반적입니다.

### 1.2 Azure Portal vs Azure CLI vs Bicep/Terraform

세 가지 도구는 목적이 다릅니다. 상황에 따라 골라 쓰세요.

| 도구 | 언제 쓰나 | 장점 | 단점 |
|---|---|---|---|
| **Azure Portal** | 처음 둘러볼 때, 빠른 확인 | 시각적, 즉시 피드백 | 반복 작업 불가, 재현 어려움 |
| **Azure CLI** | 빠른 실험, 스크립트 자동화 | 빠르고 가볍다 | 상태 관리 없음 |
| **Bicep / Terraform** | 운영 환경, CI/CD 파이프라인 | 선언형, 재현 가능, 코드 리뷰 가능 | 초기 학습 곡선 |

이 커리큘럼에서는 CLI로 실습하고, 챕터 후반부에서 Bicep을 맛보기로 다룹니다. 운영 수준의 IaC는 별도 심화 과정에서 다룹니다.

### 1.3 명명 규칙과 태그 전략

Azure 리소스 이름은 서비스마다 길이·문자 제한이 다릅니다. 팀 전체가 동일한 규칙을 쓰지 않으면 관리가 금세 복잡해집니다. 아래는 Microsoft 권장 패턴을 바탕으로 한 예시입니다.

```
{서비스 약자}-{프로젝트명}-{환경}-{숫자}
```

**서비스 약자 예시**

| 서비스 | 접두사 |
|---|---|
| Resource Group | `rg-` |
| App Service | `app-` |
| Container Apps Environment | `cae-` |
| Container Apps | `ca-` |
| Azure Container Registry | `acr` (하이픈 없음, 소문자만) |
| Key Vault | `kv-` |
| Log Analytics Workspace | `law-` |
| Storage Account | `st` (하이픈 없음, 소문자+숫자만, 3~24자) |

**실제 예시**

```
rg-copilot-training-dev
app-copilot-api-dev
cae-copilot-dev
acr-copilotdev
kv-copilot-dev
```

**태그 전략**

태그는 비용 분석, 정책 적용, 자동화에 활용됩니다. 최소한 아래 세 개는 모든 리소스에 붙이는 걸 권장합니다.

```bash
--tags Environment=dev Project=copilot-training Owner=devteam
```

---

## 2. 앱 배포용 3대 컴퓨트 서비스

### 2.1 Azure App Service

**한 줄 요약**: 코드(또는 컨테이너)를 올리면 Azure가 OS, 런타임, 패치를 관리해주는 완전 관리형 PaaS입니다.

**언제 최고인가**
- 웹 API, 백엔드 서비스, 소규모 웹 앱
- 컨테이너보다 코드 배포(git push, zip deploy)가 더 자연스러운 팀
- Deployment Slots(Blue/Green)이 필요한 상황

**App Service Plan 요금제 비교**

| 플랜 | vCPU | RAM | 슬롯 수 | 자동 확장 | 월 예상 비용 |
|---|---|---|---|---|---|
| **Free (F1)** | 공유 | 1 GB | 1 | 없음 | 무료 |
| **Basic (B1)** | 1 | 1.75 GB | 1 | 수동만 | ~$13 |
| **Standard (P0v3)** | 1 | 4 GB | 5 | 자동 확장 | ~$42 |
| **Premium (P1v3)** | 2 | 8 GB | 20 | 자동 확장 | ~$86 |

> 실습에서는 Free(F1) 또는 B1을 사용합니다. 실습 후 반드시 삭제하세요.

**Deployment Slots**

Staging 슬롯에 먼저 배포하고 검증한 뒤, `swap`으로 프로덕션에 무중단 전환하는 방식입니다.

```bash
# 슬롯 생성
az webapp deployment slot create \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training \
  --slot staging

# 슬롯 스왑 (staging → production)
az webapp deployment slot swap \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training \
  --slot staging \
  --target-slot production
```

**자동 확장 (Autoscale)**

Standard 플랜 이상에서 CPU 사용률 기반 자동 확장 규칙을 설정할 수 있습니다.

```bash
az monitor autoscale create \
  --resource-group rg-copilot-training \
  --resource app-copilot-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name as-copilot-api \
  --min-count 1 --max-count 5 --count 1
```

---

### 2.2 Azure Container Apps

**한 줄 요약**: 컨테이너를 서버리스로 실행하는 서비스입니다. 요청이 없으면 0대로 스케일 다운되고, 요청이 들어오면 자동으로 늘어납니다.

**핵심 개념**

- **Environment (환경)**: 여러 Container App이 공유하는 네트워크·로그 범위.
- **Revision (리비전)**: 앱 설정이 바뀔 때마다 새 리비전이 생성됩니다. 이전 리비전으로 즉시 롤백 가능.
- **KEDA (Kubernetes Event-Driven Autoscaling)**: HTTP 요청 수, 메시지 큐 길이, CPU 등 다양한 지표로 인스턴스를 0개까지 줄일 수 있습니다. 트래픽이 거의 없는 개발 환경에서 비용 절약 효과가 큽니다.
- **Ingress**: 외부 HTTP 트래픽을 앱으로 라우팅하는 설정. `--ingress external --target-port 8080` 처럼 지정합니다.

**요금 모델**

요청 수와 실행 시간(vCPU-초, GiB-초) 단위로 과금됩니다. 트래픽이 없으면 거의 비용이 발생하지 않아 개발·스테이징 환경에 유리합니다.

---

### 2.3 Azure Kubernetes Service (AKS)

**한 줄 요약**: 완전 관리형 Kubernetes 클러스터입니다. 복잡한 마이크로서비스, 대규모 트래픽, 세밀한 네트워크 정책이 필요한 조직에 적합합니다.

이 커리큘럼에서는 AKS를 직접 실습하지 않습니다. "이런 게 있다"는 맥락 파악 수준으로만 다룹니다. AKS는 진입 난이도가 가장 높고, 소규모 팀·앱에는 오버엔지니어링이 될 수 있습니다.

---

### 2.4 3서비스 비교표

| 항목 | App Service | Container Apps | AKS |
|---|---|---|---|
| **배포 단위** | 코드 / 컨테이너 | 컨테이너 | 컨테이너 (Pod) |
| **진입 난이도** | 낮음 | 중간 | 높음 |
| **Scale-to-zero** | 불가 (Free 제외) | 가능 (KEDA) | 가능 (설정 필요) |
| **자동 확장** | CPU/메모리 기반 | HTTP/이벤트/CPU 기반 | 다양한 방식 |
| **관리 부담** | 매우 낮음 | 낮음 | 높음 |
| **요금 예상 (소규모)** | ~$0~$86/월 | 사용량 기반, 거의 0 가능 | 노드 VM 비용 |
| **적합한 사용 사례** | 전통적 웹 API, CMS | 마이크로서비스, 이벤트 처리 | 대규모 복잡 시스템 |

### 2.5 의사결정 트리

```
앱을 배포해야 한다
│
├─ 컨테이너 없이 코드만 배포하고 싶다
│   └─ → App Service
│
├─ 컨테이너로 배포하고 싶다
│   ├─ 트래픽이 불규칙하고 비용을 최소화하고 싶다
│   │   └─ → Container Apps
│   │
│   ├─ 여러 서비스가 복잡하게 통신하고, 팀이 Kubernetes에 익숙하다
│   │   └─ → AKS
│   │
│   └─ 아직 잘 모르겠다
│       └─ → Container Apps (가장 무난한 시작점)
│
└─ 정적 파일만 서빙하면 된다
    └─ → Azure Static Web Apps (Storage + CDN)
```

---

## 3. 지원 리소스

### 3.1 Azure Container Registry (ACR)

Docker 이미지를 저장하고 관리하는 프라이빗 레지스트리입니다. Container Apps, AKS, App Service 모두 ACR에서 이미지를 pull합니다.

```bash
# ACR 생성 (이름은 전역 유일, 소문자+숫자만)
az acr create \
  --resource-group rg-copilot-training \
  --name acrcopilotdev \
  --sku Basic

# 로컬 이미지를 ACR로 push
az acr build \
  --registry acrcopilotdev \
  --image myapp:latest .
```

SKU는 Basic(개발용), Standard, Premium(geo-replication) 세 가지입니다. 실습에는 Basic으로 충분합니다.

### 3.2 Azure Key Vault

시크릿(API 키, 패스워드), 인증서, 암호화 키를 안전하게 저장합니다. 앱에서 직접 환경변수에 비밀을 넣지 말고 Key Vault를 통해 참조하는 게 현업 표준입니다. 상세 사용법은 **Chapter 9**에서 다룹니다.

```bash
az keyvault create \
  --name kv-copilot-dev \
  --resource-group rg-copilot-training \
  --location koreacentral
```

### 3.3 Application Insights

앱의 요청 수, 응답 시간, 실패율, 예외를 실시간으로 추적하는 APM(Application Performance Monitoring) 서비스입니다. App Service와 Container Apps 모두 연결 설정이 몇 줄로 끝납니다. 상세 설정은 **Chapter 9**에서 다룹니다.

### 3.4 Log Analytics Workspace

Container Apps, AKS, 다양한 Azure 서비스의 로그를 중앙에 수집·쿼리하는 저장소입니다. Application Insights의 데이터도 여기에 저장됩니다. KQL(Kusto Query Language)로 로그를 검색합니다.

```bash
az monitor log-analytics workspace create \
  --resource-group rg-copilot-training \
  --workspace-name law-copilot-dev \
  --location koreacentral
```

### 3.5 Azure Storage Account

Blob, 파일, 큐, 테이블 스토리지를 제공하는 범용 스토리지입니다. 정적 웹 앱 파일 서빙, 컨테이너 로그 보관, CI/CD 아티팩트 저장 등에 사용됩니다.

```bash
az storage account create \
  --name stcopilotdev \
  --resource-group rg-copilot-training \
  --location koreacentral \
  --sku Standard_LRS
```

### 3.6 Azure Database 옵션

| 서비스 | 특징 | 권장 상황 |
|---|---|---|
| **Azure SQL Database** | 완전 관리형 MS SQL | .NET 앱, 기존 SQL Server 마이그레이션 |
| **Azure Database for PostgreSQL** | 완전 관리형 PostgreSQL | 오픈소스 스택, Django, FastAPI 앱 |
| **Azure Cosmos DB** | 글로벌 분산, NoSQL | 초저지연, 다중 리전, JSON 문서 데이터 |

---

## 4. 인증(Authentication) & 권한(Authorization)

Chapter 7에서 GitHub Actions와 Azure를 연동할 때 이 개념들이 핵심입니다. 미리 이해해두면 7장이 훨씬 수월합니다.

### 4.1 Microsoft Entra ID (구 Azure AD)

Azure의 ID 관리 플랫폼입니다. 사람(사용자 계정), 앱(Service Principal, Managed Identity) 모두 Entra ID에서 관리됩니다. 이전 이름인 "Azure Active Directory(AAD)"로 알고 있다면, 2023년에 Entra ID로 브랜드가 바뀐 것입니다. 기능은 동일합니다.

주요 개념:

- **Tenant**: 조직 단위의 Entra ID 인스턴스. `az account show`로 `tenantId`를 확인할 수 있습니다.
- **App Registration**: 앱이 Entra ID에 등록된 형태. Client ID(Application ID)로 식별됩니다.
- **Service Principal**: App Registration의 실제 실행 주체. 특정 Subscription에 권한을 부여받습니다.

### 4.2 Service Principal vs Managed Identity

| 항목 | Service Principal (SP) | Managed Identity |
|---|---|---|
| **시크릿 관리** | Client Secret 또는 인증서 직접 관리 | Azure가 자동으로 관리 (시크릿 없음) |
| **사용 위치** | GitHub Actions, 로컬 스크립트, 외부 시스템 | Azure 리소스 내부 (App Service, VM, AKS 등) |
| **설정 복잡도** | 중간 | 낮음 |
| **권장 시나리오** | 외부에서 Azure 접근이 필요할 때 | Azure 리소스끼리 통신할 때 |

**Managed Identity**는 App Service나 Container Apps에서 Key Vault, ACR, Storage에 접근할 때 사용합니다. 앱 코드에 시크릿을 넣지 않아도 됩니다.

```bash
# App Service에 Managed Identity 활성화
az webapp identity assign \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training
```

### 4.3 Federated Identity Credentials (OIDC)

GitHub Actions에서 Azure에 로그인할 때, 예전에는 Client Secret을 GitHub Secrets에 저장했습니다. 이 방식은 시크릿 유출 위험이 있고 만료 관리가 번거롭습니다.

**OIDC(OpenID Connect) 방식**은 시크릿 없이 동작합니다. 흐름은 이렇습니다.

```
GitHub Actions 워크플로 실행
    │
    ├─ GitHub가 OIDC 토큰 발급 (JWT, 수명 15분)
    │   (토큰에는 repo, branch, 환경 정보가 포함)
    │
    ├─ Azure에 OIDC 토큰 제출
    │
    ├─ Azure Entra ID가 토큰 검증
    │   (Federated Credential 설정과 일치하는지 확인)
    │
    └─ 인증 성공 → Access Token 발급 → Azure API 호출 가능
```

이 방식을 쓰려면 SP의 App Registration에 **Federated Credential**을 등록해야 합니다. 설정 방법은 섹션 8에서 직접 실습합니다.

### 4.4 RBAC 역할

Azure 리소스에 대한 권한은 RBAC(Role-Based Access Control)로 관리합니다. 주요 기본 제공 역할은 다음과 같습니다.

| 역할 | 권한 |
|---|---|
| **Owner** | 모든 작업 + 다른 사용자에게 권한 부여 |
| **Contributor** | 모든 리소스 생성·삭제 (권한 부여 불가) |
| **Reader** | 읽기 전용 |
| **User Access Administrator** | 권한 부여만 가능 (리소스 변경 불가) |
| **AcrPush** | ACR에 이미지 push 가능 |
| **AcrPull** | ACR에서 이미지 pull 가능 |

CI/CD 파이프라인에는 최소 권한 원칙에 따라 `Contributor` 또는 더 좁은 Custom Role을 부여하세요.

---

## 5. Azure CLI 실전 — Hands-on 1

App Service에 Node.js 샘플 앱을 배포하는 전체 흐름을 실습합니다.

### 5.1 로그인 및 구독 확인

```bash
# Azure 로그인 (브라우저 팝업)
az login

# 현재 구독 확인
az account show

# 구독이 여러 개라면 사용할 구독 설정
az account set --subscription "<구독 이름 또는 ID>"
```

### 5.2 Resource Group 만들기

```bash
az group create \
  --name rg-copilot-training \
  --location koreacentral \
  --tags Environment=dev Project=copilot-training Owner=devteam
```

성공하면 `"provisioningState": "Succeeded"` 메시지가 출력됩니다.

### 5.3 App Service Plan 만들기

```bash
az appservice plan create \
  --name plan-copilot-dev \
  --resource-group rg-copilot-training \
  --sku F1 \
  --is-linux
```

`--sku F1`은 Free 플랜입니다. Linux 런타임을 사용합니다.

### 5.4 Web App 만들기 및 배포

```bash
# Web App 생성 (Node.js 18 LTS)
az webapp create \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training \
  --plan plan-copilot-dev \
  --runtime "NODE:18-lts"

# 기본 샘플 앱 URL 확인
az webapp show \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training \
  --query defaultHostName \
  --output tsv
```

출력된 URL(`app-copilot-api-dev.azurewebsites.net`)을 브라우저에서 열면 기본 페이지가 보입니다.

### 5.5 로컬 코드를 Zip 배포

```bash
# 현재 디렉토리를 zip으로 압축해 배포
az webapp deploy \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training \
  --src-path ./app.zip \
  --type zip
```

### 5.6 로그 스트리밍

```bash
az webapp log tail \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training
```

### 5.7 리소스 정리

```bash
# Web App만 삭제
az webapp delete \
  --name app-copilot-api-dev \
  --resource-group rg-copilot-training

# 또는 Resource Group 전체 삭제 (모든 리소스 포함)
az group delete \
  --name rg-copilot-training \
  --yes --no-wait
```

> `--no-wait` 옵션을 붙이면 삭제가 백그라운드에서 진행되어 터미널을 바로 사용할 수 있습니다.

---

## 6. 컨테이너 배포 실전 — Hands-on 2

상세 실습은 **Chapter 8**에서 다룹니다. 여기서는 전체 흐름만 파악합니다.

### 6.1 전체 흐름

```
로컬 Dockerfile 작성
    ↓
ACR 생성 → 이미지 빌드 & Push (az acr build)
    ↓
Container Apps Environment 생성
    ↓
Container App 생성 (ACR 이미지 지정)
    ↓
Ingress URL로 접근 확인
```

### 6.2 CLI 흐름 미리 보기

```bash
# 1. ACR 생성
az acr create \
  --resource-group rg-copilot-training \
  --name acrcopilotdev \
  --sku Basic

# 2. 이미지 빌드 & Push (로컬 Docker 없이 ACR에서 직접 빌드)
az acr build \
  --registry acrcopilotdev \
  --image myapp:v1 .

# 3. Container Apps Environment 생성
az containerapp env create \
  --name cae-copilot-dev \
  --resource-group rg-copilot-training \
  --location koreacentral

# 4. Container App 생성
az containerapp create \
  --name ca-copilot-api \
  --resource-group rg-copilot-training \
  --environment cae-copilot-dev \
  --image acrcopilotdev.azurecr.io/myapp:v1 \
  --registry-server acrcopilotdev.azurecr.io \
  --ingress external \
  --target-port 8080 \
  --min-replicas 0 \
  --max-replicas 5
```

> 자세한 실습(Dockerfile 작성, 환경변수, 시크릿 연동, Revision 관리)은 **Chapter 8**에서 다룹니다.

---

## 7. Federated Credentials 만들기

GitHub Actions에서 시크릿 없이 Azure에 로그인하는 설정입니다. Chapter 7의 핵심 전제 조건이므로 여기서 직접 만들어봅니다.

### 7.1 필요한 값 3가지

GitHub Actions 워크플로에서 OIDC 로그인을 하려면 다음 세 값이 필요합니다.

| 변수명 | 설명 | 확인 방법 |
|---|---|---|
| `AZURE_CLIENT_ID` | App Registration의 Application (client) ID | Entra ID → App Registrations |
| `AZURE_TENANT_ID` | Entra ID 테넌트 ID | `az account show --query tenantId` |
| `AZURE_SUBSCRIPTION_ID` | 배포 대상 구독 ID | `az account show --query id` |

이 세 값을 GitHub Repository의 Secrets 또는 Variables로 등록하면 됩니다.

### 7.2 App Registration 및 Service Principal 만들기

```bash
# Tenant ID와 Subscription ID 확인
TENANT_ID=$(az account show --query tenantId --output tsv)
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

echo "Tenant ID: $TENANT_ID"
echo "Subscription ID: $SUBSCRIPTION_ID"

# App Registration 생성
az ad app create --display-name "sp-copilot-cicd"

# Application ID 저장
CLIENT_ID=$(az ad app list --display-name "sp-copilot-cicd" --query "[0].appId" --output tsv)
echo "Client ID: $CLIENT_ID"

# Service Principal 생성 (App Registration에 연결)
az ad sp create --id $CLIENT_ID
```

### 7.3 Service Principal에 권한 부여

```bash
# Resource Group에 Contributor 권한 부여
az role assignment create \
  --assignee $CLIENT_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-copilot-training
```

> 최소 권한 원칙: Resource Group 범위로 제한하면 해당 그룹 밖의 리소스는 건드릴 수 없습니다.

### 7.4 Federated Credential 등록

OIDC 인증을 허용할 GitHub 레포지토리와 브랜치/환경을 등록합니다.

```bash
# App의 Object ID 확인 (Client ID와 다름)
OBJECT_ID=$(az ad app show --id $CLIENT_ID --query id --output tsv)

# main 브랜치에서 실행되는 워크플로 허용
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"],
    "description": "GitHub Actions main branch"
  }'
```

`subject` 필드의 형식은 상황에 따라 다릅니다.

| 상황 | subject 값 |
|---|---|
| main 브랜치 push | `repo:ORG/REPO:ref:refs/heads/main` |
| 특정 환경(Environment) | `repo:ORG/REPO:environment:production` |
| 모든 PR | `repo:ORG/REPO:pull_request` |
| 특정 태그 | `repo:ORG/REPO:ref:refs/tags/v1.0.0` |

### 7.5 Client Secret 방식과 OIDC 방식 비교

```bash
# [방식 A] 예전 방식: Client Secret 생성 (권장하지 않음)
az ad sp create-for-rbac \
  --name sp-copilot-cicd \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-copilot-training
# → clientSecret이 출력됨. GitHub Secrets에 저장 필요. 만료 관리 필요.

# [방식 B] OIDC 방식: Federated Credential 사용 (권장)
# 위의 7.2~7.4 절차를 따름
# → 시크릿 없음. 만료 없음. 토큰이 GitHub에서 자동 발급됨.
```

### 7.6 GitHub Secrets에 값 등록

GitHub 레포지토리의 `Settings → Secrets and variables → Actions`에서 아래 세 값을 등록합니다.

```
AZURE_CLIENT_ID      = (7.2에서 확인한 CLIENT_ID)
AZURE_TENANT_ID      = (7.1에서 확인한 TENANT_ID)
AZURE_SUBSCRIPTION_ID = (7.1에서 확인한 SUBSCRIPTION_ID)
```

이 값들은 Chapter 7에서 GitHub Actions 워크플로에 바로 사용합니다.

---

## 8. Infrastructure as Code 맛보기

### 8.1 왜 코드로 관리해야 하나

1. **재현성**: 같은 파일로 dev/staging/prod 환경을 동일하게 만들 수 있습니다.
2. **협업·검토**: Git에서 인프라 변경을 코드 리뷰할 수 있습니다.
3. **자동화**: CI/CD 파이프라인에서 `az deployment group create` 한 줄로 배포 가능합니다.

### 8.2 Bicep 예제 — App Service 만들기

Bicep은 Azure 전용 IaC 언어로, ARM 템플릿보다 훨씬 간결합니다.

```bicep
// main.bicep
param location string = 'koreacentral'
param appName string = 'app-copilot-api-dev'
param planName string = 'plan-copilot-dev'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // Linux
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
    }
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
```

```bash
# Bicep 파일 배포
az deployment group create \
  --resource-group rg-copilot-training \
  --template-file main.bicep
```

### 8.3 Bicep vs Terraform

Bicep은 Azure 전용, Terraform은 멀티 클라우드를 지원합니다. 팀이 Azure만 사용한다면 Bicep이 더 간결하고 Azure 신기능 지원이 빠릅니다. AWS나 GCP를 함께 쓰거나 팀이 Terraform에 이미 익숙하다면 Terraform도 좋은 선택입니다. 이 커리큘럼은 Bicep 위주로 진행하되, Terraform도 개념 수준에서 언급합니다.

---

## 9. 비용 관리

### 9.1 Cost Management

Azure Portal의 `Cost Management + Billing`에서 구독별 비용 현황을 확인할 수 있습니다. 서비스별, 태그별, 리소스 그룹별로 필터링할 수 있어 "어떤 리소스가 얼마나 쓰고 있는지" 빠르게 파악됩니다.

**예산 알림 설정** (월 $10 초과 시 이메일 알림 예시)

```bash
az consumption budget create \
  --budget-name budget-copilot-training \
  --amount 10 \
  --time-grain Monthly \
  --start-date 2025-01-01 \
  --end-date 2025-12-31 \
  --category Cost \
  --resource-group rg-copilot-training
```

> Azure Portal에서 Budgets → Add로 설정하면 이메일/SMS 알림을 더 쉽게 구성할 수 있습니다.

### 9.2 Free Tier로 실습하는 팁

- **App Service**: F1 플랜은 완전 무료 (일부 기능 제한).
- **Container Apps**: 월 200만 요청 / 40만 vCPU-초 / 80만 GiB-초까지 무료.
- **ACR Basic**: 첫 달 무료 크레딧 적용 가능. 이미지 크기에 따라 비용 발생.
- **Azure for Students**: $100 크레딧 제공, 카드 없이 사용 가능.

### 9.3 실습 후 정리

실습이 끝나면 반드시 리소스를 삭제하세요. Resource Group을 삭제하면 그 안의 모든 리소스가 함께 삭제됩니다.

```bash
az group delete \
  --name rg-copilot-training \
  --yes \
  --no-wait
```

---

## 10. 실습 과제

### 과제 1: App Service 배포 & 확인

1. `rg-copilot-training` Resource Group을 `koreacentral`에 만드세요.
2. F1 플랜으로 App Service를 만들고 기본 URL을 확인하세요.
3. `az webapp log tail`로 로그를 스트리밍해 보세요.
4. 완료 후 `az group delete`로 정리하세요.

### 과제 2: Federated Credential 설정

1. App Registration을 만들고 `AZURE_CLIENT_ID`를 기록하세요.
2. `az account show`로 `AZURE_TENANT_ID`와 `AZURE_SUBSCRIPTION_ID`를 확인하세요.
3. Federated Credential을 자신의 GitHub 레포지토리 main 브랜치에 대해 등록하세요.
4. GitHub Repository Secrets에 세 값을 등록하세요.

### 과제 3: Bicep 템플릿 수정

위의 `main.bicep` 예제를 수정해서 App Service 플랜을 `P0v3`로, 런타임을 `PYTHON|3.12`로 변경하고 배포해 보세요. 배포 후 `az webapp show`로 URL을 확인하고, 결과를 팀 채널에 공유하세요.

---

## 11. 현업 팁

1. **명명 규칙은 처음부터 강제하세요.** 나중에 이름을 바꾸려면 리소스를 지우고 다시 만들어야 합니다. Azure Policy로 명명 규칙을 강제할 수 있습니다.

2. **태그를 처음부터 붙이세요.** 나중에 비용 분석할 때 태그가 없으면 어떤 팀/프로젝트 비용인지 알 수 없습니다. `Environment`, `Project`, `Owner`는 필수로 설정하세요.

3. **예산 알림을 설정하세요.** 실수로 비싼 VM을 켜놓거나 스케일아웃이 과하게 발생하는 경우를 대비해 월 예산 임계값 알림을 항상 켜두세요.

4. **Resource Lock으로 운영 리소스를 보호하세요.** `az lock create --lock-type CanNotDelete`로 실수로 삭제하는 사고를 예방할 수 있습니다.

5. **Managed Identity를 기본으로 선택하세요.** 앱이 Azure 리소스에 접근할 때 시크릿 대신 Managed Identity를 쓰면 인증서/비밀번호 관리 부담이 없어집니다.

6. **Container Apps의 scale-to-zero를 활용하세요.** 개발·스테이징 환경은 `--min-replicas 0`으로 설정하면 사용하지 않을 때 비용이 거의 0에 가까워집니다.

7. **`--output table` 옵션을 활용하세요.** 긴 JSON 출력 대신 테이블 형식으로 보면 빠르게 파악됩니다. 자주 쓰는 필드는 `--query`로 필터링하세요.
   ```bash
   az webapp list --resource-group rg-copilot-training --output table
   ```

---

## 마무리 정리

| 주제 | 핵심 내용 |
|---|---|
| **계층 구조** | Subscription → Resource Group → Resource |
| **컴퓨트 선택** | App Service(코드), Container Apps(서버리스 컨테이너), AKS(복잡한 K8s) |
| **인증** | Managed Identity(Azure 내부), OIDC Federated Credential(GitHub Actions) |
| **IaC** | Bicep으로 재현 가능한 인프라, `az deployment group create`로 배포 |
| **비용** | Free Tier 활용, 예산 알림, 실습 후 `az group delete` |

---

## 다음 단계

Federated Credentials까지 설정했다면 이제 GitHub Actions 워크플로에서 Azure에 배포하는 자동화를 구성할 준비가 됐습니다.

→ [Chapter 7. GitHub Actions × Azure 통합 CI/CD](./ch07_GitHub_Actions_Azure_통합_CICD.md)
