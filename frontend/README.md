# Nexus ResQ — Frontend Application

Modern React 19 + Vite + Tailwind CSS v4 client application for the **Nexus ResQ** AI-Powered Disaster Intelligence & Emergency Response Platform.

## Features & Roles

- 🏠 **Government-Grade Landing Page** (`/`): Emergency-first portal with instant citizen help entry.
- 🆘 **Citizen Emergency Portal** (`/citizen`, `/citizen/alerts`, `/citizen/shelters`, `/citizen/routes`): Emergency SOS trigger, real-time alerts, nearby shelters, and safe route navigation.
- 🚨 **Emergency SOS Flow** (`/emergency`, `/sos`): Streamlined location capture, emergency classification, and dispatch tracking.
- ⚡ **Authority / Command Center** (`/command`):
  - Spatial situation overview & ResQ Sphere
  - Complete 11-Agent Orchestration graph & live execution pipeline
  - Human-in-the-Loop decision approval modal (`Allow / Approve` or `Reject / Deny`)
  - Incident triage and regional evacuation operations
- 🚑 **Responder Field Portal** (`/responder`): Real-time mission queue, turn-by-turn navigation, resource requests, and status reporting.
- 📦 **Resource Manager Portal** (`/resources`): Fleet tracking (ambulances, boats), critical supply levels, and dispatch fulfillment.
- 🔒 **Role-Based Access Control (RBAC)** (`/login`, `/signup`): Strict role guards ensuring users only access their authorized workspace.

## Getting Started

### Prerequisites
- Node.js >= 18
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Starts the Vite dev server at `http://localhost:5173`.

### Production Build
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` folder.
