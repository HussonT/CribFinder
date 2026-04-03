# CribFinder - Product Requirements Document

## 1. Overview

**CribFinder** is a collaborative apartment/housing search platform that aggregates listings from multiple sources (Craigslist, Zillow, Facebook Groups, etc.), provides AI-assisted outreach to landlords/brokers, and enables friends to collaborate on a shared housing search via shortlists and a shared messaging inbox.

### Vision
Eliminate the chaos of apartment hunting across dozens of tabs, group chats, and scattered messages. One app to find, evaluate, share, and act on listings — fast.

---

## 2. Target Users

- **Primary:** Young professionals and groups of friends searching for apartments in major cities (starting with New York).
- **Secondary:** Relocators, students, and anyone tired of manually scouring multiple listing platforms.

---

## 3. Core Features

### 3.1 Multi-Source Listing Aggregation

**Goal:** Pull listings from every meaningful source into a single, normalized feed.

#### Supported Sources (Phase 1)
| Source | Type | Scraping Approach |
|--------|------|-------------------|
| Zillow | API / RSS | Official API or structured data parsing |
| Craigslist | RSS / HTML | RSS feeds first, HTML scrape fallback |
| Facebook Marketplace & Groups | Scrape | Graph API where possible, browser automation fallback |
| Apartments.com | HTML | Structured data / HTML parsing |
| StreetEasy | HTML | Structured data / HTML parsing |
| Realtor.com | API / HTML | API if available, HTML fallback |

#### Scraping Waterfall Strategy

Each source adapter follows a **tiered complexity waterfall**, always attempting the simplest method first before escalating:

```
Level 1: Official API / RSS Feed
  ↓ (if unavailable or rate-limited)
Level 2: Structured Data Parsing (JSON-LD, OpenGraph, schema.org)
  ↓ (if unavailable)
Level 3: HTML DOM Parsing (BeautifulSoup / Cheerio-style)
  ↓ (if blocked by anti-bot / JS-rendered)
Level 4: Headless Browser Automation (Playwright / Puppeteer)
  ↓ (if blocked by CAPTCHAs / advanced anti-bot)
Level 5: Browser Vision (Screenshot + AI vision to extract data)
```

#### Normalized Listing Schema
Every listing, regardless of source, is normalized to:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal unique ID |
| `source` | enum | Origin platform |
| `source_url` | string | Original listing URL |
| `title` | string | Listing title |
| `price` | number | Monthly rent (USD) |
| `bedrooms` | number | Bedroom count |
| `bathrooms` | number | Bathroom count |
| `sqft` | number? | Square footage (if available) |
| `address` | string | Full address |
| `neighborhood` | string | Neighborhood / area |
| `city` | string | City |
| `state` | string | State |
| `zip` | string | Zip code |
| `latitude` | float? | Geo coordinates |
| `longitude` | float? | Geo coordinates |
| `images` | string[] | Array of image URLs |
| `description` | string | Full listing description |
| `amenities` | string[] | Parsed amenities |
| `contact_name` | string? | Landlord / broker name |
| `contact_phone` | string? | Phone number |
| `contact_email` | string? | Email address |
| `contact_method` | enum | Preferred contact method |
| `pet_policy` | string? | Pet policy info |
| `available_date` | date? | Move-in date |
| `lease_term` | string? | Lease length |
| `posted_at` | datetime | When originally posted |
| `scraped_at` | datetime | When we captured it |
| `raw_data` | JSON | Original unprocessed payload |

### 3.2 Smart Search & Filters

- **Location:** City, neighborhood, radius from a point, commute time to a workplace
- **Price:** Min/max rent, price per bedroom
- **Size:** Bedrooms, bathrooms, sqft
- **Amenities:** Laundry, dishwasher, parking, pet-friendly, elevator, rooftop, etc.
- **Source:** Filter by origin platform
- **Date:** Posted within last N days
- **Saved Searches:** Save filter combinations, get notifications on new matches
- **Map View:** See listings on a map with clustering
- **Deduplication:** Detect and merge duplicate listings across sources

### 3.3 Collaborative Shortlists

- **Create Shortlists:** Named lists (e.g., "East Village Options", "Under $3k")
- **Invite Friends:** Share shortlists via invite link or email. Friends create accounts and join.
- **Reactions & Notes:** Each member can:
  - Vote (thumbs up / thumbs down / heart)
  - Leave comments on individual listings
  - Tag listings (e.g., "tour scheduled", "applied", "rejected")
- **Activity Feed:** See what friends added, voted on, or commented recently
- **Status Tracking:** Move listings through a pipeline: `New → Interested → Contacted → Tour Scheduled → Applied → Accepted / Rejected`

### 3.4 Shared Messaging Inbox

A unified inbox where the group can see and manage all outreach to landlords/brokers.

- **Shared Threads:** Every conversation with a landlord is visible to all shortlist members
- **Assignment:** Assign a thread to a specific person ("You handle this one")
- **Status:** Mark threads as `Needs Response`, `Waiting`, `Closed`
- **Multi-Channel:**
  - Email (send/receive via connected email or app-generated alias)
  - SMS (via Twilio or similar)
  - In-app messaging (for platforms that support it)
- **Notification Routing:** Alerts via Telegram and/or WhatsApp when a landlord responds

### 3.5 AI-Assisted Outreach & Messaging

- **Auto-Draft Messages:** When you want to reach out about a listing, AI generates a personalized first message based on:
  - The listing details
  - Your search preferences / profile
  - The contact method (formal email vs casual text)
  - Best practices for NYC apartment hunting
- **Quick Replies:** When a landlord responds, AI suggests reply options:
  - Schedule a tour
  - Ask follow-up questions
  - Express continued interest
  - Politely decline
- **Tone Control:** Toggle between formal / friendly / brief
- **Response Speed Alerts:** Notify you immediately when a landlord replies so you can respond fast (critical in competitive markets)
- **Bulk Outreach:** Select multiple listings and send personalized messages in batch (with rate limiting to avoid spam flags)

### 3.6 Notification Integrations

- **Telegram Bot:** Real-time notifications for:
  - New listings matching saved searches
  - Landlord replies
  - Friend activity on shortlists
- **WhatsApp Integration:** Same notifications via WhatsApp (using WhatsApp Business API)
- **User Preference:** Each user picks their preferred notification channel

---

## 4. User Flows

### 4.1 Onboarding
1. Sign up (email, Google, or Apple)
2. Set location (default: New York)
3. Set basic preferences (budget, bedrooms, neighborhoods)
4. See initial feed of matching listings

### 4.2 Daily Use
1. Open app → see new listings since last visit
2. Swipe/browse → add favorites to a shortlist
3. Tap "Reach Out" → AI drafts message → user reviews and sends
4. Landlord replies → notification on Telegram/WhatsApp → respond from shared inbox
5. Schedule tour → update listing status

### 4.3 Collaboration
1. Create shortlist → invite friends via link
2. Friends browse and vote
3. Group discusses in listing comments
4. Assign outreach responsibility
5. Everyone sees conversation status

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router) | SSR, React Server Components, great DX |
| **Mobile** | React Native (Expo) or PWA | Code sharing with web; PWA for v1 |
| **Backend API** | Next.js API Routes + tRPC | Type-safe API, co-located with frontend |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data, PostGIS for geo queries |
| **Auth** | NextAuth.js / Supabase Auth | Social login, magic links |
| **Real-time** | Supabase Realtime or Pusher | Live updates for inbox, notifications |
| **Queue / Jobs** | BullMQ + Redis | Scraping jobs, message scheduling |
| **Scraping** | Node.js workers with tiered adapters | Waterfall strategy per source |
| **Browser Automation** | Playwright | Level 4-5 scraping |
| **AI** | Claude API (Anthropic) | Message drafting, listing analysis, vision |
| **File Storage** | S3 / Cloudflare R2 | Listing images, cached screenshots |
| **Notifications** | Telegram Bot API + WhatsApp Business API | Real-time alerts |
| **Email** | SendGrid / Resend | Outreach emails, transactional |
| **SMS** | Twilio | Text-based outreach |
| **Deployment** | Vercel (frontend) + Railway/Fly.io (workers) | Serverless frontend, persistent workers |

### 5.2 Scraping Architecture

```
┌─────────────────────────────────────────────────┐
│                 Scraping Orchestrator            │
│  (BullMQ scheduler - runs per source on cron)   │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │   Source Adapter     │  (one per platform)
    │                      │
    │  ┌── L1: API/RSS ──┐│
    │  ├── L2: Struct.  ──┤│
    │  ├── L3: HTML     ──┤│
    │  ├── L4: Headless ──┤│
    │  └── L5: Vision   ──┘│
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   Normalizer         │  → Normalized Listing Schema
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   Deduplication      │  → Fuzzy matching on address + price + images
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   Database + Index   │  → PostgreSQL + search index
    └─────────────────────┘
```

### 5.3 Data Model (Key Entities)

```
User
├── id, email, name, avatar
├── preferred_notification_channel (telegram | whatsapp | email)
├── telegram_chat_id?
└── search_preferences (JSON)

Shortlist
├── id, name, created_by
├── members: User[] (with roles: owner | member)
└── listings: ShortlistListing[]

ShortlistListing
├── shortlist_id, listing_id
├── status: new | interested | contacted | tour_scheduled | applied | accepted | rejected
├── votes: Vote[]
└── comments: Comment[]

Listing (normalized schema from §3.1)

Conversation
├── id, listing_id, shortlist_id?
├── participants: User[]
├── assigned_to: User?
├── channel: email | sms | in_app
├── status: needs_response | waiting | closed
└── messages: Message[]

Message
├── id, conversation_id
├── direction: inbound | outbound
├── content, sent_at
├── ai_drafted: boolean
└── sent_by: User?
```

---

## 6. Additional Features (You Didn't Mention, But Should Have)

### 6.1 Scam Detection
- AI analyzes listings for common scam signals (price too good to be true, stolen photos, suspicious contact info, requesting wire transfers)
- Flag suspicious listings with warnings

### 6.2 Listing Quality Score
- AI scores each listing based on completeness, photo quality, price fairness for the area, and landlord responsiveness history

### 6.3 Commute Calculator
- Input workplace address → see commute time for each listing via transit/bike/car
- Powered by Google Maps or Mapbox Directions API

### 6.4 Price Insights
- Show median rent for the neighborhood/bedroom count
- Flag listings that are notably above or below market
- Rent trend data over time

### 6.5 Document Vault
- Store and share rental application documents (pay stubs, ID, references) securely
- One-click send to landlords when applying

### 6.6 Tour Scheduler
- Propose available times to landlords
- Calendar integration (Google Calendar)
- Route optimization if touring multiple apartments in one day

### 6.7 Neighborhood Intel
- AI-generated neighborhood summaries
- Safety scores, walkability, nightlife, grocery proximity
- Sourced from public data + community reviews

### 6.8 Lease Analyzer
- Upload a lease PDF → AI highlights unusual clauses, red flags, and key terms
- Compare against standard NYC lease terms

### 6.9 Application Tracker
- Track where you've applied, deadlines, required documents
- Reminders for follow-ups

### 6.10 Browser Extension
- "Save to CribFinder" button when browsing listings on any site
- Auto-extracts listing data from the current page

---

## 7. Phased Rollout

### Phase 1 - MVP (Weeks 1-4)
- [ ] Core listing aggregation (Craigslist RSS + Zillow + StreetEasy HTML)
- [ ] Normalized listing database
- [ ] Basic search & filter UI
- [ ] Map view
- [ ] User auth
- [ ] Single shortlist with invite link
- [ ] Basic AI message drafting (Claude API)
- [ ] Email-based outreach

### Phase 2 - Collaboration (Weeks 5-8)
- [ ] Multiple shortlists
- [ ] Voting & comments
- [ ] Shared inbox with conversation threads
- [ ] Listing status pipeline
- [ ] Telegram notifications
- [ ] Deduplication engine

### Phase 3 - Advanced Scraping & AI (Weeks 9-12)
- [ ] Facebook Groups scraping (browser automation)
- [ ] Full waterfall scraping with Playwright fallback
- [ ] Vision-based extraction (screenshot → AI → data)
- [ ] AI quick replies
- [ ] Scam detection
- [ ] WhatsApp integration

### Phase 4 - Polish & Growth (Weeks 13-16)
- [ ] Commute calculator
- [ ] Price insights
- [ ] Neighborhood intel
- [ ] Lease analyzer
- [ ] Browser extension
- [ ] Document vault
- [ ] Mobile PWA optimization
- [ ] Multi-city support

---

## 8. Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Listings aggregated | 50,000+ active NYC listings |
| Response rate (AI-drafted messages) | >40% |
| Time from listing posted → user contacted | <2 hours (for saved searches) |
| Shortlist invites accepted | >70% |
| User retention (weekly active) | >50% at 30 days |

---

## 9. Legal & Compliance Considerations

- **Terms of Service Compliance:** Respect robots.txt; use official APIs where available; implement rate limiting
- **Data Privacy:** CCPA/GDPR compliant data handling; users can delete their data
- **Fair Housing:** No discriminatory filtering; comply with Fair Housing Act
- **Anti-Spam:** Rate-limit outreach; comply with CAN-SPAM for emails
- **Scraping Ethics:** Cache aggressively to minimize load on source sites; identify as a bot in User-Agent where required

---

## 10. Open Questions

1. **Monetization model?** Freemium (limited shortlists/outreach on free tier)? Subscription? Per-search?
2. **Should we support broker listings or focus on no-fee/FSBO?** NYC market has both.
3. **Native mobile app or PWA first?** PWA is faster to ship; native gives better notifications.
4. **Multi-city from day one or NYC-only MVP?** Recommend NYC-only for focus.
5. **Should the shared inbox support voice/video calls?** Could be useful for virtual tours.
