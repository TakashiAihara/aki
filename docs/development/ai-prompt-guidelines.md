# AI Prompt Guidelines

This document outlines the conventions and guidelines for using AI in the Akimi project.

## General Principles

1. **Context Awareness**: Always provide the AI with sufficient context about the project structure, technology stack, and current task status.
2. **Constitution Alignment**: Ensure all AI-generated code and decisions align with `ROADMAP.md` and project constitution.
3. **No Placeholders**: AI should generate complete, working code. Avoid comments like `// implement logic here` unless it's a specific boilerplate task.

## Prompting Conventions

### Code Generation

* **Language**: Use TypeScript (Strict mode).
* **Frameworks**: NestJS (Backend), Next.js (Web), React Native/Expo (Mobile).
* **Style**: Follow the existing ESLint and Prettier configurations.
* **Documentation**: Include JSDoc for complex functions and classes.

### Architecture Decisions

* Refer to `docs/adr` for past decisions.
* When proposing a new architectural change, suggest creating a new ADR.

## Phase Transition (Phase 0 -> Phase 1 -> Phase 2)

* **Phase 0 (Prototype/Spec)**: Focus on clarity and feasibility.
* **Phase 1 (Foundation)**: Focus on robustness, type safety, and core services (User, Medication).
* **Phase 2 (Intelligence)**: Ready for AI integration (data masking, clean APIs).

## Dealing with Ambiguity

* If requirements are unclear, the AI should ask clarifying questions before generating code (using `/speckit.clarify` concept).
