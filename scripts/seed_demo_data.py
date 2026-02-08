#!/usr/bin/env python3
"""
Seed realistic demo data for AgentBoard.

Creates 3 projects with 3 boards each, ~30-35 tasks per board,
distributed across statuses with realistic titles/descriptions.

Usage:
    python scripts/seed_demo_data.py                          # uses default API key
    python scripts/seed_demo_data.py --api-key <key>          # custom API key
    python scripts/seed_demo_data.py --base-url http://host   # custom base URL
    python scripts/seed_demo_data.py --clean                  # delete seeded projects first
"""
import argparse
import random
import sys

import requests
from datetime import datetime, timedelta

DEFAULT_BASE = "http://localhost:8000/api/v1"

# ── Project definitions ──────────────────────────────────────────

PROJECTS = [
    {
        "name": "Dungeon Crawler RPG",
        "description": "A 2D roguelike dungeon crawler with procedural generation, pixel art style. Targeting Steam Early Access Q3 2026.",
        "icon": "🎮",
        "color": "#7C3AED",
        "labels": [
            ("gameplay", "#EF4444", "Core gameplay mechanics"),
            ("art", "#F59E0B", "Sprites, animations, VFX"),
            ("audio", "#8B5CF6", "Music and SFX"),
            ("level-design", "#10B981", "Dungeon generation & layout"),
            ("ui/ux", "#3B82F6", "Menus, HUD, inventory screens"),
            ("bug", "#DC2626", "Confirmed bugs"),
            ("optimization", "#6366F1", "Performance improvements"),
            ("networking", "#EC4899", "Multiplayer/co-op features"),
        ],
        "boards": [
            {
                "name": "Core Systems",
                "description": "Engine, combat, inventory, and progression systems",
                "tasks": [
                    ("Implement A* pathfinding for enemy AI", "Enemies need intelligent navigation around obstacles. Use A* with heuristic weighting for dungeon grid.", "high", "gameplay"),
                    ("Design loot table probability system", "Create weighted drop tables with rarity tiers: Common (60%), Uncommon (25%), Rare (10%), Legendary (5%)", "high", "gameplay"),
                    ("Build inventory drag-and-drop system", "Grid-based inventory like Diablo. Support item rotation, stacking, and equipment slots.", "high", "ui/ux"),
                    ("Create character stat calculation engine", "Base stats + equipment bonuses + buff/debuff modifiers. Support STR, DEX, INT, VIT, LCK.", "high", "gameplay"),
                    ("Implement save/load system with versioning", "Binary serialization for game state. Include version header for migration support.", "medium", "gameplay"),
                    ("Add procedural dungeon generation algorithm", "BSP tree room placement + corridor connection. Support themed room templates.", "urgent", "level-design"),
                    ("Implement fog of war system", "Tile-based visibility with raycasting. Track explored vs visible vs hidden states.", "medium", "gameplay"),
                    ("Create status effect framework", "Poison, burn, freeze, stun, bleed. Support stacking, duration, and tick damage.", "medium", "gameplay"),
                    ("Build skill tree UI component", "Branching skill tree with prerequisites. Show locked/unlocked/active states.", "low", "ui/ux"),
                    ("Optimize sprite batching for large rooms", "Current draw calls spike to 800+ in large rooms. Need batching by texture atlas.", "medium", "optimization"),
                    ("Fix collision detection on diagonal movement", "Player clips through corners when moving diagonally. Need corner collision check.", "high", "bug"),
                    ("Implement minimap rendering", "Real-time minimap showing explored areas, enemies, and items. Configurable zoom.", "low", "ui/ux"),
                    ("Add controller support with rebindable inputs", "Support Xbox/PS controllers. Custom input mapping saved per profile.", "medium", "ui/ux"),
                    ("Create particle system for spell effects", "Pool-based particle emitter. Support fire, ice, lightning, and heal VFX.", "medium", "art"),
                    ("Design boss encounter state machine", "Phase-based boss AI with enrage timers. Support telegraph attacks and safe zones.", "high", "gameplay"),
                    ("Implement item enchantment system", "Random stat modifiers on equipment drops. Prefix/suffix naming system.", "medium", "gameplay"),
                    ("Build death/respawn mechanic", "Roguelike permadeath with meta-progression. Unlock persistent upgrades between runs.", "high", "gameplay"),
                    ("Add ambient dungeon sound system", "Distance-based ambient audio. Layer dripping, wind, and creature sounds by biome.", "low", "audio"),
                    ("Create tutorial sequence for new players", "Interactive tutorial covering movement, combat, inventory, and skills in first 3 rooms.", "medium", "ui/ux"),
                    ("Implement enemy spawn wave system", "Timed waves with escalating difficulty. Support elite and champion variants.", "medium", "gameplay"),
                    ("Add screen shake and hit feedback", "Camera shake on impact. Flash enemies white on hit. Controller rumble support.", "low", "art"),
                    ("Profile and fix memory leak in room transitions", "Memory grows ~15MB per room transition. Suspect texture cache not clearing.", "urgent", "bug"),
                    ("Design quest/objective tracking system", "Track main and side objectives. Show progress in HUD and pause menu.", "medium", "gameplay"),
                    ("Build settings menu with graphics options", "Resolution, fullscreen, vsync, particle quality, shadow quality toggles.", "low", "ui/ux"),
                    ("Implement chest and interactable object system", "Chests, levers, pressure plates, breakable walls. Support locked/trapped variants.", "medium", "level-design"),
                    ("Create damage number popup system", "Floating damage numbers with color coding. Crit damage in larger font.", "low", "art"),
                    ("Add multiplayer lobby system", "Host/join games. Show player list, ready status, difficulty selection.", "high", "networking"),
                    ("Implement network state synchronization", "Delta compression for game state. Handle 100ms+ latency gracefully.", "high", "networking"),
                    ("Fix pathfinding crash on rooms larger than 64x64", "Stack overflow in recursive path search. Switch to iterative approach.", "urgent", "bug"),
                    ("Add localization support framework", "String table system supporting EN, TR, DE, FR, JP. Support RTL layouts.", "low", "ui/ux"),
                    ("Create weapon combo attack chains", "Light/heavy attack combos with timing windows. Visual hit indicators.", "medium", "gameplay"),
                    ("Implement trap placement and trigger system", "Spike traps, dart traps, flame jets. Support pressure plates and proximity triggers.", "medium", "level-design"),
                    ("Design potion brewing crafting system", "Combine ingredients for potions. Recipe discovery through experimentation.", "low", "gameplay"),
                    ("Build daily challenge seed system", "Shared daily seed for leaderboard runs. Track completion time and score.", "low", "gameplay"),
                    ("Add tooltip system for items and abilities", "Rich tooltips showing stats, comparisons, and lore text on hover.", "medium", "ui/ux"),
                ],
            },
            {
                "name": "Art & Audio Pipeline",
                "description": "Asset creation, animation, music composition, and SFX",
                "tasks": [
                    ("Create hero character sprite sheet (8 directions)", "32x32 base size, 8 directional walk/run/idle cycles. 60fps animation at 12 frames per cycle.", "high", "art"),
                    ("Design 5 dungeon tilesets (stone, cave, crypt, sewer, temple)", "16x16 tiles with auto-tiling support. Each set needs floor, wall, door, and decoration variants.", "urgent", "art"),
                    ("Compose main menu theme", "Atmospheric orchestral piece, 2-3 min loop. Dark fantasy mood with choir elements.", "medium", "audio"),
                    ("Create enemy death animations (10 types)", "Dissolve, explode, fade, melt for each enemy category. 8-12 frames each.", "medium", "art"),
                    ("Record/create 50 combat SFX", "Sword swings, impacts, spells, shields. Layer 3+ samples per sound for variation.", "high", "audio"),
                    ("Design UI icon set (weapons, potions, scrolls)", "24x24 pixel art icons. Need 80+ unique items covering all equipment categories.", "high", "art"),
                    ("Animate boss intro cutscenes (3 bosses)", "2-3 second intro sequences. Camera pan to boss, name card, health bar reveal.", "medium", "art"),
                    ("Create environmental particle effects", "Dust motes, torch flicker, water drips, cobweb sway. Shader-based where possible.", "low", "art"),
                    ("Compose 4 dungeon biome music tracks", "Looping tracks, 3-4 min each. Stone=heavy, Cave=ambient, Crypt=eerie, Temple=grand.", "high", "audio"),
                    ("Design inventory and equipment screen mockup", "High-fidelity pixel art mockup. Grid inventory + paper doll equipment view.", "medium", "art"),
                    ("Create footstep sounds for 6 terrain types", "Stone, wood, water, gravel, grass, carpet. 4 variations each to avoid repetition.", "low", "audio"),
                    ("Animate treasure chest opening sequence", "Lid opening with glow effect. Different tiers: wood, iron, gold, legendary.", "low", "art"),
                    ("Design minimap icons and markers", "Player arrow, enemy dots, chest icons, exit marker, quest indicators. Readable at 4x4px.", "medium", "art"),
                    ("Create ambient sound layers for each biome", "Background atmospheres: dripping water, wind howl, distant screams, chanting.", "medium", "audio"),
                    ("Sprite hero armor variants (4 tiers)", "Cloth, leather, chain, plate visual overlays on base sprite. All 8 directions.", "high", "art"),
                    ("Design damage type visual indicators", "Fire=orange glow, ice=blue crystals, poison=green bubbles, lightning=white flash.", "medium", "art"),
                    ("Create level-up celebration VFX", "Radial light burst, stat text pop, brief golden aura. Satisfying but not disruptive.", "low", "art"),
                    ("Record UI interaction sounds", "Menu open/close, button hover, equip item, level up chime, error buzz. 20+ sounds.", "low", "audio"),
                    ("Design title screen and logo animation", "Flickering torch-lit logo reveal. Seamless loop into idle state.", "medium", "art"),
                    ("Create NPC dialogue portrait set (12 NPCs)", "64x64 pixel art portraits with 3 expressions each: neutral, happy, concerned.", "medium", "art"),
                    ("Animate spell casting effects (8 spells)", "Fireball, ice shard, lightning bolt, heal, shield, teleport, poison cloud, earth spike.", "high", "art"),
                    ("Mix and master boss battle music (3 tracks)", "Intense tracks with phase transitions. 160+ BPM, heavy percussion, dynamic layers.", "high", "audio"),
                    ("Create death screen and game over jingle", "Somber 3-second sting. Fade to dark with retry/quit options.", "low", "audio"),
                    ("Design crafting station UI animation", "Bubbling cauldron with ingredient slots. Brewing progress bar with steam effect.", "low", "art"),
                    ("Create weather effect sprites (rain, snow, fog)", "Overlay particle systems. Performance-friendly with density control.", "medium", "art"),
                    ("Pixel art promotional key art (Steam capsule)", "460x215 and 616x353 capsule images. Hero fighting boss in dramatic lighting.", "medium", "art"),
                    ("Sound design for trap mechanisms", "Pressure plate click, dart whoosh, flame jet roar, spike spring. 15+ trap sounds.", "low", "audio"),
                    ("Animate shop merchant idle and interact", "Merchant NPC with idle breathing, greeting wave, and transaction nod.", "low", "art"),
                    ("Create loading screen illustrations (5)", "Full-screen art pieces showing game lore scenes. Tips text overlay.", "low", "art"),
                    ("Compose victory fanfare for run completion", "Triumphant 5-second jingle with stats reveal underscore.", "low", "audio"),
                ],
            },
            {
                "name": "Release & QA",
                "description": "Testing, CI/CD, Steam integration, and launch prep",
                "tasks": [
                    ("Set up automated build pipeline (GitHub Actions)", "Build for Windows, Linux, macOS. Artifact upload, version tagging, changelog generation.", "high", "optimization"),
                    ("Integrate Steamworks SDK", "Achievements, cloud saves, rich presence, overlay support. Test with partner build.", "urgent", "gameplay"),
                    ("Write unit tests for combat damage calculation", "Cover all damage types, resistances, crits, and status effects. 90%+ coverage.", "medium", "gameplay"),
                    ("Create performance benchmark suite", "Automated tests: 100 enemies, 500 particles, 200 items. Target 60fps on GTX 1060.", "medium", "optimization"),
                    ("Test procedural generation edge cases", "Rooms with no exits, overlapping corridors, impossible paths. Fuzzy testing with 10k seeds.", "high", "level-design"),
                    ("Build crash reporting and analytics system", "Automatic crash dumps with stack trace. Anonymous gameplay telemetry.", "medium", "optimization"),
                    ("Create Steam store page assets", "Screenshots (5+), short/long descriptions, tags, system requirements, trailer thumbnail.", "high", "art"),
                    ("Write press kit and media materials", "Fact sheet, logo pack, screenshots, GIFs, developer bios, contact info.", "medium", "art"),
                    ("Playtest session #1 - core combat loop", "Recruit 10 playtesters. Record sessions, collect feedback forms. Focus on feel and difficulty.", "high", "gameplay"),
                    ("Fix input lag on ability activation", "50-80ms delay between keypress and animation start. Check input buffer pipeline.", "high", "bug"),
                    ("Test save file compatibility across versions", "Migrate v0.1 saves to v0.2 format. Verify no data loss or corruption.", "medium", "gameplay"),
                    ("Implement Steam achievement triggers (25 achievements)", "Achievement definitions and trigger points. Include hidden achievements for secrets.", "medium", "gameplay"),
                    ("Create automated smoke test suite", "Quick test: launch → new game → move → attack → die → menu. Under 30 seconds.", "medium", "optimization"),
                    ("Accessibility audit and improvements", "Color blind modes, text scaling, input remapping, screen reader hints.", "medium", "ui/ux"),
                    ("Optimize asset loading times", "Cold start currently 8s. Target <3s. Profile texture loading and shader compilation.", "high", "optimization"),
                    ("Create Early Access roadmap document", "Public-facing roadmap. Monthly milestones for first 6 months.", "medium", "gameplay"),
                    ("Test multiplayer with simulated latency", "Validate gameplay at 50ms, 100ms, 200ms, 500ms latency. Document desyncs.", "high", "networking"),
                    ("Prepare demo build for Steam Next Fest", "First 3 floors, 30min playtime cap. Feedback survey on exit.", "urgent", "gameplay"),
                    ("Set up Discord community server", "Channels: announcements, feedback, bugs, media, dev-logs. Bot for role assignment.", "low", "ui/ux"),
                    ("Final QA pass on tutorial flow", "Verify all prompts, highlights, and forced interactions work. No soft locks.", "medium", "ui/ux"),
                    ("Profile GPU usage on integrated graphics", "Target playable on Intel UHD 630. May need low-quality preset.", "medium", "optimization"),
                    ("Localization QA for Turkish translation", "Check all UI strings fit, special characters render, context is correct.", "low", "ui/ux"),
                    ("Create trailer storyboard and capture footage", "60-second trailer. Hook in first 5 seconds. Show combat, loot, boss, co-op.", "high", "art"),
                    ("Write Steam Early Access FAQ", "Why EA, current state, planned features, pricing, update frequency.", "low", "gameplay"),
                    ("Set up community bug report template", "GitHub issue template with system info, repro steps, expected/actual, screenshot fields.", "low", "optimization"),
                    ("Test and fix Linux/Proton compatibility", "Verify on Ubuntu 22.04 and Steam Deck. Check controller and audio.", "medium", "optimization"),
                    ("Review ESRB/PEGI rating requirements", "Self-rate content. Document violence level, online interactions, in-game purchases.", "low", "gameplay"),
                    ("Create beta branch on Steam for testing", "Separate beta branch with password. Auto-update from CI builds.", "medium", "optimization"),
                    ("End-to-end playthrough QA (full run)", "Complete run from start to final boss. Document all encountered issues.", "high", "gameplay"),
                    ("Prepare launch day social media plan", "Posts for Twitter, Reddit, Discord. Schedule for UTC timezone coverage.", "low", "art"),
                    ("Load test multiplayer server infrastructure", "Simulate 100 concurrent sessions. Monitor CPU, memory, bandwidth.", "medium", "networking"),
                    ("Document known issues for EA launch", "Honest list of known bugs/limitations. Pin in Discord and Steam forums.", "medium", "gameplay"),
                ],
            },
        ],
    },
    {
        "name": "Flavor & Fork - Restaurant Platform",
        "description": "Modern restaurant discovery and reservation platform with real-time table management, customer reviews, and restaurant analytics dashboard.",
        "icon": "🍽️",
        "color": "#F97316",
        "labels": [
            ("frontend", "#3B82F6", "React frontend work"),
            ("backend", "#10B981", "API and server logic"),
            ("database", "#8B5CF6", "Schema, migrations, queries"),
            ("design", "#F59E0B", "UI/UX design tasks"),
            ("api", "#6366F1", "REST/GraphQL API endpoints"),
            ("devops", "#EF4444", "CI/CD and infrastructure"),
            ("security", "#DC2626", "Auth and security tasks"),
            ("mobile", "#EC4899", "Mobile responsive / PWA"),
        ],
        "boards": [
            {
                "name": "Customer App",
                "description": "Restaurant search, menus, reservations, reviews - the consumer-facing experience",
                "tasks": [
                    ("Build restaurant search with filters", "Search by cuisine, price range, rating, distance. Debounced input with instant results. Support geolocation.", "high", "frontend"),
                    ("Implement Google Maps integration for nearby restaurants", "Show restaurants on map with custom markers. Cluster markers at low zoom. Info window on click.", "high", "frontend"),
                    ("Create restaurant detail page", "Hero photo gallery, menu sections, hours, reviews, reservation widget. Sticky book button on mobile.", "high", "frontend"),
                    ("Build reservation booking flow", "Date/time picker → party size → available slots → confirm. Email confirmation with calendar invite.", "urgent", "frontend"),
                    ("Design and implement review submission form", "Star rating (1-5), text review, photo upload (max 5). Preview before submit.", "medium", "frontend"),
                    ("Create user profile and reservation history page", "Past/upcoming reservations, saved restaurants, review history. Cancel/modify upcoming.", "medium", "frontend"),
                    ("Implement restaurant favoriting and collections", "Heart button to save. Create named collections like 'Date Night', 'Work Lunch'.", "low", "frontend"),
                    ("Build cuisine category browsing page", "Grid of cuisine types with hero images. Click to see filtered restaurant list.", "medium", "frontend"),
                    ("Add real-time table availability checking", "WebSocket connection for live slot updates. Show 'Only 2 tables left' urgency.", "high", "backend"),
                    ("Create push notification system for reservation reminders", "24hr and 2hr reminders. Cancellation alerts. Special offer notifications.", "medium", "backend"),
                    ("Build restaurant menu display component", "Sections, items with photos, dietary tags (V, VG, GF, DF), allergen info, prices.", "medium", "frontend"),
                    ("Implement social sharing for restaurants", "Share to WhatsApp, Twitter, Instagram Stories. Rich preview with OG tags.", "low", "frontend"),
                    ("Create 'Trending Now' and 'New Restaurants' sections", "Algorithm based on recent reservations, new listings, review velocity.", "medium", "backend"),
                    ("Build photo gallery with lightbox viewer", "Restaurant photos, food photos, ambiance shots. Swipe on mobile, arrows on desktop.", "medium", "frontend"),
                    ("Add wait time estimation display", "Show estimated wait for walk-ins. Based on current occupancy and avg dining time.", "medium", "backend"),
                    ("Implement advanced search with dietary preferences", "Filter by vegan, halal, kosher, gluten-free. Per-dish level filtering.", "medium", "frontend"),
                    ("Create restaurant comparison feature", "Side-by-side compare up to 3 restaurants. Rating, price, cuisine, distance.", "low", "frontend"),
                    ("Build reservation modification flow", "Change date, time, party size. Show availability for new selection. Notify restaurant.", "medium", "frontend"),
                    ("Add restaurant Q&A section", "Community questions/answers about the restaurant. Owner can respond officially.", "low", "frontend"),
                    ("Create seasonal/event-based restaurant recommendations", "Valentine's Day specials, New Year's Eve, Ramadan iftar packages. Admin curated.", "low", "backend"),
                    ("Implement lazy loading for restaurant list", "Infinite scroll with skeleton loading. Load 20 restaurants per page.", "medium", "frontend"),
                    ("Build mobile-optimized bottom navigation", "Home, Search, Reservations, Favorites, Profile tabs. Active state indicators.", "high", "mobile"),
                    ("Add dark mode support", "System preference detection. Manual toggle in settings. All components themed.", "low", "design"),
                    ("Create onboarding flow for new users", "Cuisine preferences, location, dietary restrictions. 3-step wizard.", "medium", "design"),
                    ("Implement review photo gallery", "User-submitted food photos on restaurant page. Grid layout with expand.", "low", "frontend"),
                    ("Build restaurant hours and holiday schedule display", "Weekly hours, special hours, holiday closures. 'Open Now' indicator.", "medium", "frontend"),
                    ("Add price range indicator and average cost display", "$ to $$$$ indicators. Show 'Average meal: $25-35' based on menu analysis.", "low", "frontend"),
                    ("Create email digest for saved restaurants", "Weekly email with new reviews, special offers, and availability for favorites.", "low", "backend"),
                    ("Implement accessibility for screen readers", "ARIA labels, keyboard navigation, focus management. WCAG 2.1 AA compliance.", "medium", "frontend"),
                    ("Build PWA with offline reservation viewing", "Service worker caching. View upcoming reservations offline. Sync when reconnected.", "medium", "mobile"),
                    ("Add multi-language support (TR, EN, DE)", "i18n framework setup. Extract all strings. RTL consideration for future Arabic.", "medium", "frontend"),
                    ("Create restaurant recommendation engine", "Collaborative filtering based on review history and preferences. Cold start handling.", "high", "backend"),
                    ("Implement table layout visual picker", "Interactive floor plan showing available tables. Select preferred seating area.", "medium", "frontend"),
                    ("Build loyalty points display and redemption", "Show earned points, available rewards. Redeem for discounts at checkout.", "low", "frontend"),
                    ("Add estimated travel time to restaurant", "Integration with Maps API. Show driving, walking, transit times from user location.", "low", "frontend"),
                ],
            },
            {
                "name": "Restaurant Dashboard",
                "description": "Restaurant owner admin panel - reservations, analytics, menu management",
                "tasks": [
                    ("Build reservation management calendar view", "Day/week view showing all reservations. Drag to reschedule. Color by party size.", "urgent", "frontend"),
                    ("Create real-time table status dashboard", "Floor plan view with occupied/available/reserved states. Live WebSocket updates.", "high", "frontend"),
                    ("Implement menu CRUD with photo upload", "Add/edit/remove items. Drag to reorder sections. Bulk import from CSV.", "high", "frontend"),
                    ("Build analytics overview dashboard", "Revenue, covers, avg rating, popular items, peak hours. Date range selector.", "high", "frontend"),
                    ("Create customer database with visit history", "Searchable customer list. Visit count, preferences, allergies, total spend.", "medium", "frontend"),
                    ("Implement automated email campaigns", "Post-visit feedback request. Birthday offers. Win-back for inactive customers.", "medium", "backend"),
                    ("Build staff schedule management", "Weekly roster. Shift templates. Availability preferences. Auto-scheduling suggestions.", "medium", "frontend"),
                    ("Create review response management panel", "All reviews in one place. Quick reply templates. Sentiment indicators.", "medium", "frontend"),
                    ("Implement revenue reporting with charts", "Daily/weekly/monthly revenue. Compare periods. Breakdown by category/item.", "high", "frontend"),
                    ("Build table configuration manager", "Define tables: capacity, location, combinable flag. Set min/max party sizes.", "medium", "frontend"),
                    ("Create automated no-show tracking", "Mark no-shows, track repeat offenders. Auto-suggest deposit requirement.", "medium", "backend"),
                    ("Implement special event/promotion creator", "Create events with custom menus, pricing, capacity. Auto-publish to customer app.", "medium", "frontend"),
                    ("Build inventory and ingredient tracking", "Stock levels, par levels, alerts. Link to menu items for usage projection.", "low", "frontend"),
                    ("Create daily briefing auto-report", "Morning email: today's reservations, VIP guests, special requests, weather forecast.", "low", "backend"),
                    ("Implement multi-branch management", "Switch between restaurant locations. Consolidated reporting across branches.", "high", "frontend"),
                    ("Build reservation confirmation/cancellation flows", "Auto-confirm or manual approval. Send SMS and email on status change.", "high", "backend"),
                    ("Create menu allergen management system", "Tag items with 14 allergens. Auto-generate allergen matrix PDF.", "medium", "backend"),
                    ("Implement waitlist management", "Add walk-ins to waitlist. SMS notification when table ready. ETA display.", "high", "frontend"),
                    ("Build customer feedback analytics", "Sentiment analysis on reviews. Word cloud. Topic clustering. Trend over time.", "medium", "backend"),
                    ("Create QR code menu generator", "Generate branded QR codes linking to digital menu. Track scan analytics.", "low", "frontend"),
                    ("Implement table turnover rate analytics", "Average dining duration by party size, day, meal period. Optimization suggestions.", "medium", "backend"),
                    ("Build photo management for restaurant profile", "Upload, crop, reorder photos. Set hero image. Moderate user-submitted photos.", "medium", "frontend"),
                    ("Create peak hour prediction model", "ML-based prediction using historical data, weather, events. Staffing recommendations.", "low", "backend"),
                    ("Implement receipt and billing integration", "POS system integration. Match reservations to bills. Calculate per-cover revenue.", "medium", "backend"),
                    ("Build A/B testing for menu pricing", "Test different price points. Track order volume changes. Statistical significance.", "low", "backend"),
                    ("Create export functionality for reports", "PDF and Excel export for all analytics. Scheduled email reports.", "medium", "frontend"),
                    ("Implement guest preference auto-tagging", "Auto-detect preferences from orders: vegetarian, wine lover, etc. CRM enrichment.", "low", "backend"),
                    ("Build dashboard notification center", "In-app notifications for new reservations, reviews, no-shows, inventory alerts.", "medium", "frontend"),
                    ("Create competitor benchmarking view", "Compare ratings, review volume, price range with nearby competitors. Anonymous.", "low", "backend"),
                    ("Implement role-based access control", "Owner, manager, host, waiter roles. Granular permissions per feature.", "high", "security"),
                    ("Build customer communication templates", "Reservation confirm, reminder, feedback request, birthday, cancellation. Customizable.", "medium", "frontend"),
                    ("Create mobile-responsive dashboard layout", "Responsive design for tablet use at host stand. Key actions accessible on phone.", "medium", "mobile"),
                ],
            },
            {
                "name": "Infrastructure & API",
                "description": "Backend services, database design, DevOps, and third-party integrations",
                "tasks": [
                    ("Design and implement database schema", "PostgreSQL with PostGIS for geospatial. Tables: restaurants, users, reservations, reviews, menus, tables.", "urgent", "database"),
                    ("Build REST API for restaurant CRUD", "Endpoints: list, get, create, update, delete. Pagination, filtering, sorting. OpenAPI docs.", "urgent", "api"),
                    ("Implement JWT authentication with refresh tokens", "Access token 15min, refresh 30days. Fingerprint binding. Revocation list.", "urgent", "security"),
                    ("Create reservation service with conflict detection", "Prevent double-booking. Consider dining duration, buffer time, table capacity.", "high", "backend"),
                    ("Set up CI/CD pipeline with GitHub Actions", "Lint → test → build → deploy. Staging auto-deploy on PR merge. Production manual.", "high", "devops"),
                    ("Implement rate limiting and request throttling", "100 req/min for public, 1000/min for authenticated. Redis-backed sliding window.", "high", "security"),
                    ("Build email service with template engine", "SendGrid integration. Handlebars templates. Queue with retry. Delivery tracking.", "medium", "backend"),
                    ("Create image upload and CDN pipeline", "S3 upload → Lambda resize → CloudFront CDN. WebP conversion. Max 5MB.", "medium", "devops"),
                    ("Implement full-text search with Elasticsearch", "Restaurant name, cuisine, description. Typo tolerance, synonyms, Turkish morphology.", "high", "backend"),
                    ("Set up monitoring and alerting (Grafana + Prometheus)", "API latency, error rate, DB connections, queue depth. PagerDuty integration.", "medium", "devops"),
                    ("Build notification service (email, SMS, push)", "Unified notification API. Channel preferences per user. Delivery status tracking.", "medium", "backend"),
                    ("Create data backup and disaster recovery plan", "Hourly DB snapshots, daily full backup. Tested restore procedure. 15min RPO.", "medium", "devops"),
                    ("Implement API versioning strategy", "URL-based versioning (/v1/, /v2/). Deprecation headers. Migration guide per version.", "medium", "api"),
                    ("Build payment integration for deposits", "Stripe integration. Hold → capture flow for no-show protection. Refund API.", "high", "backend"),
                    ("Create webhook system for restaurant integrations", "Events: reservation.created, review.posted, etc. HMAC signature verification.", "medium", "api"),
                    ("Set up Redis caching layer", "Cache restaurant detail, menu, availability. Invalidation on update. TTL strategy.", "medium", "devops"),
                    ("Implement geospatial queries for nearby search", "PostGIS ST_DWithin for radius search. Sorted by distance. Index optimization.", "high", "database"),
                    ("Build CSV/Excel data import for menus", "Parse menu spreadsheets. Validation, error reporting. Preview before commit.", "medium", "backend"),
                    ("Create API documentation with Swagger UI", "Auto-generated from code. Request/response examples. Auth instructions.", "medium", "api"),
                    ("Implement GDPR compliance features", "Data export, right to deletion, consent management. Audit trail.", "medium", "security"),
                    ("Set up database migration workflow (Alembic)", "Auto-generate migrations. Rollback support. CI validation of migration chain.", "high", "database"),
                    ("Build restaurant onboarding API flow", "Multi-step: register → verify email → add restaurant → configure tables → go live.", "medium", "api"),
                    ("Create automated testing suite", "Unit tests 80%+ coverage. Integration tests for booking flow. E2E with Playwright.", "high", "devops"),
                    ("Implement real-time WebSocket for table updates", "Socket.IO with Redis adapter. Rooms per restaurant. Heartbeat and reconnection.", "high", "backend"),
                    ("Build admin super-panel for platform management", "User management, restaurant approval, content moderation, system settings.", "medium", "backend"),
                    ("Set up log aggregation (ELK stack)", "Structured JSON logs. Correlation IDs. Dashboard for error analysis.", "medium", "devops"),
                    ("Create health check and status page", "Endpoint checking all dependencies. Public status page with incident history.", "low", "devops"),
                    ("Implement OAuth social login (Google, Apple)", "Social sign-in. Account linking. Profile data merge.", "medium", "security"),
                    ("Build analytics data pipeline", "ETL from production DB to analytics warehouse. Daily aggregation jobs.", "medium", "database"),
                    ("Create load testing suite with k6", "Simulate 500 concurrent users. Test booking flow, search, menu browsing.", "medium", "devops"),
                    ("Implement SMS verification for restaurant owners", "Twilio integration. 6-digit OTP. Rate limiting to prevent abuse.", "medium", "security"),
                    ("Set up feature flags system", "LaunchDarkly or custom. Gradual rollout, A/B testing, kill switches.", "low", "devops"),
                ],
            },
        ],
    },
    {
        "name": "FinTrack - Personal Finance App",
        "description": "AI-powered personal finance tracker with bank sync, budget planning, investment portfolio tracking, and predictive spending analysis. React Native mobile + web dashboard.",
        "icon": "💰",
        "color": "#059669",
        "labels": [
            ("ios", "#000000", "iOS-specific tasks"),
            ("android", "#3DDC84", "Android-specific tasks"),
            ("web", "#3B82F6", "Web dashboard tasks"),
            ("ai/ml", "#8B5CF6", "Machine learning features"),
            ("backend", "#10B981", "API and server logic"),
            ("security", "#DC2626", "Security and encryption"),
            ("design", "#F59E0B", "UI/UX design"),
            ("data", "#6366F1", "Data processing and analysis"),
        ],
        "boards": [
            {
                "name": "Mobile App",
                "description": "React Native app for iOS and Android - daily transaction tracking and budgets",
                "tasks": [
                    ("Build transaction list with infinite scroll", "Grouped by date, category icons, color-coded amounts. Pull to refresh. Search.", "high", "ios"),
                    ("Create manual transaction entry form", "Amount, category, merchant, date, notes, recurring toggle. Camera receipt scan.", "high", "design"),
                    ("Implement category auto-detection from merchant name", "Rule-based + ML classifier. Map merchants to categories. User can override.", "high", "ai/ml"),
                    ("Build monthly budget overview screen", "Circular progress per category. Total spent vs budget. Days remaining context.", "urgent", "design"),
                    ("Create budget creation and editing flow", "Set monthly limits per category. Copy from previous month. Rollover option.", "high", "design"),
                    ("Implement bank account sync via Plaid", "Link bank accounts. Auto-import transactions. Handle MFA challenges.", "urgent", "backend"),
                    ("Build spending insights dashboard", "Top categories, merchant frequency, daily average, trends vs last month.", "high", "design"),
                    ("Create bill reminder and tracking system", "Recurring bills auto-detected. Due date alerts. Paid/unpaid status tracking.", "medium", "design"),
                    ("Implement biometric authentication (Face ID / fingerprint)", "Secure unlock. Re-auth for sensitive operations. Fallback to PIN.", "high", "security"),
                    ("Build account balance overview widget", "All linked accounts with balances. Net worth calculation. Refresh button.", "medium", "design"),
                    ("Create receipt scanning with OCR", "Camera capture → OCR → extract merchant, amount, date. Manual correction.", "high", "ai/ml"),
                    ("Implement push notifications for spending alerts", "Over-budget warnings, large transactions, bill reminders, weekly summary.", "medium", "backend"),
                    ("Build transaction categorization correction flow", "Swipe to change category. 'Always categorize X as Y' learning rule.", "medium", "design"),
                    ("Create savings goal tracker", "Set goals with target amount and date. Auto-calculate monthly needed. Progress.", "medium", "design"),
                    ("Implement split transaction support", "Split one transaction across multiple categories. Common for grocery/Costco.", "low", "design"),
                    ("Build currency conversion for travel expenses", "Auto-detect foreign transactions. Show original + converted amounts. Rate source.", "medium", "data"),
                    ("Create monthly spending report generation", "PDF report with charts: category breakdown, trends, top merchants, vs budget.", "medium", "data"),
                    ("Implement dark mode with OLED black option", "System preference + manual toggle. True black for AMOLED power saving.", "low", "design"),
                    ("Build recurring transaction auto-detection", "Detect patterns in amounts/merchants/intervals. Suggest as recurring.", "medium", "ai/ml"),
                    ("Create account settings and preferences screen", "Notification prefs, currency, language, linked accounts, export data.", "medium", "design"),
                    ("Add haptic feedback for key interactions", "Subtle haptics on transaction add, budget threshold, goal reached.", "low", "ios"),
                    ("Implement app widgets for home screen", "iOS widget: monthly spend summary. Android widget: recent transactions.", "medium", "ios"),
                    ("Build shared expense tracking (couples/roommates)", "Invite partner. Shared categories. 'Owe' balance calculation.", "low", "design"),
                    ("Create year-in-review annual summary", "Animated summary of yearly spending. Top categories, biggest month, savings.", "low", "design"),
                    ("Implement offline mode with sync queue", "Cache transactions locally. Queue new entries. Sync when reconnected.", "high", "backend"),
                    ("Build category customization (icons, colors, merge)", "Custom categories beyond defaults. Merge categories. Custom icons.", "low", "design"),
                    ("Add accessibility support (VoiceOver/TalkBack)", "Screen reader labels, dynamic type, reduced motion. Audit and fix.", "medium", "ios"),
                    ("Create onboarding flow with bank linking", "Welcome → link bank → set budget → choose categories → ready. Skip option.", "high", "design"),
                    ("Implement export to CSV/Excel", "Date range selection. Category filter. Include all transaction fields.", "low", "data"),
                    ("Build transaction search with filters", "Search by merchant, amount range, category, date range. Save filters.", "medium", "design"),
                    ("Add support for multiple currencies", "Users traveling or with foreign accounts. Unified view in home currency.", "medium", "data"),
                    ("Create quick-add floating action button", "FAB with shortcuts: expense, income, transfer. Expandable menu.", "medium", "design"),
                    ("Implement gesture navigation between months", "Swipe left/right to navigate months in budget view. Smooth animation.", "low", "ios"),
                ],
            },
            {
                "name": "Web Dashboard",
                "description": "React web app for detailed analysis, investment tracking, and tax preparation",
                "tasks": [
                    ("Build investment portfolio dashboard", "Holdings list, allocation pie chart, total value, day/total gain/loss. Auto-refresh.", "high", "web"),
                    ("Create detailed transaction table with bulk actions", "Sortable columns, multi-select, bulk categorize/delete, CSV export.", "high", "web"),
                    ("Implement interactive spending charts (D3/Recharts)", "Line, bar, pie, treemap charts. Date range picker. Hover tooltips. Drill-down.", "high", "web"),
                    ("Build tax categorization and report generator", "Auto-tag tax-deductible expenses. Generate summary by tax category. PDF export.", "medium", "web"),
                    ("Create net worth tracker over time", "Assets (accounts + investments) minus liabilities. Monthly snapshots. Growth chart.", "high", "web"),
                    ("Implement investment transaction history", "Buy/sell/dividend transactions. Cost basis calculation. Unrealized gains.", "medium", "web"),
                    ("Build budget vs actual comparison view", "Side-by-side monthly comparison. Variance highlighting. Year-over-year.", "medium", "web"),
                    ("Create cash flow projection chart", "Project 3-6 months based on recurring income/expenses. Scenario modeling.", "medium", "ai/ml"),
                    ("Implement multi-account dashboard with aggregation", "All accounts in one view. Filter by account type. Cross-account analytics.", "high", "web"),
                    ("Build financial goal planning calculator", "Retirement, house, education goals. Monte Carlo simulation. Monthly contribution.", "medium", "web"),
                    ("Create debt payoff planner", "List debts. Snowball vs avalanche strategy comparison. Payoff timeline.", "medium", "web"),
                    ("Implement subscription tracker", "Auto-detect recurring charges. Annual cost calculation. Cancel suggestion.", "medium", "data"),
                    ("Build income tracking and analysis", "Salary, freelance, investment income. Monthly/annual trends. Tax bracket indicator.", "medium", "web"),
                    ("Create custom report builder", "Drag-and-drop report designer. Choose metrics, filters, chart types. Save templates.", "low", "web"),
                    ("Implement merchant spending heatmap", "Calendar heatmap showing spending intensity by day. Click for breakdown.", "low", "web"),
                    ("Build investment benchmark comparison", "Compare portfolio performance vs S&P 500, NASDAQ. Alpha calculation.", "medium", "web"),
                    ("Create automated categorization rules manager", "If merchant contains X → category Y. Priority ordering. Test before apply.", "medium", "web"),
                    ("Implement spending anomaly detection alerts", "Flag unusual transactions: amount outliers, new merchants, pattern breaks.", "high", "ai/ml"),
                    ("Build family member management", "Add family members. Per-person spending views. Allowance tracking for kids.", "low", "web"),
                    ("Create dashboard customization with draggable widgets", "Widget library: accounts, budgets, goals, charts. Drag to arrange layout.", "medium", "web"),
                    ("Implement data export/import for tax software", "Export in TurboTax, QuickBooks compatible formats. Field mapping.", "low", "data"),
                    ("Build spending prediction model", "LSTM/Prophet model trained on user history. Predict next month by category.", "high", "ai/ml"),
                    ("Create financial health score", "Score 0-100 based on: emergency fund, debt ratio, savings rate, diversification.", "medium", "ai/ml"),
                    ("Implement multi-currency portfolio view", "Crypto, foreign stocks in original currency. FX conversion for unified view.", "medium", "web"),
                    ("Build printable financial statement generator", "Balance sheet, income statement, cash flow. Professional PDF layout.", "low", "web"),
                    ("Create AI-powered savings recommendations", "Analyze spending patterns. Suggest areas to cut. Estimated monthly savings.", "medium", "ai/ml"),
                    ("Implement connected account health monitoring", "Check bank connection status. Auto-reconnect. Alert on stale data.", "medium", "backend"),
                    ("Build year-over-year comparison dashboard", "Compare any two periods. Growth/decline indicators per category.", "medium", "web"),
                    ("Create shared household budget workspace", "Multiple users, shared budgets, split tracking. Permissions per section.", "low", "web"),
                    ("Implement SSO with Google/Apple accounts", "Social login for web. Link to existing account. Profile sync.", "medium", "security"),
                    ("Build responsive design for tablet use", "Optimized layout for iPad/tablet. Touch-friendly controls. Sidebar collapse.", "medium", "web"),
                    ("Create automated monthly email digest", "Summary email: spending, budget status, investment performance, alerts.", "low", "backend"),
                ],
            },
            {
                "name": "Backend & AI Engine",
                "description": "API services, ML pipeline, bank integrations, and data processing",
                "tasks": [
                    ("Design core database schema (transactions, accounts, budgets)", "PostgreSQL with partitioning by user_id. Indexes for date range queries. Soft deletes.", "urgent", "backend"),
                    ("Build Plaid integration for bank account linking", "Token exchange, webhook handlers, transaction sync. Handle institution errors.", "urgent", "backend"),
                    ("Implement transaction categorization ML pipeline", "Training pipeline: merchant name → category. TF-IDF + Random Forest. 92%+ accuracy target.", "high", "ai/ml"),
                    ("Create budget calculation engine", "Real-time budget tracking. Handle mid-month changes. Rollover logic. Multi-currency.", "high", "backend"),
                    ("Build REST API for transaction CRUD", "List, create, update, delete, bulk operations. Pagination, filtering. Rate limiting.", "urgent", "backend"),
                    ("Implement end-to-end encryption for financial data", "AES-256 at rest. TLS 1.3 in transit. Per-user encryption keys. Key rotation.", "urgent", "security"),
                    ("Create recurring transaction detection algorithm", "Pattern matching on amount, merchant, interval. Confidence scoring. User confirmation.", "high", "ai/ml"),
                    ("Build investment data aggregation service", "Pull holdings from brokerages via Plaid. Stock price API. Daily portfolio valuation.", "high", "backend"),
                    ("Implement anomaly detection for unusual transactions", "Isolation Forest model. Z-score on amounts per merchant. Real-time scoring.", "high", "ai/ml"),
                    ("Create notification service (push, email, SMS)", "Event-driven notifications. User preference management. Delivery tracking.", "medium", "backend"),
                    ("Build data export API (CSV, PDF, JSON)", "Background job for large exports. Presigned URL download. Format templates.", "medium", "backend"),
                    ("Implement spending prediction with Prophet/LSTM", "Time series forecasting per category. 30/60/90 day predictions. Confidence intervals.", "high", "ai/ml"),
                    ("Create financial health scoring algorithm", "Composite score from: savings rate, debt-income ratio, emergency fund, diversification.", "medium", "ai/ml"),
                    ("Build webhook system for real-time bank updates", "Plaid webhooks for new transactions, balance changes. Idempotent processing.", "high", "backend"),
                    ("Implement PCI DSS compliance measures", "No raw card data storage. Tokenization. Access logging. Annual audit prep.", "high", "security"),
                    ("Create category suggestion API endpoint", "Given merchant name, return top-3 category suggestions with confidence scores.", "medium", "ai/ml"),
                    ("Build currency exchange rate service", "Daily rate fetch from ECB/Fixer.io. Cache with TTL. Historical rates for past transactions.", "medium", "data"),
                    ("Implement user data deletion (GDPR right to erasure)", "Cascade delete all user data. Anonymize analytics. Confirmation email.", "medium", "security"),
                    ("Create automated bank reconciliation", "Match imported transactions with manual entries. Flag discrepancies. Auto-resolve.", "medium", "backend"),
                    ("Build receipt OCR processing pipeline", "Image upload → preprocessing → Tesseract/Cloud Vision OCR → field extraction → transaction creation.", "high", "ai/ml"),
                    ("Implement rate limiting and abuse prevention", "Per-user and per-IP limits. Exponential backoff. CAPTCHA trigger. Admin alerts.", "medium", "security"),
                    ("Create data archival for old transactions", "Move transactions older than 3 years to cold storage. On-demand retrieval.", "low", "data"),
                    ("Build multi-tenant infrastructure", "Isolated databases per customer. Shared services. Tenant-aware middleware.", "medium", "backend"),
                    ("Implement A/B testing framework for AI features", "Feature flags for model versions. Metric tracking. Statistical significance.", "low", "backend"),
                    ("Create savings recommendation engine", "Analyze spending vs peers (anonymized). Identify high categories. Actionable tips.", "medium", "ai/ml"),
                    ("Build automated test suite for financial calculations", "Property-based testing for budget math. Floating point precision. Currency rounding.", "high", "backend"),
                    ("Implement merchant name normalization", "Clean merchant names: 'AMZN*MKT' → 'Amazon'. Fuzzy matching. Community dictionary.", "medium", "data"),
                    ("Create investment return calculation service", "TWR and IRR calculation. Handle deposits/withdrawals. Benchmark comparison.", "medium", "backend"),
                    ("Build scheduled job system for recurring tasks", "Celery/APScheduler for: bank sync, report generation, model retraining, alerts.", "medium", "backend"),
                    ("Implement audit logging for all financial operations", "Immutable audit trail. Who, what, when, from where. Compliance reporting.", "high", "security"),
                    ("Create model retraining pipeline", "Weekly retrain with new labeled data. A/B deploy. Rollback on accuracy drop.", "medium", "ai/ml"),
                    ("Build API documentation with Redoc", "Auto-generated from FastAPI. Authentication guide. SDK examples.", "low", "backend"),
                ],
            },
        ],
    },
]


def api(method, path, json=None, base_url=DEFAULT_BASE, headers=None):
    r = getattr(requests, method)(f"{base_url}{path}", headers=headers, json=json)
    if r.status_code >= 400:
        print(f"  ERROR {r.status_code}: {method.upper()} {path} -> {r.text[:200]}")
        return None
    return r.json().get("data")


def rand_due():
    if random.random() < 0.4:
        return None
    days = random.randint(-5, 30)
    return (datetime.now() + timedelta(days=days)).isoformat()


def distribute_tasks(tasks, statuses):
    """Distribute tasks across statuses with realistic distribution."""
    status_names = [s["name"].lower() for s in statuses]

    done_idx = next((i for i, name in enumerate(status_names) if "done" in name or "complete" in name), len(statuses) - 1)
    review_idx = next((i for i, name in enumerate(status_names) if "review" in name or "testing" in name), done_idx - 1 if done_idx > 0 else None)
    progress_idx = next((i for i, name in enumerate(status_names) if "progress" in name or "doing" in name), 1 if len(statuses) > 2 else 0)
    todo_idx = next((i for i, name in enumerate(status_names) if "todo" in name or "to do" in name or "to-do" in name), 0)
    backlog_idx = next((i for i, name in enumerate(status_names) if "backlog" in name), None)

    assignments = []
    for task in tasks:
        r = random.random()
        if r < 0.20:
            idx = done_idx
        elif r < 0.35 and review_idx is not None:
            idx = review_idx
        elif r < 0.55:
            idx = progress_idx
        elif r < 0.80:
            idx = todo_idx
        elif backlog_idx is not None:
            idx = backlog_idx
        else:
            idx = todo_idx
        assignments.append((task, statuses[idx]["id"]))
    return assignments


def clean_projects(base_url, headers):
    """Delete all seeded projects by matching names."""
    seeded_names = {p["name"] for p in PROJECTS}
    projects = api("get", "/projects/?per_page=100", base_url=base_url, headers=headers)
    if not projects:
        return
    for p in projects:
        if p["name"] in seeded_names:
            print(f"  Deleting: {p['name']} ({p['id']})")
            api("delete", f"/projects/{p['id']}", base_url=base_url, headers=headers)


def seed(base_url, headers):
    user = api("get", "/users/me", base_url=base_url, headers=headers)
    if not user:
        print("Failed to get user info. Check API key and base URL.")
        sys.exit(1)
    print(f"User: {user['username']} ({user['id']})")

    for proj_def in PROJECTS:
        print(f"\n{'='*60}")
        print(f"Creating project: {proj_def['name']}")
        project = api("post", "/projects/", {
            "name": proj_def["name"],
            "description": proj_def["description"],
            "icon": proj_def["icon"],
            "color": proj_def["color"],
            "create_default_board": False,
        }, base_url=base_url, headers=headers)
        if not project:
            continue
        pid = project["id"]
        print(f"  Project ID: {pid}")

        label_map = {}
        for lname, lcolor, ldesc in proj_def["labels"]:
            label = api("post", f"/projects/{pid}/labels/", {
                "name": lname, "color": lcolor, "description": ldesc
            }, base_url=base_url, headers=headers)
            if label:
                label_map[lname] = label["id"]
                print(f"  Label: {lname}")

        for board_def in proj_def["boards"]:
            print(f"\n  Creating board: {board_def['name']}")
            board = api("post", f"/projects/{pid}/boards/", {
                "name": board_def["name"],
                "description": board_def["description"],
                "create_default_statuses": True,
            }, base_url=base_url, headers=headers)
            if not board:
                continue
            bid = board["id"]

            statuses_resp = api("get", f"/projects/{pid}/boards/{bid}/statuses/", base_url=base_url, headers=headers)
            if not statuses_resp:
                continue
            statuses = statuses_resp if isinstance(statuses_resp, list) else []
            print(f"    Statuses: {[s['name'] for s in statuses]}")

            assignments = distribute_tasks(board_def["tasks"], statuses)

            for (title, desc, priority, label_name), status_id in assignments:
                label_ids = [label_map[label_name]] if label_name in label_map else []
                task = api("post", f"/projects/{pid}/boards/{bid}/tasks/", {
                    "title": title,
                    "description": desc,
                    "status_id": status_id,
                    "priority": priority,
                    "label_ids": label_ids,
                    "due_date": rand_due(),
                }, base_url=base_url, headers=headers)
                if task:
                    status_name = next((s["name"] for s in statuses if s["id"] == status_id), "?")
                    print(f"    [{status_name}] {title[:50]}...")
                else:
                    print(f"    FAILED: {title[:50]}")

    print(f"\n{'='*60}")
    print("Seed complete!")


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for AgentBoard")
    parser.add_argument("--api-key", required=True, help="API key for authentication")
    parser.add_argument("--base-url", default=DEFAULT_BASE, help=f"API base URL (default: {DEFAULT_BASE})")
    parser.add_argument("--clean", action="store_true", help="Delete seeded projects before re-creating")
    args = parser.parse_args()

    headers = {"X-API-Key": args.api_key}

    if args.clean:
        print("Cleaning existing seeded projects...")
        clean_projects(args.base_url, headers)
        print("Clean done.\n")

    seed(args.base_url, headers)


if __name__ == "__main__":
    main()
