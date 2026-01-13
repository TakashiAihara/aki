# Aki Development Roadmap

**Project**: AI-Integrated Health Management Platform
**Mission**: 生活の中の健康にかかわるすべてを管理し、LLM が励ましたり生活を手伝うための総合健康管理プラットフォーム
**Constitution Version**: 1.1.0
**Last Updated**: 2026-01-02

## Overview

This roadmap outlines the development plan for the Aki health management platform, organized around 6 bounded contexts following Domain-Driven Design principles. The plan prioritizes foundational services first, building incrementally toward a comprehensive health management ecosystem.

## Architecture Vision

**Approach**: Microservices Architecture with Event-Driven Communication
**Deployment**: Monorepo (pnpm workspace)
**Platforms**: Web (Next.js), Mobile (React Native/Expo), CLI (Commander.js)
**Authentication**: OAuth 2.0 only (Google OAuth + Apple Sign In)

## Bounded Contexts

### 1. User Service (P0 - Foundation)
**Status**: 📝 Specification Pending
**Priority**: Highest - All services depend on this
**Scope**:
- OAuth 2.0 authentication (Google, Apple Sign In)
- JWT token generation and validation
- User profile management
- Household membership management (`household_id`)
- Account deletion (GDPR compliance)
- Multi-platform support (Web, iOS, Android, CLI)

**Why P0**:
- Authentication foundation required by all other services
- Session management and authorization
- Household context provider for shared features

**Key Deliverables**:
- [ ] User service specification
- [ ] Authentication flow design
- [ ] JWT token schema
- [ ] User profile data model
- [ ] OAuth integration (Google + Apple)
- [ ] GDPR compliance implementation

---

### 2. Medication Service (P1 - Core Feature)
**Status**: 📝 Specification Pending
**Priority**: High - Primary user value
**Scope**:
- Medication registration (薬剤登録)
- Dosage and schedule tracking
- Reminder notifications
- Medication history/records (服薬記録)
- Refill alerts
- Drug interaction warnings (optional external API integration)

**Dependencies**:
- User Service (authentication, user_id)

**Why P1**:
- Critical health management feature
- High user value and engagement
- Standalone functionality (minimal dependencies)

**Key Deliverables**:
- [ ] Medication service specification
- [ ] Medication data model
- [ ] Reminder/notification system design
- [ ] History tracking mechanism
- [ ] Mobile offline support plan

---

### 3. Mental Service (P2 - Task Management Focus)
**Status**: 📝 Specification Pending
**Priority**: High - Productivity and mental health support
**Scope (v1.0 MVP)**:
- Task management (タスク管理)
- Task creation, editing, completion
- Priority and deadline tracking
- Task categorization
- Simple reminders

**Scope (v2.0 - Deferred)**:
- Diary/journaling (日記)
- Mood tracking (気分トラッキング)
- LLM-based counseling (精神面サポート)
- AI encouragement and insights

**Dependencies**:
- User Service (authentication, user_id, household_id for shared tasks)

**Why P2**:
- Complements medication adherence (task: "take medicine")
- Standalone utility value
- Foundation for future AI integration

**Key Deliverables**:
- [ ] Mental service specification (task management only)
- [ ] Task data model
- [ ] Reminder integration with notification system
- [ ] Shared vs personal task logic

---

### 4. Nutrition Service (Deferred - Design Complete)
**Status**: ✅ Specification Complete, Implementation Deferred
**Priority**: Medium - Deferred to post-v1.0
**Scope**:
- Household inventory management (在庫管理)
- Food and product tracking
- Expiration date management
- Multi-user household sharing
- Offline sync (mobile)
- Barcode scanning (future)

**Dependencies**:
- User Service (authentication, household_id)

**Why Deferred**:
- Complete specification already exists (`specs/001-household-inventory/`)
- Lower priority than medication and task management
- Can be implemented after v1.0 MVP launch

**Design Artifacts Available**:
- ✅ Complete specification (`spec.md`)
- ✅ Implementation plan (`plan.md`)
- ✅ Technology research (`research.md`)
- ✅ Data model (`data-model.md`)
- ✅ API contracts (OpenAPI 3.0)
- ✅ Quickstart guide (`quickstart.md`)

**Implementation Ready**: Can be started immediately after v1.0 core features

---

### 5. Diet Service (v2.0)
**Status**: 🔮 Future Planning
**Priority**: Low - Post-v1.0
**Scope (Conceptual)**:
- Meal planning and suggestions (献立サポート)
- Calorie and nutrition tracking (カロリー計算)
- Dietary goal management (ダイエットサポート)
- Recipe recommendations
- Integration with Nutrition Service (inventory-based meal planning)

**Dependencies**:
- User Service
- Nutrition Service (for inventory-based suggestions)

**Why v2.0**:
- Requires Nutrition Service data
- Complex AI/ML requirements
- Lower immediate user value compared to medication/task management

**Key Deliverables** (Future):
- [ ] Diet service specification
- [ ] Nutrition calculation engine design
- [ ] Recipe database integration
- [ ] Meal planning algorithm

---

### 6. AI Service (v2.0)
**Status**: 🔮 Future Planning
**Priority**: Low - Post-v1.0
**Scope (Conceptual)**:
- LLM integration layer (統合 AI アシスタント)
- Prompt management and versioning
- Data aggregation from all services
- AI-powered insights and recommendations
- Conversational interface
- Mental health support (counseling, encouragement)
- Personalized health coaching

**Dependencies**:
- All other services (consumes data from User, Medication, Mental, Nutrition, Diet)

**Why v2.0**:
- Requires data from all other services to provide value
- Complex privacy and masking requirements (PII anonymization for LLM)
- Needs mature data corpus for meaningful insights
- Foundation must be solid before adding AI layer

**Key Deliverables** (Future):
- [ ] AI service specification
- [ ] LLM provider integration design
- [ ] Data masking and privacy strategy
- [ ] Prompt engineering framework
- [ ] Insight generation algorithms

---

## Implementation Phases

### Phase 1: Foundation (v1.0 MVP Core)

**Goal**: Establish authentication and deliver core health management features

**Features**:
1. **User Service** (P0)
   - OAuth 2.0 authentication
   - User profile management
   - Household membership

2. **Medication Service** (P1)
   - Medication registration
   - Reminder system
   - Medication history

3. **Mental Service** (P2)
   - Task management (basic)
   - Task reminders

**Success Criteria**:
- Users can authenticate via Google/Apple
- Users can register and track medications with reminders
- Users can create and manage tasks
- All platforms functional (Web, iOS, Android, CLI)

**Non-Goals (Deferred)**:
- Nutrition/inventory management
- Diet planning
- AI insights
- Advanced mental health features (diary, mood tracking)

---

### Phase 2: Expansion (v1.1+)

**Goal**: Add productivity and household management features

**Features**:
1. **Nutrition Service**
   - Household inventory management
   - Expiration tracking
   - Multi-user sharing

**Success Criteria**:
- Users can track household food inventory
- Shared household members can collaborate
- Offline mobile support functional

---

### Phase 3: Intelligence (v2.0)

**Goal**: Integrate AI capabilities and advanced features

**Features**:
1. **Diet Service**
   - Meal planning
   - Nutrition tracking

2. **AI Service**
   - LLM integration
   - Cross-service insights
   - Mental health counseling

3. **Mental Service Expansion**
   - Diary and mood tracking
   - AI-powered encouragement

**Success Criteria**:
- AI provides actionable health insights
- Users report improved health outcomes
- LLM delivers personalized recommendations

---

## Dependency Map

```
┌─────────────────┐
│  User Service   │ (P0 - Foundation)
│   (Auth/JWT)    │
└────────┬────────┘
         │
         │ Depends on User Service
         ├────────────────┬────────────────┬─────────────────┐
         ▼                ▼                ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Medication  │  │   Mental    │  │  Nutrition   │  │     Diet     │
│  Service    │  │  Service    │  │   Service    │  │   Service    │
│     (P1)    │  │     (P2)    │  │  (Deferred)  │  │    (v2.0)    │
└─────────────┘  └─────────────┘  └──────┬───────┘  └──────┬───────┘
                                          │                  │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────┐
                                          │ AI Service   │
                                          │    (v2.0)    │
                                          │ (Consumes    │
                                          │  all data)   │
                                          └──────────────┘
```

**Critical Path**: User → Medication → Mental
**Parallel Development Possible**: Medication and Mental can be developed concurrently once User service is complete

---

## Technical Standards

### Architecture Principles (from Constitution)

1. **Specification-Driven Development**
   - Write spec.md before implementation
   - Get approval before coding
   - Use `/speckit.clarify` for ambiguities

2. **Test-Driven Development**
   - Write tests first (Red-Green-Refactor)
   - 4-layer testing: Unit → Contract → Integration → E2E
   - 80%+ code coverage requirement

3. **Domain-Driven Design**
   - Each service is a bounded context
   - Independent database per service
   - Event-driven communication between services

4. **Microservices Architecture**
   - Independent deployment
   - API Gateway pattern
   - Service discovery and load balancing

5. **Observability**
   - Structured logging (JSON)
   - Distributed tracing
   - Health check endpoints (`/health`)

6. **Security & Privacy**
   - OAuth 2.0 only (no email/password)
   - JWT for session tokens
   - Data encryption (at rest and in transit)
   - GDPR compliance (data deletion, consent)
   - LLM data masking (PII removal)

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Language | TypeScript | 5.3+ |
| Runtime | Node.js | 20 LTS |
| Backend Framework | NestJS | 10 |
| Web Frontend | Next.js | 14 (App Router) |
| Mobile | React Native/Expo | 0.73 |
| CLI | Commander.js | Latest |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Message Queue | RabbitMQ or AWS SQS | Latest |
| API Gateway | Kong or AWS API Gateway | Latest |
| Testing | Jest, Supertest, Pact, Playwright, Detox | Latest |
| CI/CD | GitHub Actions | - |

---

## Development Workflow

For each new service/feature:

1. **Constitution Review**: Validate alignment with principles
2. **Specification**: `/speckit.specify` - Create spec.md
3. **Clarification**: `/speckit.clarify` - Resolve ambiguities
4. **Planning**: `/speckit.plan` - Technical implementation plan
5. **Task Breakdown**: `/speckit.tasks` - Granular task list
6. **Test First**: Write failing tests
7. **Implementation**: `/speckit.implement` - Execute tasks (Red → Green → Refactor)
8. **Review**: Code review, constitution compliance check
9. **Deploy**: Independent service deployment

---

## Current Status

### Completed
- ✅ Project constitution established (v1.1.0)
- ✅ Bounded contexts defined (6 contexts)
- ✅ Implementation priorities established
- ✅ Nutrition Service specification complete (deferred to v1.1+)
- ✅ Authentication strategy finalized (OAuth 2.0 only)

### In Progress
- 🚧 User Service specification (next step)

### Pending
- ⏳ Medication Service specification
- ⏳ Mental Service specification (task management scope)
- ⏳ Implementation of v1.0 MVP services

---

## Success Metrics (v1.0 MVP)

**User Engagement**:
- Daily active users tracking medication adherence
- Task completion rate via Mental Service
- Multi-platform usage (Web + Mobile + CLI)

**Technical Health**:
- API response time: p95 < 500ms
- Test coverage: >80%
- Zero critical security vulnerabilities
- 99.9% uptime for authentication service

**Feature Adoption**:
- >70% of users set up medication reminders
- >50% of users actively use task management
- Household sharing adoption rate (Nutrition Service, post-v1.0)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| OAuth provider downtime | High (blocks all auth) | Implement retry logic, fallback error pages, status monitoring |
| Cross-service dependency failures | Medium | Circuit breakers, graceful degradation, health checks |
| Data privacy violations | Critical | GDPR compliance audit, data masking for LLM, regular security reviews |
| Mobile offline sync conflicts | Low | Last Write Wins strategy, user notifications for overwrites |
| Scope creep (adding AI too early) | Medium | Strict adherence to roadmap phases, constitution compliance checks |

---

## Next Steps

1. **Immediate** (This Week):
   - [ ] Create User Service specification (`/speckit.specify`)
   - [ ] Clarify User Service edge cases (`/speckit.clarify`)
   - [ ] Generate User Service implementation plan (`/speckit.plan`)

2. **Short-term** (Next 2 Sprints):
   - [ ] Create Medication Service specification
   - [ ] Create Mental Service specification
   - [ ] Begin User Service implementation

3. **Medium-term** (v1.0 MVP):
   - [ ] Complete User, Medication, Mental services
   - [ ] Deploy to production
   - [ ] Gather user feedback

4. **Long-term** (v1.1+):
   - [ ] Implement Nutrition Service (design ready)
   - [ ] Plan Diet Service
   - [ ] Plan AI Service integration

---

## Governance

**Amendment Process**:
- Roadmap updates require alignment with constitution
- Scope changes must be justified with user value or technical necessity
- All changes versioned and tracked in this document

**Quarterly Review**:
- Validate roadmap against actual progress
- Adjust priorities based on user feedback and market conditions
- Review technical debt and plan remediation

**Complexity Tracking**:
- Any deviation from constitution principles must be documented
- Technical debt logged as GitHub Issues
- Quarterly debt review and resolution planning

---

**Version**: 1.0.0
**Ratified**: 2026-01-02
**Next Review**: 2026-04-01

---

## Appendix: Feature Specifications

### Completed Specifications

1. **Nutrition Service (001-household-inventory)**
   - Location: `specs/001-household-inventory/`
   - Status: Complete, implementation deferred
   - Documents:
     - `spec.md` - Feature requirements
     - `plan.md` - Implementation plan
     - `research.md` - Technology decisions
     - `data-model.md` - Database schema
     - `contracts/inventory-api.yaml` - OpenAPI specification
     - `quickstart.md` - Developer guide

### Pending Specifications

2. **User Service** (Next)
3. **Medication Service**
4. **Mental Service** (Task Management)
