# 여행 플래너

고정 일정 + 후보 목록 방식의 개인 여행 계획 웹앱 (PWA)

## 구조
- 시각을 갖는 것은 **예약·티켓·교통(고정)** 뿐
- 나머지는 시간 없이 **후보**로만 날짜에 담음
- 앱이 고정 사이 **빈 시간**을 계산하고, 그 안에 들어갈 후보를 골라줌
- 이동시간은 좌표 기반 추정 (Directions API 불필요)

## 파일
| 파일 | 역할 |
|---|---|
| index.html | 앱 셸 · 스타일 |
| app.js | 전체 로직 |
| places.json | 장소 DB 632곳 (errdaytrip 449 + 내 구글맵 183) |
| manifest.json / sw.js | PWA · 오프라인 |

## 데이터
- 계획·지출·체크리스트는 브라우저 localStorage에 저장
- 장소 DB는 places.json (읽기 전용)

## 홈 화면 추가
- iPhone: **Safari**로 열기 → 공유 → 홈 화면에 추가
- Android: Chrome → ⋮ → 앱 설치
