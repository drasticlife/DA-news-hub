# AGENT_CONTEXT: Procurement Intelligence Hub System

## System Overview

This repository functions as a **Strategic Intelligence Hub**. It bridge the gap between "External News" and "Internal Strategy".

### Data Flow

1. **Scraping**: External news is summarized (via Google Sheets/Scripts) and saved to `data.json`.
2. **Syncing**: This file is cloned into the corporate environment.
3. **Enhancement (The Agent Task)**: An AI Agent (Cline SR) reads the `Summary`, consults internal folders `/context/A` and `/context/B`, and writes a strategic interpretation into the `BOT` field.
4. **Publishing**: The "Enhanced `data.json`" is pushed to the corporate internal Git and served via the `index.html` frontend.

## Architecture

- `index.html`: The visualization dashboard (Frontend).
- `data.json`: The central database (augmented with Bot insights).
- `/context/A-Strategy/`: High-priority internal documents.
- `/context/B-Reference/`: Supporting internal data.
- `.agent/`: Agent configuration, instructions, and workflows.

## Why separate Instructions vs. Workflows?

- **Instructions (`instructions.md`)**: Defines **WHO** the agent is. It's the "Character Sheet". It covers constant rules, tone, and identity that apply to every single message.
- **Workflows (`/workflows/insight.md`)**: Defines **HOW** to perform a specific, complex task. It's a "Recipe". It provides a structured path for a specific command (`/insight`) to ensure consistency in execution.

---

## 🇰🇷 사내 시스템 운영 가이드

### 1. 시스템 개요 (Korean Summary)

본 시스템은 외부에서 수집된 뉴스 데이터(`data.json`)에 사내 전략을 입혀 **"사내 맞춤형 인텔리전스"**를 생성하는 허브입니다.

1. **데이터 수집**: 외부 뉴스가 `data.json`으로 요약 저장됩니다.
2. **사내 동기화**: 해당 파일을 사내망 환경으로 가져옵니다(Clone).
3. **지능형 분석 (Agent)**: AI Agent가 사내 전략 문서(A, B 폴더)를 기반으로 기사를 해석하여 `BOT` 열에 인사이트를 채웁니다.
4. **최종 배포**: 인사이트가 추가된 `data.json`이 사내 Git에 업데이트되어 임직원이 대시보드(`index.html`)에서 확인합니다.

### 2. 구체적인 작업 방법 (Operational Guide)

#### 사용 모드: VS Code Cline SR

사내 보안 환경의 VS Code에서 Cline 확장을 열고 다음 과정을 따릅니다.

#### 준비 단계:

- **폴더 관리**: `/context/A-Strategy/`에는 올해의 핵심 전략 문서를, `/context/B-Reference/`에는 참고용 기초 자료를 넣어주세요. (주 1회 업데이트 권장)
- **파일 배치**: 수집된 `data.json`이 프로젝트 루트의 `data/` 또는 `root` 경로에 있는지 확인하세요.

#### 명령어 실행 (`/insight`):

1. Cline 채팅창에 **`/insight`**를 입력합니다.
2. Agent는 자동으로 `instructions.md`의 규칙(누가, 어떤 톤으로)과 `insight.md`의 절차(어떤 순서로)를 읽습니다.
3. **증분 업데이트 (Incremental)**: Agent는 `BOT` 칸이 비어 있는 신규 기사만 골라내어 분석합니다. 만약 사내 전략 문서가 수정되었다면, 관련된 기존 기사도 함께 재분석할 수 있습니다.
4. **분석 결과**: Agent가 `data.json` 파일을 직접 수정합니다. 완료 후 수정된 항목 수와 참고한 문서 목록을 보고합니다.

#### 마무리:

- Agent가 수정을 마친 `data.json`을 사내 Git 저장소에 커밋 및 푸시하면 작업이 끝납니다.

### 3. 파일별 역할 및 저장 위치 (File Locations)

각 파일은 반드시 아래 지정된 경로에 위치해야 Agent가 올바르게 인식할 수 있습니다.

- **기본 지침서 (`instructions.md`)**:
  - **경로**: `.agent/instructions.md`
  - **역할**: Agent의 "근무 수칙"입니다. 사내 용어 사용법, 문서 우선순위, 보안 규칙 등 상시 지켜야 할 원칙이 담겨 있어 Agent가 항상 똑똑하게 행동하게 합니다.
- **표준 매뉴얼 (`insight.md`)**:
  - **경로**: `.agent/workflows/insight.md`
  - **역할**: 작업의 "표준 매뉴얼"입니다. `/insight` 명령 시 Agent가 실수 없이 (파일 읽기 -> 검색 -> 분석 -> 쓰기 -> 검정) 단계를 밟도록 보장합니다.
- **시스템 전체 맥락 (`AGENT_CONTEXT.md`)**:
  - **경로**: `root/AGENT_CONTEXT.md` (프로젝트 최상위)
  - **역할**: 프로젝트 초기화 시 Agent가 이 시스템의 전체적인 구조를 파악하기 위해 가장 먼저 읽는 요약 문서입니다.
