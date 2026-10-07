# Track 2·3에서 Track 4로 — 첫 배포를 운영 가능한 흐름으로

[전체 교육 flow](../README.md)

Track 2·3은 **URL에서 자신의 결과물을 실행·수정·재배포하는 경험**을 제공합니다.
Track 4는 이 경험에 검증·자동화·권한·승인·모니터링·롤백을 연결합니다.
기존 Ch.0~10 독립 수강과 MiniLinkr 캡스톤은 그대로 유지합니다.

## 가져올 결과물

| 출발점 | 준비할 결과물 | Track 4의 확장 |
| --- | --- | --- |
| Track 2 개발자 | MSA 소스, 테스트, 이미지 태그, Azure 배포 설정, Kafka 연동 확인 | 서비스별 CI, 이미지 버전 관리, OIDC, 환경별 배포, 실패 시 대응 |
| Track 3 정적 웹 | 웹 파일, 기능 체크리스트, Azure 사이트, 수정 이력 | 프런트엔드 검증, 검토용 배포, 승인 후 게시, 이전 파일 버전 재배포 |
| Track 3 서버 앱 | Python 소스, 테스트, requirements, 시작 명령 | 테스트·빌드 자동화, App Service 배포, 로그·상태 확인, 복구 절차 |

검토 브랜치의 추가 과정:
[Track 2](https://github.com/Ai-Advanced/Copilot-Advanced-MSA-Java/blob/feat/azure-deployment-capstone/docs/11-azure-deployment-capstone.md) ·
[Track 3](https://github.com/Ai-Advanced/Copilot-Advanced-NonDev/blob/feat/azure-deployment-capstone/09-azure-capstone/README.md).
두 과정 모두 `main`에서 분기한 추가 교육입니다.

## 합류 전 확인

- Git 브랜치·PR, 테스트 결과, 배포 파일·이미지의 의미를 설명할 수 있다.
- 가상 데이터를 쓰고, 자신의 배포 대상과 권한을 구분한다.
- 자동 배포 전에 수동 배포와 실제 기능 확인을 한 번 완료했다.
- 위 조건이 부족하면 Ch.0~4를 먼저 학습한다. 첫 배포 경험만으로 자동화 역량을 갖췄다고 가정하지 않는다.

## 권장 진행

1. [Ch.5 Actions 기초](ch05_GitHub_Actions_기초.md): 테스트와 빌드부터 자동화한다. 처음부터 push마다 Azure를 바꾸지 않는다.
2. [Ch.6 Azure 배포 기초](ch06_Azure_배포_기초.md): 배포 서비스와 인증 방식을 구분한다.
3. [Ch.7 통합 CI/CD](ch07_GitHub_Actions_Azure_통합_CICD.md): GitHub Environment와 대상 브랜치에 맞춘 권한을 설계한다.
4. [Ch.8 웹앱 배포](ch08_실전_웹앱_배포_자동화.md): 승인된 교육 환경에서만 배포를 추가한다.
5. [Ch.9 운영](ch09_보안_모니터링_롤백.md): 실패 감지·로그·이전 버전 복구를 수행한다.
6. [Ch.10 Capstone](ch10_종합_실습_Capstone.md): MiniLinkr 또는 강사가 승인한 기존 결과물로 전체 흐름을 시연한다.

## 인증·운영에서 달라지는 점

- Azure 리소스 접근은 OIDC를 우선 검토한다. 신뢰 조건을 저장소·브랜치 또는 Environment에 한정한다.
- Static Web Apps 배포는 배포 토큰을 사용할 수 있다. ARM 로그인용 OIDC 토큰과 사이트 배포 토큰을 같은 것으로 설명하지 않는다.
- GitHub Secrets와 Environment 보호 기능의 사용 가능 여부는 저장소 공개 범위·요금제·조직 정책에 맞게 사전 확인한다.
- `workflow_dispatch`를 초기 진입점으로 검토하되, 수동 실행 버튼만으로 권한과 대상이 안전해지는 것은 아니다.
- Track 2의 `/32` Gateway 제한은 GitHub 호스티드 실행기의 변동 IP와 충돌할 수 있다. 테스트를 위해 전체 인터넷에 열지 말고 승인된 실행기·네트워크 경로를 설계한다.
- H2·일회성 Kafka 데모는 이미지 롤백으로 데이터가 복구되지 않는다. 내구성 저장소·백업·스키마 호환성은 별도 설계한다.
- Static Web Apps, App Service 슬롯, Container Apps revision은 복구 방식과 요금제 조건이 다르므로 하나의 롤백 명령으로 일반화하지 않는다.

## 완료 기준

정상 배포뿐 아니라 **실패하는 테스트가 배포를 막는지**, 승인 없이 다른 환경을 바꿀 수 없는지,
잘못된 배포를 감지하고 이전 버전으로 복구할 수 있는지 확인합니다.
수강생 리소스는 종료 후 정리하고, 운영 서비스 전환 여부는 별도 검토합니다.
