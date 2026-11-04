# ProofFlow - POD Management System

**Public repository:** https://github.com/Srikanthnaidu13/proofflow-pod-management

## Overview

ProofFlow is a demonstration Proof of Delivery (POD) management application designed to help transport operations teams capture, verify, track, and process delivery documents.

## Features
- Driver POD capture with GPS and timestamps where available
- Hired-driver POD upload interface
- Image compression and offline capture queue
- Gemini AI-assisted POD document checks
- Human review and approval workflow
- Billing queue with CSV export
- Missing POD monitoring dashboard
- Client POD viewing portal
- Daily trip CSV import
- Mock hired-driver upload links

## Technology Stack
- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- Google Gemini API
- IndexedDB
- Zod
- Lucide React

## Getting Started

### Prerequisites
- Node.js 20.9 or later
- npm
- Git

### Installation

```bash
git clone https://github.com/Srikanthnaidu13/proofflow-pod-management.git
cd proofflow-pod-management
npm ci
```

### Environment Variable

Create .env.local in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

Keep API keys private. Never commit .env.local.

### Start Development Server

```bash
npm run dev
```

Open http://localhost:3000.

## Main Routes
| Route | Description |
|---|---|
| /dashboard | Operations dashboard |
| /driver | Driver POD capture |
| /upload-pod | Hired-driver upload |
| /review | POD review queue |
| /billing | Billing queue |
| /missing-pods | Missing POD dashboard |
| /client-pod | Client POD portal |

## Documentation
- [Deployment Guide](deployment.md)

## Demo Limitations

This is a functional demonstration, not a production-ready deployment. Data is stored in browser IndexedDB. SMS delivery, shared cloud storage, production authentication, and certified Tally integration are not implemented. AI output requires human review.

Use synthetic POD documents for demonstrations. Do not submit real customer or driver documents until data-handling terms and security controls have been verified.

## Quality Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Live Demo

https://proofflow-pod-management.vercel.app/
