# Prior Authorization Triage & Policy Companion

> AI-assisted healthcare authorization platform for insurance providers and medical professionals

## Overview

**Prior Authorization Triage & Policy Companion** is a professional, modern React frontend application designed for healthcare insurance platforms. It streamlines the prior authorization process by combining:

- **Provider-friendly** request submission workflows
- **Reviewer-optimized** decision support dashboards  
- **AI-powered** recommendation engine with explainable decisions
- **Policy-driven** validation and analysis
- **Human-in-the-loop** final decision making

## Features

### For Providers
✅ Dashboard with request metrics and trends
✅ Multi-step authorization request creation
✅ Request tracking and status monitoring
✅ Document upload support
✅ Notification system
✅ Profile management

### For Insurance Reviewers
✅ Comprehensive reviewer dashboard
✅ Review queue with AI recommendations
✅ Complete request details with validation
✅ Policy analysis and references
✅ Explainable AI insights
✅ Audit trail tracking
✅ Policy library management
✅ Analytics and reporting

### Platform Features
✅ Professional healthcare enterprise UI
✅ Full dark mode support
✅ Role-based access control
✅ Responsive design (mobile, tablet, desktop)
✅ Mock data for demo purposes
✅ localStorage-based session persistence

## Tech Stack

- **React** 19.2.8
- **Vite** 8.2.1
- **TypeScript** 5
- **React Router** 7.18.2
- **Tailwind CSS** 4
- **Recharts** 3.10.1
- **Lucide React** 1.31.0

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd priorauth-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Access Application
Open [http://localhost:5173](http://localhost:5173) in your browser.

## Demo Credentials

### Healthcare Provider
```
Email: provider@demo.com
Password: Provider@123
```

### Insurance Reviewer
```
Email: reviewer@demo.com
Password: Reviewer@123
```

## Project Structure

```
src/
├── pages/              # Page components
│   ├── auth/           # Login page
│   ├── provider/       # Provider pages
│   ├── reviewer/       # Reviewer pages
│   └── shared/         # Shared pages
├── components/         # Reusable components
│   ├── layout/         # Main layout components
│   └── ui/             # Common UI components
├── context/            # React Context
├── lib/                # Utilities and mock data
└── App.tsx             # Main app component
```

## Available Routes

### Provider Routes
- `/provider/dashboard` - Dashboard
- `/provider/create-request` - Create authorization
- `/provider/requests` - Request list
- `/provider/requests/:id` - Request details

### Reviewer Routes
- `/reviewer/dashboard` - Dashboard
- `/reviewer/review-queue` - Pending queue
- `/reviewer/requests` - All requests
- `/reviewer/requests/:id` - Request details
- `/reviewer/policies` - Policy library
- `/reviewer/analytics` - Analytics
- `/reviewer/audit-trail` - Audit trail

## Key Features

✅ Email-based authentication
✅ Role-based access control (2-role system)
✅ Session persistence
✅ Dark mode support
✅ Responsive design
✅ Real chart visualizations
✅ Mock healthcare data
✅ Professional enterprise UI

## Implementation Status

- ✅ **Phase 1**: Core architecture and authentication
- ✅ **Phase 5**: Dashboard implementations (Provider & Reviewer)
- ⏳ **In Progress**: Forms, data tables, and detailed pages

See [REFACTORING_STATUS.md](./REFACTORING_STATUS.md) for detailed implementation status.

## Development Notes

This project is built with a focus on:
- Professional healthcare UI/UX
- Production-ready code structure
- Easy backend integration
- Enterprise-level accessibility
- Performance optimization

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

---

**Version**: 0.1.0  
**Last Updated**: August 18, 2026
