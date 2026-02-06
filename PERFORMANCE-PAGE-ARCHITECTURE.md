# Performance Page - Architecture & Workflow

## System Architecture

```mermaid
flowchart TB
    User[Admin User]
    UI[Performance Page UI]
    ScanAPI[Scan API Route]
    AnalyzeAPI[Analyze API Route]
    HistoryAPI[History API Route]
    PSI[PageSpeed Insights API]
    Claude[Claude AI API]
    DB[(PostgreSQL Database)]
    
    User -->|1. Select page type| UI
    User -->|2. Click Run Scan| UI
    UI -->|3. POST /scan| ScanAPI
    ScanAPI -->|4. Request analysis| PSI
    PSI -->|5. Return metrics| ScanAPI
    ScanAPI -->|6. Store results| DB
    ScanAPI -->|7. Return scan data| UI
    UI -->|8. Display scores| User
    
    User -->|9. Click Analyze with AI| UI
    UI -->|10. POST /analyze| AnalyzeAPI
    AnalyzeAPI -->|11. Fetch scan data| DB
    AnalyzeAPI -->|12. Send for analysis| Claude
    Claude -->|13. Return recommendations| AnalyzeAPI
    AnalyzeAPI -->|14. Store recommendations| DB
    AnalyzeAPI -->|15. Return to UI| UI
    UI -->|16. Display recommendations| User
    
    UI -->|Load history| HistoryAPI
    HistoryAPI -->|Fetch scans| DB
    HistoryAPI -->|Return list| UI
```

## Data Flow

### 1. Scan Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI as Performance Page
    participant API as Scan API
    participant PSI as PageSpeed Insights
    participant DB as Database
    
    User->>UI: Select page type & click "Run Scan"
    UI->>UI: Show loading state
    UI->>API: POST /api/admin/performance/scan
    API->>PSI: Request PageSpeed analysis
    Note over PSI: Analysis takes 30-60s
    PSI->>API: Return Lighthouse results
    API->>API: Extract scores & metrics
    API->>DB: INSERT scan results
    DB->>API: Return scan ID
    API->>UI: Return scan data + opportunities
    UI->>User: Display scores & metrics
```

### 2. AI Analysis Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI as Performance Page
    participant API as Analyze API
    participant DB as Database
    participant Claude as Claude AI
    
    User->>UI: Click "Analyze with AI"
    UI->>UI: Show analyzing state
    UI->>API: POST /api/admin/performance/analyze
    API->>DB: Fetch scan data
    DB->>API: Return raw PageSpeed results
    API->>API: Build analysis prompt
    API->>Claude: Send prompt with scan data
    Note over Claude: AI analysis ~5-10s
    Claude->>API: Return recommendations JSON
    API->>DB: UPDATE scan with recommendations
    API->>UI: Return recommendations
    UI->>User: Display prioritized recommendations
```

## Database Schema

```mermaid
erDiagram
    PERFORMANCE_SCANS {
        int id PK
        varchar page_type
        text page_url
        timestamp scan_date
        int performance_score
        int accessibility_score
        int best_practices_score
        int seo_score
        decimal fcp
        decimal lcp
        decimal cls
        decimal tbt
        decimal si
        jsonb raw_data
        jsonb ai_recommendations
        timestamp ai_analyzed_at
        varchar status
        text error_message
        timestamp created_at
        timestamp updated_at
    }
```

## Component Structure

```
app/
├── admin/
│   └── performance/
│       └── page.tsx                    # Main UI component
│
├── api/
│   └── admin/
│       └── performance/
│           ├── scan/
│           │   └── route.ts            # PageSpeed integration
│           ├── analyze/
│           │   └── route.ts            # AI analysis
│           ├── history/
│           │   └── route.ts            # Fetch scans
│           └── [id]/
│               └── route.ts            # Get/delete scan
│
components/
├── admin/
│   ├── AdminLayout.tsx                 # Updated with nav item
│   ├── Sidebar.tsx                     # Updated with icon
│   ├── StatCard.tsx                    # Used for scores
│   └── DataTable.tsx                   # Used for tables
│
lib/
└── db/
    └── schema/
        └── performance-scans.sql       # Database schema
```

## API Endpoints

### POST /api/admin/performance/scan

**Request:**
```json
{
  "pageType": "homepage" | "collection" | "product" | "custom",
  "customUrl": "https://..." // optional, for custom type
}
```

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": 1,
    "page_type": "homepage",
    "page_url": "https://www.theequestrian.com.au",
    "scan_date": "2026-02-06T12:00:00Z",
    "performance_score": 85,
    "accessibility_score": 92,
    "best_practices_score": 88,
    "seo_score": 95,
    "fcp": 1.2,
    "lcp": 2.1,
    "cls": 0.05,
    "tbt": 150,
    "si": 1.8
  },
  "opportunities": [...],
  "diagnostics": [...]
}
```

### POST /api/admin/performance/analyze

**Request:**
```json
{
  "scanId": 1
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "summary": "The main performance issues are...",
    "priority_issues": [
      {
        "title": "Large images slowing LCP",
        "severity": "high",
        "impact": "Reduce LCP by 0.8s",
        "metric": "LCP"
      }
    ],
    "recommendations": [
      {
        "title": "Optimize images with Next.js Image",
        "priority": "high",
        "category": "images",
        "description": "Use Next.js Image component...",
        "code_example": "import Image from 'next/image'...",
        "file_location": "components/ProductCard.tsx",
        "expected_impact": "Reduce LCP by 0.5s",
        "implementation_notes": "Test on staging first"
      }
    ]
  }
}
```

### GET /api/admin/performance/history

**Query Parameters:**
- `pageType` (optional): Filter by page type
- `limit` (optional): Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "scans": [
    {
      "id": 1,
      "page_type": "homepage",
      "page_url": "https://...",
      "scan_date": "2026-02-06T12:00:00Z",
      "performance_score": 85,
      "accessibility_score": 92,
      "best_practices_score": 88,
      "seo_score": 95,
      "status": "completed",
      "ai_analyzed_at": "2026-02-06T12:05:00Z"
    }
  ]
}
```

### GET /api/admin/performance/[id]

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": 1,
    "page_type": "homepage",
    "page_url": "https://...",
    "scan_date": "2026-02-06T12:00:00Z",
    "performance_score": 85,
    "raw_data": {...},
    "ai_recommendations": {...}
  }
}
```

### DELETE /api/admin/performance/[id]

**Response:**
```json
{
  "success": true,
  "message": "Scan deleted"
}
```

## User Journey

```mermaid
flowchart TD
    Start[User visits /admin/performance]
    SelectType[Select page type]
    CustomURL{Custom URL?}
    EnterURL[Enter custom URL]
    RunScan[Click Run Scan]
    WaitScan[Wait 30-60s]
    ViewResults[View scores & metrics]
    AnalyzeAI{Want AI help?}
    ClickAnalyze[Click Analyze with AI]
    WaitAI[Wait 5-10s]
    ViewRecs[View recommendations]
    ClickRec[Click recommendation]
    ViewModal[View code example]
    CopyCode[Copy code]
    TestLocal[Test locally]
    Deploy[Deploy to production]
    RunNewScan[Run new scan to verify]
    End[Done]
    
    Start --> SelectType
    SelectType --> CustomURL
    CustomURL -->|Yes| EnterURL
    CustomURL -->|No| RunScan
    EnterURL --> RunScan
    RunScan --> WaitScan
    WaitScan --> ViewResults
    ViewResults --> AnalyzeAI
    AnalyzeAI -->|Yes| ClickAnalyze
    AnalyzeAI -->|No| End
    ClickAnalyze --> WaitAI
    WaitAI --> ViewRecs
    ViewRecs --> ClickRec
    ClickRec --> ViewModal
    ViewModal --> CopyCode
    CopyCode --> TestLocal
    TestLocal --> Deploy
    Deploy --> RunNewScan
    RunNewScan --> End
```

## Safety Architecture

The system is designed with multiple safety layers:

```mermaid
flowchart LR
    AI[AI Generates Code]
    Display[Display to User]
    Review[Human Review]
    Copy[Copy Code]
    Local[Test Locally]
    Git[Commit to Git]
    Staging[Deploy to Staging]
    Test[Test Thoroughly]
    Prod[Deploy to Production]
    Monitor[Monitor Results]
    
    AI --> Display
    Display --> Review
    Review -->|Approved| Copy
    Review -->|Rejected| Display
    Copy --> Local
    Local --> Git
    Git --> Staging
    Staging --> Test
    Test -->|Pass| Prod
    Test -->|Fail| Local
    Prod --> Monitor
    
    style AI fill:#e1f5ff
    style Review fill:#fff3cd
    style Test fill:#fff3cd
    style Prod fill:#d4edda
```

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **State Management:** React useState/useEffect
- **Type Safety:** TypeScript 5

### Backend
- **API Routes:** Next.js API Routes
- **Database:** Neon PostgreSQL
- **Database Client:** @vercel/postgres
- **Environment:** Node.js

### External APIs
- **PageSpeed Insights:** Google PageSpeed Insights API v5
- **AI Analysis:** Anthropic Claude API (claude-3-5-sonnet)

### Infrastructure
- **Hosting:** Vercel
- **Database:** Neon (PostgreSQL)
- **CDN:** Vercel Edge Network

## Performance Considerations

### API Response Times
- **Scan API:** 30-60 seconds (PageSpeed limitation)
- **Analyze API:** 5-10 seconds (Claude processing)
- **History API:** < 100ms (database query)
- **Get Scan API:** < 100ms (database query)

### Database Queries
- All queries use indexes for optimal performance
- JSONB columns for flexible data storage
- Timestamps for efficient sorting and filtering

### Caching Strategy
- Scan results stored in database
- No client-side caching (always fresh data)
- Consider adding Redis cache for frequently accessed scans (future enhancement)

## Security Considerations

### Authentication
- Uses existing admin authentication system
- All routes protected by admin middleware

### API Keys
- Stored in environment variables
- Never exposed to client
- Rotated regularly (recommended)

### Data Privacy
- Scan data stored securely in database
- No PII collected
- URLs scanned are public-facing pages only

### Input Validation
- Page type validated against allowed values
- Custom URLs validated for format
- Scan IDs validated as integers

## Monitoring & Observability

### Metrics to Track
- Scan success rate
- Average scan duration
- AI analysis success rate
- Database query performance
- API error rates

### Logging
- All API errors logged to console
- Failed scans stored with error messages
- Successful operations logged for audit

### Alerts (Future Enhancement)
- Alert on repeated scan failures
- Alert on API quota approaching limit
- Alert on database connection issues

## Scalability

### Current Limits
- PageSpeed API: 25K requests/day (with key)
- Claude API: Based on plan
- Database: Neon free tier (10GB)

### Scaling Considerations
- Add Redis cache for scan results
- Implement request queuing for high volume
- Add rate limiting per user
- Consider batch scanning for multiple pages

## Future Enhancements

### Phase 2 (Potential)
- Scheduled scans (cron jobs)
- Performance budgets
- Trend analysis
- Comparison views
- PDF reports
- Slack/email notifications

### Phase 3 (Potential)
- CI/CD integration
- Automated testing
- A/B testing integration
- Custom metrics tracking
- Team collaboration features

---

**Architecture designed for safety, scalability, and ease of use.**
