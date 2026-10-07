# Ch.7~9 실행 예제 — 승인 기반 App Service 슬롯 배포

[Track 2·3 연결](../../docs/track2-track3-bridge.md) · [Ch.8](../../docs/ch08_실전_웹앱_배포_자동화.md) ·
[워크플로](../../.github/workflows/azure-slot-lab.yml)

Ch.8 Track A의 Express API를 실제 실행 파일로 제공합니다.
**CI → OIDC → staging → 기능 확인 → production 승인 → 슬롯 스왑 → 확인·복구**를 연습합니다.
MiniLinkr의 Postgres·Redis·Key Vault 전체 구현이나 Container Apps revision 실습을 대신하지 않습니다.

## 범위와 비용

- `/health`는 패키지 버전을 반환합니다. `/users`는 가상 사용자 생성·조회만 지원합니다.
- `@example.invalid` 이메일만 허용하며 최대 100건의 인메모리 데이터는 재시작·스왑 때 초기화될 수 있습니다.
- 인증이 없는 임시 공개 교육 API입니다. 실제 개인정보·업무 데이터·운영 트래픽을 넣지 않습니다.
- 슬롯이 필요하므로 **Linux App Service S1**을 사용합니다. B1에는 배포 슬롯이 없습니다.
- Plan·로그 비용이 발생합니다. 로그 일일 제한은 결제 상한이 아니며, 앱을 중지해도 Plan은 과금될 수 있습니다.
- 강사가 승인한 교육 전용 그룹과 저장소만 사용합니다. 기존 운영 환경·main·조직 Actions 정책은 변경하지 않습니다.

## 1. 로컬 확인

Node.js 22.13+와 PowerShell 7에서 저장소 루트 기준:

```powershell
Set-Location .\examples\01-web-app
npm ci
npm run lint
npm test -- --silent
npm start
```

`http://localhost:3000/health`를 확인합니다. 로컬 서버는 `Ctrl+C`로 종료합니다.
ZIP은 Actions의 Linux 실행기에서 프로덕션 의존성을 포함해 **한 번만** 만들고 staging에 배포합니다.
production 승격은 동일한 배포본을 스왑하며 다시 빌드하지 않습니다.

## 2. 강사 준비 — 저장소·OIDC subject

검토 브랜치의 코드와 `.github/workflows/azure-slot-lab.yml`을 **별도 교육 저장소**에 복사합니다.
이 워크플로는 자동 push 배포 없이 `workflow_dispatch`만 지원합니다.
실행 버튼을 등록하려면 파일이 해당 교육 저장소의 기본 브랜치에 있어야 합니다.
이 검증을 위해 원래 교육자료 저장소의 main에 먼저 병합하지 않습니다.

관리자가 GitHub CLI에 로그인한 뒤:

```powershell
$repo = "<owner>/<교육 저장소>"
gh api "repos/$repo/actions/oidc/customization/sub"
if ($LASTEXITCODE -ne 0) { throw "저장소 OIDC 설정 조회 실패" }
```

**이름만으로 subject를 조합하지 않습니다.** 기본 템플릿의 `sub_claim_prefix`를 확인합니다.
Immutable subject를 사용하는 저장소는 `repo:owner@123/repository@456`처럼 고정 ID도 포함합니다.
기존 이름 기반 형식 `repo:owner/repository`와 같지 않아 Azure에서 `AADSTS700213`으로 거부될 수 있습니다.

이 예제의 Bicep은 기본 subject 템플릿에 `:environment:lab-staging` 또는
`:environment:lab-production`을 붙입니다. `use_default=false`인 조직 맞춤 템플릿은
관리자가 실제 claim에 맞게 템플릿을 조정해야 합니다. 조직 정책을 기본값으로 되돌려 우회하지 않습니다.
문제 분석 시 `azure/login`의 issuer·subject·audience 출력만 확인하고 **JWT 원문을 출력하지 않습니다.**

## 3. 강사 준비 — Azure

관리자는 `Microsoft.Web`, `Microsoft.ManagedIdentity`, `Microsoft.OperationalInsights`,
`Microsoft.Insights` 공급자, 허용 리전·S1 할당량·역할 할당 권한을 확인합니다.
아래 변수는 승인된 교육값으로만 입력하며 실제 식별자는 비공개로 관리합니다.
이미 존재하는 그룹을 재태깅하거나 기존 자원을 재사용하지 않습니다.

저장소 루트에서:

```powershell
$subscription = "<교육 구독 ID>"
$prefix = "student01"
$group = "rg-copilot-$prefix"
$location = "<승인된 리전>"
$subjectPrefix = "<실제 sub_claim_prefix>"
az group exists --subscription $subscription -n $group -o json
# false인지 직접 확인한 뒤에만 새 그룹 생성
az group create --subscription $subscription -n $group -l $location `
  --tags purpose=copilot-training "learner=$prefix"
if ($LASTEXITCODE -ne 0) { throw "교육 그룹 생성 실패" }
az deployment group what-if --subscription $subscription -g $group `
  --template-file .\examples\01-web-app\infra\slot-lab.bicep `
  --parameters "prefix=$prefix" "oidcSubjectPrefix=$subjectPrefix"
if ($LASTEXITCODE -ne 0) { throw "변경 미리보기 실패" }
```

S1·로그·Identity·역할 범위를 검토한 뒤:

```powershell
az deployment group create --subscription $subscription -g $group `
  --template-file .\examples\01-web-app\infra\slot-lab.bicep `
  --parameters "prefix=$prefix" "oidcSubjectPrefix=$subjectPrefix"
if ($LASTEXITCODE -ne 0) { throw "기반 환경 생성 실패" }
```

서로 다른 User-assigned Managed Identity에 다음 권한을 부여합니다.
장기 client secret·publish profile은 생성하지 않습니다.

| Identity | 신뢰 subject | Azure 역할 범위 |
| --- | --- | --- |
| staging | 정확한 저장소 + `lab-staging` Environment | staging 슬롯 Website Contributor, 부모 앱 Reader |
| production | 정확한 저장소 + `lab-production` Environment | 교육 앱 Website Contributor |

staging Identity가 production 설정을 쓸 수 없는지를 워크플로가 실제로 시험합니다.
예상한 `AuthorizationFailed`만 통과하며, 다른 실패를 권한 차단 성공으로 간주하지 않습니다.
과도한 권한으로 시험 쓰기가 성공하면 배포를 중단합니다. 강사가 `LAB_BOUNDARY_PROBE` 설정을 제거하고
권한을 바로잡아야 합니다. 이 쓰기 시험은 **전용 교육 앱에서만** 실행합니다.

## 4. GitHub Environments

`lab-staging`, `lab-production`을 만들고 두 Environment의 허용 배포 브랜치를 교육 저장소의 `main`으로 제한합니다.
production은 Required reviewers를 설정하고 관리자 우회를 끕니다.
가능한 경우 별도 리뷰어와 자기 승인 방지를 사용합니다. 단독 리허설의 동일 계정 승인을 독립적인 사람의 검토로 표현하지 않습니다.
Environment 기능 사용 가능 여부는 저장소 공개 범위·요금제·조직 정책에 따라 확인합니다.

각 Environment에 다음 Secrets를 등록합니다. ID·자원 이름도 로그 노출을 줄이기 위해 Secrets로 전달합니다.

| 이름 | 값 |
| --- | --- |
| `AZURE_CLIENT_ID` | 해당 Environment 전용 Identity의 client ID |
| `AZURE_TENANT_ID` | 교육 테넌트 ID |
| `AZURE_SUBSCRIPTION_ID` | 교육 구독 ID |
| `AZURE_RESOURCE_GROUP` | 새 교육 그룹 |
| `AZURE_WEBAPP_NAME` | 출력의 appName |

Environment subject만으로 브랜치까지 제한되지 않습니다. **배포 브랜치 정책을 함께 설정**해야 합니다.
staging과 production에 같은 광범위한 Azure Identity를 재사용하지 않습니다.
허용 Actions 정책이 이 예제의 SHA 고정 Actions를 허용하는지 확인하되 조직 정책을 임의 완화하지 않습니다.

## 5. 배포와 실패 차단

Actions에서 `Azure slot lab`을 선택합니다.

1. 비어 있는 새 앱의 **첫 배포만** `operation=deploy`, `bootstrap=true`로 실행합니다. 첫 배포에는 복구할 이전 버전이 없습니다.
2. CI와 staging 기능 검증이 통과한 뒤 production이 승인 대기인지 확인합니다. 승인 전 production이 바뀌지 않아야 합니다.
3. 배포 대상·버전·검증 결과를 검토하고 승인합니다. 스왑 후 `/health`, 생성/조회·입력 오류가 다시 검증됩니다.
4. 테스트 기대값을 의도적으로 틀리게 만든 별도 교육 커밋으로 실행해 build 실패 시 staging/production이 실행되지 않는지 확인합니다. 이후 수정 커밋으로 복구합니다.
5. 허용되지 않은 브랜치에서 실행해 Environment 정책이 Azure 접근 전에 차단하는지 확인합니다.

App Service 콜드 스타트에서는 첫 요청이 타임아웃될 수 있습니다.
스모크 검사는 일부 일시적 연결 오류만 명시적으로 기록하고 최대 6분 안에서 재시도합니다.
403·인증서 오류는 재시도로 감추지 않으며, 200이라도 기대한 버전이 아니면 성공으로 처리하지 않습니다.

## 6. 새 버전과 롤백

교육용 작업 사본에서 기능을 수정하고 `npm version 1.1.0 --no-git-tag-version`으로
`package.json`과 lock 파일의 버전을 함께 변경합니다. 테스트 후 커밋·push합니다.
이번에는 `bootstrap=false`로 배포합니다.

스왑 후 이전 production 패키지가 staging에 남아 있는지 `/health`의 버전으로 확인합니다.
롤백은 `operation=rollback`, `rollback_version=1.0.0`, `bootstrap=false`로 실행하고 다시 승인합니다.
워크플로는 **staging이 지정한 복구 버전인지 먼저 검증**한 뒤 재스왑합니다.
복구는 현재 production의 정상 응답을 전제로 하지 않습니다. 복구 대상 staging의 기능 검증과 승인은 필수입니다.
그 사이 staging을 새 패키지로 덮어썼다면 과거 버전으로의 재스왑을 보장하지 않습니다.

스왑 후 production 검증이 실패하면 기록한 이전 버전으로 재스왑하고 기능을 재확인합니다.
복구 성공이어도 실패한 배포 실행을 성공으로 바꾸지 않습니다.
최초 배포·스왑 명령 자체의 실패·DB 마이그레이션 복구까지 자동 처리한다고 가정하지 않습니다.
수동 롤백 자체가 실패했을 때는 알려지지 않은 원래 장애 버전으로 다시 스왑하지 않고 강사가 대응합니다.
스왑은 DNS 레코드 변경이 아니라 App Service의 슬롯 전환이며, 워밍업 때문에 완료 시간이 달라집니다.

## 7. 로그와 종료

두 슬롯에서 애플리케이션/HTTP 로그를 활성화합니다. 다음은 production 예시이며 staging은 `--slot staging`을 추가합니다.

```powershell
$app = "<출력의 appName>"
az webapp log config --subscription $subscription -g $group -n $app `
  --docker-container-logging filesystem --application-logging filesystem `
  --level information --web-server-logging filesystem -o none
if ($LASTEXITCODE -ne 0) { throw "로그 설정 실패" }
```

production의 Diagnostic setting은 Log Analytics로 로그를 전송합니다. 수집 지연을 고려해 조회합니다.

```kusto
AppServiceConsoleLogs
| where TimeGenerated > ago(1h)
| where ResultDescription contains "http-response"
| project TimeGenerated, ResultDescription
| order by TimeGenerated desc
```

이 예제는 Application Insights 분산 추적·알림 전송·GHAS 전체 실습을 대신하지 않습니다.
검증 종료 시 강사가 정확한 자원 목록·소유 태그를 확인하고 앱·슬롯·**전용 Plan**·로그·두 Identity를 정리합니다.
GitHub Environment Secrets와 배포 신뢰도 제거하고 실행 중 워크플로가 없는지 확인합니다.
그룹 삭제 명령의 접수만 믿지 말고 `az group exists`가 `false`인지 확인합니다.
검증 저장소를 보관한다면 비공개로 유지하고 Actions를 끈 뒤 보관 책임자를 기록합니다.

## 실제 검증 기준선 — 2026-10-07

별도 비공개 저장소와 Korea Central의 임시 S1 환경에서 GitHub 호스티드 실행기로 검증했습니다.
Azure 장기 비밀이나 publish profile 없이 서로 다른 두 Identity로 실제 OIDC 로그인을 수행했습니다.

| 항목 | 확인한 결과 |
| --- | --- |
| 정상 배포 | CI·Linux 패키징 → staging 기능 확인 → 승인 → production 스왑 및 생성/조회·입력 오류 확인 |
| 버전 승격 | `1.0.0` → `1.1.0`; 승인 대기 중 production은 `1.0.0` 유지 |
| CI 차단 | 별도 브랜치의 의도적 테스트 실패로 build 실패, 두 Azure job은 skipped |
| 브랜치 차단 | 테스트가 통과해도 허용되지 않은 브랜치는 Environment 정책에서 거부 |
| Azure 권한 분리 | staging Identity의 production 설정 쓰기가 `AuthorizationFailed`로 거부 |
| 수동 복구 | 승인 후 `1.1.0` → staging에 보존된 `1.0.0` 재스왑, 실제 기능 재확인 |
| 자동 복구 | 비공개 검증 사본에만 production 전용 503 결함 주입. 배포 후 기능 검증 실패 → `1.0.0` 자동 복구. 해당 배포 실행은 failure 유지 |
| 관측 | 실제 `http-response` 이벤트와 버전·응답 코드를 Log Analytics KQL로 조회 |
| 정리 | 앱·슬롯·S1 Plan·로그·두 Identity를 포함한 그룹 부재 확인. GitHub Environment/Secrets·빌드 아티팩트 삭제, Actions 중지 후 검증 저장소 비공개 archive |

처음에는 이름 기반 OIDC subject 불일치와 첫 HTTP 요청 타임아웃으로 실패했으며,
정확한 immutable subject와 제한된 콜드 스타트 재시도로 수정했습니다.
빈 앱의 최초 배포는 명시적인 bootstrap으로 구분하고, 장애 복구에 현재 production의 정상 응답을 요구하지 않도록 했습니다.
앱/스모크 단위 테스트 14개와 실제 워크플로의 사전 확인 shell에 대한 6개 분기 검증을 수행했습니다.

승인은 단독 리허설을 위해 동일 계정에서 수행했습니다. 독립된 사람의 승인·직무 분리 검증은 아닙니다.
MiniLinkr 전체, Container Apps 점진 배포, Application Insights 분산 추적·알림, GHAS 전체,
단체 동시 배포와 최종 청구 금액은 이 결과의 보장 범위가 아닙니다.
검증의 고의 결함은 이 실행 예제 소스에 포함하지 않습니다.
당일 Azure 비용 조회에는 아직 청구 행이 없었습니다. Azure와 GitHub Actions의 최종 청구 금액을
0원이나 정해진 상한 이하로 보장하지 않습니다.

참고: [GitHub OIDC subject](https://docs.github.com/en/actions/reference/security/oidc) ·
[App Service 슬롯](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
