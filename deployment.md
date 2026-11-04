# ProofFlow - Deployment Guide

## Project Overview

ProofFlow is a demonstration Proof of Delivery management application for transport operations.

## Technology Stack

- Next.js 16.4.3
- React 19.3
- TypeScript 5
- Tailwind CSS 4
- Google Gemini API
- IndexedDB

## Installation

Clone the repository:

```bash
git clone https://github.com/Srikanthnaidu13/proofflow-pod-management.git
cd proofflow-pod-management
npm ci
```

## Application Features
- Driver POD capture and hired-driver upload
- GPS and timestamp capture where available
- Image compression and offline capture queue
- Gemini AI-assisted POD verification
- Human review and approval workflow
- Billing queue and CSV export
- Missing POD dashboard
- Client POD portal
- Daily trip CSV import
- Mock hired-driver upload links

## Prerequisites
- Node.js 20.9 or later
- npm and Git
- Modern browser such as Chrome or Edge

## Environment Configuration
Create .env.local in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

Never commit .env.local or expose the API key in client-side code. Use synthetic POD documents for demonstrations until data-handling terms are verified.

## Run Locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Application Routes
| Route | Purpose |
|---|---|
| / | Landing page |
| /dashboard | Operations dashboard |
| /driver | Driver POD capture |
| /upload-pod?trip=TRP-66120 | Hired-driver upload |
| /review | AI-assisted review queue |
| /billing | Billing queue and CSV export |
| /missing-pods | Missing POD monitoring |
| /client-pod?trip=TRP-66120 | Client POD portal |
| /api/analyze-pod | Gemini analysis endpoint |

## Demo Data
Trip records are stored in browser IndexedDB. Data is local to the browser and is not shared across devices.

Sample CSV files: sample-trips.csv and sample-trips-2.csv.
Required CSV columns: id, client, vehicle, destination, amount, lrNumber, ewayBill, branch.

## AI Verification
Gemini checks LR number, consignee stamp, quantity received, shortage or damage remarks, delivery date and signature presence.
AI output assists the reviewer. Human approval is required before a POD is treated as verified.

## Demonstration Limitations
- Browser IndexedDB is used instead of a shared production database.
- POD images are stored locally in the browser.
- Shared cloud document storage is not implemented.
- SMS delivery is simulated.
- Upload links are not secure expiring links.
- Production authentication and authorization are not implemented.
- CSV export is a demonstration, not a certified Tally integration.
- Automatic invoice creation and sending are not implemented.
- Production monitoring, backups and security controls remain future work.

## Production Deployment
Before production use, implement authentication, authorization, shared database storage, secure document storage, real SMS integration, expiring client links, monitoring, backups, rate limiting and audit logging.
Verify India-region hosting availability for the selected provider and plan. Review applicable privacy and data-protection obligations.

## Verification
```bash
npm run lint
npx tsc --noEmit
npm run build
```

ProofFlow | Demonstration Deployment Guide

## Live Demo

https://proofflow-pod-management.vercel.app/
