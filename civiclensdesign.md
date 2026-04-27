CivicLens — product + design spec (MVP that works with or without government integrations)
CivicLens is a camera + location app for reporting non-emergency civic issues (potholes, broken streetlights, illegal dumping, unsafe crossings), tracking status, and helping cities de-duplicate and prioritize work. The big design constraint is integration: many places don’t expose a clean API. So CivicLens should ship with a 3-tier routing layer:

Native CivicLens ticketing (always works, fastest to ship)
Standards-based 311 integration where available (Open311 GeoReport v2) 
1
Bridging (email/webform/manual export) for cities without APIs
Open311 matters because it’s explicitly designed for location-based service requests and standardizes “services + requests” patterns (e.g., /services and /requests) plus service discovery. 
2

1) Product goals and non-goals
Goals
Make it ridiculously fast to report an issue (target: < 30 seconds).
Provide transparent tracking: people can see “submitted → acknowledged → in progress → closed.”
Reduce duplicate reports via smart merge/follow.
Provide a path to “real” city workflows through Open311-style connectors (where possible). GeoReport v2 defines services and service requests with common methods like listing services and creating/querying requests. 
2
Be safe and abuse-resistant (spam, doxxing, malicious reports).
Non-goals (at least for MVP)
Emergency response (911). CivicLens should strongly route emergencies elsewhere.
Perfect ML classification. Start with “assistive suggestions” + user confirmation.
Fully automated cross-city interoperability on day 1 (you’ll phase integrations).
2) Core user journeys (end-to-end)
Journey A — Report an issue (the “hero flow”)
Open app → big camera button
Take photo (or short 3–5s video)
App captures GPS + heading, asks for a pin on map (optional correction)
Choose category (auto-suggest top 3)
Add quick details (severity slider + optional note)
Submit → instant “Issue card” created
User gets updates via push notification when status changes
Journey B — See an existing issue and follow it (de-dup)
Open map → tap an issue marker
If it’s the same issue: hit “Follow” (instead of re-reporting)
Optionally add “more info” photo/comment
Journey C — City staff / moderator closes the loop
Staff portal (web or in-app staff mode) shows queue by category/priority
Staff updates status (acknowledged / in progress / closed)
CivicLens sends “resolved” prompt asking reporter to confirm or re-open
3) UX / Screen design (phone-first)
Navigation model
Bottom tabs:

Map
Feed
Report (center floating action button)
Notifications
Profile
Screen list + key UI requirements
3.1 Map (default landing)
Full-screen map with clustered pins
Filters: category, status, “near me,” “followed”
“Report here” shortcut: long-press map to drop pin
Design note: your map must remain usable with one hand. Put filters in a bottom sheet.

3.2 Report capture (camera-first)
Auto-crop + “retake” + flash toggle
“Use current location” + “adjust pin” option
Category picker: big, thumb-friendly chips
Details: severity slider, “unsafe now” toggle, note field, optional anonymity
3.3 Issue detail
Title + category + status + SLA estimate (if city provides)
Photos timeline (original + followups)
Activity log (status events + comments)
Buttons: Follow / Upvote priority / Add info / Share link
3.4 Feed
“Nearby updates” (resolved issues, hot spots)
“My reports” quick list with status chips
3.5 Notifications
Status changes
Someone commented on your issue
Duplicate merge happened
City asked for more info
3.6 Profile / settings
Manage privacy: public vs “approximate location”
Manage push notification preferences
Export my data (privacy compliance)
Accessibility settings: larger text, reduced motion
4) Internet + integration strategy (how CivicLens routes tickets)
4.1 Standards-based integration: Open311 GeoReport v2 (when a city supports it)
Open311’s “open model” is built around reporting and tracking public service issues; GeoReport v2 defines a standardized API for service types (“services”) and service requests (“requests”), and also a service discovery mechanism. 
1

Mapping CivicLens → Open311 (high level)

CivicLens “Category” ↔ Open311 service_code (from /services) 
2
CivicLens “Create Issue” ↔ Open311 POST /requests 
2
CivicLens “Status tracking” ↔ Open311 GET /requests/{service_request_id} and GET /requests 
2
Some Open311 implementations return a token first and require a token lookup endpoint; GeoReport v2 documents this token flow. 
2
Why this is powerful: You can support multiple jurisdictions with a single connector pattern, instead of bespoke integrations for every city.

4.2 “No integration” mode (MVP-friendly)
If a city has no API:

CivicLens still creates an internal ticket and status lifecycle
You provide a city-facing portal (free/low-cost) to update statuses
Optional: “email bridge” to the city’s 311 inbox with structured info + photos link
4.3 Bridging mode (semi-automated)
Webform automation (careful; can break)
Scheduled CSV export to city ops team
Partner with nonprofits / BIDs / neighborhood groups for triage
5) Backend architecture (practical, scalable)
Services (logical)
API Gateway (REST + auth)
Issue Service (issues, status timeline, dedupe)
Media Service (photo upload, transcoding, EXIF stripping)
Notification Service (push + email)
Moderation Service (spam, abuse, sensitive content)
Integration Service (Open311 connectors + bridge adapters)
Storage
Postgres (core relational data)
Object storage (S3) for images/videos
Redis (rate limits, hot caches, dedupe candidate queues)
Optional: PostGIS for geospatial queries (recommended early)
6) Data model (DB schema you can implement)
users
id (UUID), email/phone, display_name, created_at
trust_level (new/verified/staff)
privacy_mode (exact / approximate / hidden)
jurisdictions
id, name, boundary_geojson, timezone
integration_type (NONE / OPEN311 / EMAIL_BRIDGE / OTHER)
open311_discovery_url (nullable)
contact_email (nullable)
categories
id, jurisdiction_id, name, icon, priority_default
open311_service_code (nullable mapping)
issues
id (UUID)
jurisdiction_id
reporter_user_id (nullable if anonymous)
category_id
status (SUBMITTED / ACKNOWLEDGED / IN_PROGRESS / CLOSED / REJECTED)
title (short)
description (text)
lat, lng (WGS84 decimals; aligns with Open311 conventions for latitude/longitude) 
3
geohash (for fast proximity queries)
severity (1–5)
created_at, updated_at
duplicate_of_issue_id (nullable)
visibility (PUBLIC / PRIVATE_TO_CITY / PRIVATE)
issue_media
id, issue_id, uploader_user_id
media_type (photo/video)
s3_key, thumbnail_s3_key
created_at
issue_events (timeline)
id, issue_id
type (STATUS_CHANGE / COMMENT / MERGE / STAFF_NOTE)
actor_user_id (nullable)
payload_json (old_status/new_status/comment text/etc.)
created_at
follows
user_id, issue_id, created_at (unique constraint)
votes (priority)
user_id, issue_id, weight (default 1), created_at
integrations_open311_requests
issue_id
service_request_id (from Open311)
token (nullable)
last_polled_at
remote_status
raw_remote_payload_json
created_at
moderation_flags
id, issue_id, flagged_by_user_id
reason, details, created_at, resolved_at, resolution
7) API endpoints (CivicLens API — your app’s contract)
Auth / identity
POST /v1/auth/start (phone/email magic link)
POST /v1/auth/verify
GET /v1/me
Jurisdictions + categories
GET /v1/jurisdictions?lat=&lng= (find user’s jurisdiction)
GET /v1/jurisdictions/{id}/categories
Issues
POST /v1/issues (create issue; returns issue id + status)
GET /v1/issues?bbox=&status=&category=&sort= (map feed)
GET /v1/issues/{id} (detail)
POST /v1/issues/{id}/media (signed upload URL)
POST /v1/issues/{id}/comment
POST /v1/issues/{id}/follow
DELETE /v1/issues/{id}/follow
POST /v1/issues/{id}/vote
Dedupe / merge
GET /v1/issues/{id}/duplicates/candidates
POST /v1/issues/{id}/merge (staff/mod only)
Staff portal
GET /v1/staff/issues?status=&category=&priority=
POST /v1/staff/issues/{id}/status
POST /v1/staff/issues/{id}/note
Integration layer
POST /v1/integrations/open311/sync (poll remote updates)
POST /v1/integrations/open311/submit/{issue_id}
8) Duplicate detection (ship simple, then get smarter)
MVP approach (fast + good enough)
Candidate duplicates = issues within:
radius 25–50 meters (geospatial query)
same category
created in last 30 days
If candidates exist: show “Is it one of these?” before allowing submit:
If user selects one: follow it + attach new photo (avoid duplicate)
V1 improvements
Image similarity embeddings to detect same pothole
“Near intersection” normalization (snap to road graph)
Merge logic with audit trail (never delete; mark duplicate_of)
9) Moderation, abuse prevention, and privacy
Strip EXIF metadata from photos (no accidental home coordinates)
Rate limiting per device + per account (report spam)
“Approximate location” mode (snap to block-level for sensitive reports)
Sensitive categories (homelessness, needles): default to PRIVATE_TO_CITY visibility
Clear reporting guidelines; blocklist; escalation to staff queue
10) Accessibility requirements (don’t bolt it on later)
Even though WCAG is a web standard, its principles are useful for your product requirements (contrast, focus, status messaging, etc.). WCAG 2.2 is the current W3C recommendation. 
4

Practical mobile requirements:

Full app usable at large font sizes (Dynamic Type)
VoiceOver/TalkBack labels for every icon-only button
Map pins have an accessible list alternative (“List view”)
Status changes produce accessible announcements (similar to WCAG “status messages” principle)
High contrast mode support; color is never the only indicator (status chips also have text)
11) MVP build plan (8 weeks, realistic)
Week 1: Foundations
Auth, basic DB schema, S3 media upload
Map feed endpoint + simple UI
Week 2: Report flow v1
Camera → pin → category → submit
Issue detail screen + timeline
Week 3: Follow + notifications
Follow issue + push notifications for status/comments
Basic staff portal: list issues, update status
Week 4: Dedupe v1
Proximity-based duplicate candidates
“Follow instead of submit” UX
Week 5: Moderation + trust
Rate limits, flagging, staff moderation queue
EXIF stripping + privacy modes
Week 6: Pilot city onboarding
Add jurisdictions + category configuration UI
SLA fields (optional)
Week 7: Open311 connector (optional but high leverage)
Implement Open311 “services → request submission → status fetch” connector. GeoReport v2 documents listing services and creating/querying requests via /services and /requests. 
2
Add service discovery support (store discovery URL per jurisdiction). Service discovery is part of GeoReport v2 ecosystem. 
5
Week 8: Stabilize + analytics
Performance (map clustering, caching)
Metrics dashboard (submit time, duplicate avoidance rate, resolution time)







CivicLens — Screen-by-screen PRD + wireframe checklist (mobile app)
Scope: consumer smartphone app with tabs (Map, Feed, Report, Notifications, Profile) plus required flows (Auth, Permissions, Report creation, Duplicate prevention, Issue detail + follow + add info, Basic staff mode). This PRD is consistent with the architecture and assumptions we already defined (camera + GPS, dedupe, status lifecycle, optional Open311 integration, privacy modes, moderation/rate limits).

Global conventions (applies to every screen)
Status model (for UI + analytics)
SUBMITTED
ACKNOWLEDGED
IN_PROGRESS
CLOSED
REJECTED
MERGED (implemented as duplicate_of_issue_id != null, UI shows “Merged into Issue #…”)
Required UI patterns
Bottom tab bar with center FAB for Report
Bottom sheet for filters, category selection, and issue preview (thumb-friendly)
Skeleton loading for lists/cards
Retry and report a bug affordances on error states
Accessibility baseline requirements
All icon buttons have accessible labels
Map has a List view alternative
Status changes provide accessible announcement (“Issue status updated: In progress”)
Color never conveys meaning alone (status chip includes text)
Dynamic Type supported (no clipped text at large font sizes)
Analytics naming convention
Event prefix: civiclens_
Common properties on all events:
user_id (nullable if anonymous)
jurisdiction_id
session_id
network_state (online|offline|poor)
app_version
Common screen event:
civiclens_screen_view with screen_name
0) App start + onboarding
0.1 Splash / App Launch
Purpose: cold start, session restore, routing.

Wireframe checklist

App logo/wordmark
Loading indicator (subtle)
Optional: short tagline (“Report issues. Track fixes.”)
States

Loading: checking auth, fetching cached jurisdiction
Error: “Can’t connect” with Retry (only if required boot calls fail)
Offline: allow limited browsing of last cached feed (optional), but reporting disabled until online
Accessibility

Avoid flashing animations
Respect reduced motion
Analytics

civiclens_app_open (properties: cold_start=true|false)
civiclens_bootstrap_success
civiclens_bootstrap_error (include error_code)
0.2 Permission Primer (pre-permission screen)
Purpose: explain why you need Location and Notifications before asking OS permission.

Wireframe checklist

Two cards:
Location: “Auto-pin issues accurately”
Notifications: “Get updates when it’s fixed”
Buttons:
“Continue”
“Not now” (still usable; location can be manual pin)
States

Standard
If previously denied: show “Enable in Settings” deep-link
Accessibility

Large tap targets
Clear, plain language
Analytics

civiclens_permission_primer_view
civiclens_permission_primer_continue
civiclens_permission_primer_skip
0.3 OS Permission Prompts (Location / Notifications)
Purpose: request OS permissions.

Wireframe checklist

Trigger OS prompt on user action (never immediately on load)
States

Granted
Denied (show follow-up screen with Settings deep-link)
Accessibility

Ensure follow-up screen is screen-reader friendly
Analytics

civiclens_permission_request (permission=location|notifications)
civiclens_permission_result (result=granted|denied|restricted)
0.4 Auth Gate (optional / soft)
Assumption preserved: reporting can allow anonymous, but account improves tracking and abuse prevention.

Purpose: enable sign-in for better experience; allow “Continue as guest.”

Wireframe checklist

“Sign in” (phone/email magic link)
“Continue as guest”
Privacy note (“We never sell your data”)
States

Loading: sending code/link
Error: invalid phone/email, rate limit
Success: verified
Accessibility

Input labels, error text read aloud
One-time code supports OS auto-fill
Analytics

civiclens_auth_start
civiclens_auth_verify_success
civiclens_auth_verify_fail (reason)
civiclens_guest_continue
1) Map Tab (primary)
1.1 Map — Nearby Issues (default landing)
Purpose: browse issues spatially; entry point to issue details and reporting.

Primary actions

Pan/zoom map
Tap pin → preview card
Switch to list view
Open filters
Hit “Report” FAB
API/data

GET /v1/issues?bbox=...&status=...&category=...
Cached categories for filter chips
Device location for “near me”
Wireframe checklist

Map canvas
Top overlay:
Search (optional MVP), or “Current area”
Filter button
“List” toggle
Pin clusters with count badges
Bottom preview card (on pin tap):
Category icon + title
Status chip
Distance
“View details”
“Follow”
“Report” FAB (center tab)
States

Loading:
Map visible
Pins skeleton/placeholder + “Loading issues…”
Empty:
“No issues in this area” + “Report one” CTA
Error:
“Couldn’t load issues” + Retry
Location denied:
Default to city center / last location
Banner: “Enable location for better accuracy”
Poor network:
Degrade to cached pins + “May be out of date”
Accessibility

Provide List view equivalent for pins
Pin clusters: accessible label (“12 issues in this cluster”)
Map gestures: provide buttons for zoom in/out for motor accessibility
Analytics

civiclens_screen_view (screen_name=map)
civiclens_map_pan_zoom
civiclens_filter_open
civiclens_filter_apply (props: selected statuses/categories)
civiclens_issue_pin_tap (props: issue_id)
civiclens_issue_preview_follow
civiclens_issue_preview_open_details
1.2 Map Filters (bottom sheet)
Purpose: refine issues shown.

Wireframe checklist

Status multi-select chips
Category chips (scrollable)
Sort (newest / nearest / most followed)
Toggle: “Show only followed”
Buttons: “Apply”, “Reset”
States

Loading categories
Error loading categories (fallback to status-only)
Accessibility

Ensure chips are keyboard/switch accessible
Announce filter changes (“Status filter: In progress selected”)
Analytics

civiclens_filter_sheet_view
civiclens_filter_change (per control)
civiclens_filter_reset
civiclens_filter_apply
1.3 Map List View (accessible alternative)
Purpose: browse issues without map.

Wireframe checklist

List cards with:
Thumbnail (latest photo)
Title/category
Status chip
Distance + address snippet
Follow button
Pull to refresh
States

Loading skeleton list
Empty (no issues)
Error + Retry
Accessibility

Works fully with screen reader
Supports dynamic type without truncation
Analytics

civiclens_screen_view (screen_name=map_list)
civiclens_issue_card_open
civiclens_issue_card_follow
2) Report Flow (center tab / FAB)
2.1 Report — Camera Capture
Purpose: capture evidence fast.

Primary actions

Take photo / optional short video
Retake
Continue
API/data

None yet (local capture)
Device camera permission
Wireframe checklist

Camera viewfinder
Capture button
Flash toggle
Gallery import (optional)
“Cancel”
After capture: preview with “Retake” and “Use photo”
States

Camera permission denied: explanation + Settings link
Capture saving: short loading overlay
Error: camera unavailable
Accessibility

Large capture button
VoiceOver labels (“Take photo”)
Haptic feedback on capture (optional; respect settings)
Analytics

civiclens_screen_view (screen_name=report_camera)
civiclens_camera_permission_denied
civiclens_report_media_captured (type=photo|video)
civiclens_report_media_retake
2.2 Report — Location Pin Confirm
Purpose: ensure correct location (GPS + manual correction).

Primary actions

Confirm location
Drag pin / “use my location”
Set privacy mode (exact vs approximate)
Continue
API/data

Reverse geocode (optional) for address snippet
Device GPS
Wireframe checklist

Mini map with pin
Address snippet (if available)
Buttons:
“Use current location”
“Adjust pin”
Privacy selector:
Exact location (default)
Approximate (block-level)
Continue
States

Loading map tiles
GPS unavailable: allow manual pin placement
Error reverse geocode: hide address, continue allowed
Accessibility

Provide “Enter location manually” (search/address) if map hard to use
Announce pin move actions
Analytics

civiclens_screen_view (screen_name=report_location)
civiclens_report_location_confirmed
civiclens_report_location_adjusted
civiclens_report_privacy_mode_set (mode=exact|approximate)
2.3 Report — Category Selection
Purpose: classify the issue (with ML-assisted suggestions, user-confirmed).

Primary actions

Choose category
See suggested top categories
API/data

Categories for jurisdiction: GET /v1/jurisdictions/{id}/categories
Wireframe checklist

“Suggested” section (top 3)
Full category list (icons + names)
Search within categories (optional)
Continue disabled until selection
States

Loading categories
Empty (no categories configured): fallback to “Other”
Error fetching categories: show cached categories or “Other”
Accessibility

Large list items, clear labels
Avoid icon-only categories
Analytics

civiclens_screen_view (screen_name=report_category)
civiclens_category_suggested_shown
civiclens_report_category_selected (category_id)
2.4 Report — Details (severity + note)
Purpose: capture minimal extra info for triage.

Wireframe checklist

Severity slider (1–5) with labels (“Minor” → “Severe”)
Toggle: “Unsafe now”
Optional text note (“What’s happening?”)
Optional anonymity toggle (if allowed)
“Continue”
States

Standard
Error: validation (e.g., note too long)
Accessibility

Slider has discrete steps, label announces current value
Text field supports dictation
Analytics

civiclens_screen_view (screen_name=report_details)
civiclens_report_severity_set (severity)
civiclens_report_unsafe_now_toggle (value=true|false)
civiclens_report_note_added (len only)
2.5 Report — Duplicate Check (pre-submit)
Purpose: prevent duplicate reports.

API/data

GET /v1/issues/duplicates/candidates (or GET /v1/issues?radius=... in MVP)
Wireframe checklist

“Possible matches near this location”
List of candidate issue cards:
photo thumbnail
status chip
distance
“This is it” button
“None of these” → proceed to submit
States

Loading candidates
Empty: “No duplicates found” → proceed
Error: can’t check duplicates → allow submit but show warning
Accessibility

Fully operable as list, no map requirement
Analytics

civiclens_screen_view (screen_name=report_duplicates)
civiclens_duplicate_candidates_loaded (count)
civiclens_duplicate_selected_follow (issue_id)
civiclens_duplicate_none_proceed
2.6 Report — Review & Submit
Purpose: final confirmation; submit issue.

API/data

POST /v1/issues
POST /v1/issues/{id}/media signed URL flow
Wireframe checklist

Summary card: photo, category, location, severity
Edit links: photo / location / category / details
Submit button (primary)
Small disclaimer: “Do not report emergencies”
States

Submitting (disable controls, spinner)
Success: route to Issue Detail (new issue)
Error:
Network fail → retry
Rate limited → show cooldown
Moderation blocked → show “needs review” messaging
Accessibility

Submit button reachable, large, labeled
Error messaging readable and announced
Analytics

civiclens_screen_view (screen_name=report_review)
civiclens_issue_submit_attempt
civiclens_issue_submit_success (issue_id)
civiclens_issue_submit_fail (reason)
3) Issue Detail + Engagement
3.1 Issue Detail (public view)
Purpose: the canonical place to see status, timeline, media, and actions.

API/data

GET /v1/issues/{id}
GET /v1/issues/{id}/duplicates/candidates (optional display if merged)
POST /v1/issues/{id}/follow
POST /v1/issues/{id}/vote
POST /v1/issues/{id}/comment
POST /v1/issues/{id}/media
Wireframe checklist

Header:
Category icon + title
Status chip + last updated time
Media carousel (photos)
Location section:
map snippet + “Open in maps”
address/landmark (if allowed)
Key fields:
severity
unsafe now badge (if true)
Actions row:
Follow / Unfollow
Upvote priority
Add info (photo)
Comment
Share
Timeline / activity log:
status changes
comments
merges
States

Loading skeleton
Error (not found / removed / private):
404: “Issue not found”
Private: “Visible to city only”
Merged:
Banner “Merged into Issue #X” + link
Closed:
Show “Resolved?” prompt and “Report still there” option (optional)
Accessibility

Carousel has accessible “Next photo” controls
Timeline is navigable and readable in screen readers
Status chip text is explicit (“In progress”)
Analytics

civiclens_screen_view (screen_name=issue_detail, issue_id)
civiclens_issue_follow_toggle (issue_id, followed=true|false)
civiclens_issue_vote (issue_id)
civiclens_issue_share (issue_id, channel)
civiclens_issue_open_in_maps
civiclens_issue_add_info_start
3.2 Add Info (attach new photo/video)
Purpose: allow follow-up evidence without creating duplicates.

Wireframe checklist

Camera capture (reuse Report Camera component)
Optional note (“What changed?”)
Submit
States

Uploading media
Success: new timeline item appears
Error: upload fail → retry; keep local draft
Accessibility

Same camera accessibility requirements
Upload progress announced
Analytics

civiclens_add_info_capture
civiclens_add_info_submit_success (issue_id)
civiclens_add_info_submit_fail
3.3 Comment Composer
Purpose: add context / coordinate with others.

Wireframe checklist

Text input
Optional quick tags (e.g., “Happened again”, “Worse”, “Fixed?”)
Post button
States

Posting
Error: rate limit/spam detection
Empty: disable Post for blank
Accessibility

Proper focus management, error messages announced
Analytics

civiclens_comment_post_attempt
civiclens_comment_post_success
civiclens_comment_post_fail (reason)
3.4 Share Issue
Purpose: share with neighbors, neighborhood groups.

Wireframe checklist

OS share sheet
Copy link button
Share text includes short title + location snippet + status
States

Link generation loading (if dynamic links)
Error fallback: copy raw URL
Accessibility

Buttons labeled; share result doesn’t need tracking beyond event
Analytics

civiclens_issue_share_initiated (issue_id)
4) Feed Tab
4.1 Feed — Nearby Updates
Purpose: narrative view of what’s happening nearby.

Wireframe checklist

Segments:
Nearby
Following
My reports
Feed cards:
“Resolved” cards
“New issue” cards
“Status changed” cards
States

Loading skeleton
Empty: “Nothing yet—follow issues to get updates”
Error: Retry
Accessibility

Cards have proper headings and summary text
Supports large fonts
Analytics

civiclens_screen_view (screen_name=feed)
civiclens_feed_segment_change
civiclens_feed_card_open_issue (issue_id)
4.2 My Reports (within Feed or Profile)
Purpose: manage your own submissions.

Wireframe checklist

List of issues reported by user
Status chips + last update time
Filter by status
States

Empty: “You haven’t reported anything”
Error
Accessibility

Same as lists; clear status text
Analytics

civiclens_screen_view (screen_name=my_reports)
civiclens_my_reports_open_issue
5) Notifications Tab
5.1 Notifications List
Purpose: show status changes, comments, merges, city requests.

Wireframe checklist

Notification items:
icon (status/comment/merge)
message
timestamp
unread dot
Tap navigates to Issue Detail
Clear all (optional)
States

Loading
Empty: “No notifications yet”
Error: Retry
Accessibility

Unread state conveyed via text (“Unread”) not only dot
Tap targets large
Analytics

civiclens_screen_view (screen_name=notifications)
civiclens_notification_open (issue_id, notification_type)
civiclens_notifications_clear_all
6) Profile Tab
6.1 Profile Home
Purpose: user settings, privacy, exports, account.

Wireframe checklist

User identity block:
signed in: name + edit
guest: “Sign in to sync across devices”
Settings list:
Privacy mode default (exact/approximate)
Notification preferences
Blocked users list (optional)
Data export
About / help
Report abuse
States

Loading user profile
Error loading profile (still show cached)
Accessibility

Settings are standard, accessible list items
Analytics

civiclens_screen_view (screen_name=profile)
civiclens_profile_sign_in_cta_tap
civiclens_privacy_default_change
civiclens_notification_pref_change
civiclens_export_data_request
6.2 Privacy Settings
Purpose: control visibility + location precision.

Wireframe checklist

Default location precision:
Exact
Approximate (block-level)
Visibility options:
Public
Private to city (recommended for sensitive categories)
Private (personal notes only; generally not useful for civic—consider disabling)
States

Save in progress
Error saving → revert UI with message
Accessibility

Radio buttons with clear descriptions
Analytics

civiclens_privacy_setting_view
civiclens_privacy_setting_save_success
civiclens_privacy_setting_save_fail
6.3 Notification Preferences
Purpose: control push frequency.

Wireframe checklist

Toggles:
Status changes
Comments
Nearby digest
Quiet hours (optional)
Test notification (dev/debug)
States

Save success/fail
Accessibility

Toggles labeled, described
Analytics

civiclens_notification_pref_view
civiclens_notification_pref_toggle
6.4 Help / Safety
Purpose: guide users and prevent misuse.

Wireframe checklist

“What to report”
“Not for emergencies” section
Links: city emergency number guidelines
Report abuse flow entry
States

Content load error (static fallback)
Accessibility

Readable, simple language
Analytics

civiclens_help_view
civiclens_report_abuse_start
7) Staff Mode (mobile-friendly web or in-app gated)
This keeps the core assumption: there is a basic staff portal for cities that don’t integrate.

7.1 Staff Login (role-gated)
Purpose: staff authentication.

Wireframe checklist

Staff sign-in (email/password or SSO)
Jurisdiction selector (if staff spans multiple)
States

Loading, error, locked account
Accessibility

Standard form requirements
Analytics

civiclens_staff_login_attempt
civiclens_staff_login_success
civiclens_staff_login_fail
7.2 Staff Issue Queue
Purpose: triage backlog.

Wireframe checklist

Filters: status, category, severity, unsafe now
Sort: newest, highest votes, oldest open
Issue list with key metadata
Tap issue → staff detail view
States

Loading, empty, error
Accessibility

Keyboard navigation if web; screen reader-friendly list
Analytics

civiclens_staff_queue_view
civiclens_staff_filter_apply
7.3 Staff Issue Detail (manage status)
Purpose: update status, add staff notes, merge duplicates.

Wireframe checklist

Current status + quick buttons:
Acknowledge
Start work
Close
Reject (requires reason)
Comment to public timeline (optional)
Staff-only notes (private)
Merge action (select duplicate target)
States

Saving status, success, error rollback
Permission denied (non-staff)
Accessibility

Confirmations for destructive actions (merge/reject)
Analytics

civiclens_staff_status_change (from, to, issue_id)
civiclens_staff_merge (source_issue_id, target_issue_id)
civiclens_staff_reject (reason_code)
8) Cross-cutting empty/loading/error states (required everywhere)
Loading
Use skeletons for lists and cards
Use progress indicators for uploads/submits
Don’t block navigation unless required for data integrity (e.g., during submit)
Empty
Always explain why it’s empty and what to do next:
Map: “No issues here—report one”
Notifications: “Follow issues to get updates”
My reports: “Report your first issue”
Error
Standard error component should support:

Short message
Retry
Contact support / “Report a bug”
Developer-only “Error details” in debug builds
Poor network / offline
Show banner “Connection is unstable”
Allow browsing cached data where possible
Reporting:
If submit fails: keep draft locally + “Try again” (do not silently drop)
9) Analytics event catalog (minimum viable instrumentation)
These are the events you need to validate product-market fit quickly:

Activation / funnel

App open → permission primer → location granted → first issue submitted
Events: app_open, permission_result, issue_submit_success
Report completion time

Track timestamp between report_camera view and issue_submit_success
Duplicate prevention effectiveness

duplicate_candidates_loaded count
duplicate_selected_follow rate vs duplicate_none_proceed
City responsiveness / trust

Time from SUBMITTED to ACKNOWLEDGED
Follow rate and notification open rate
Engagement

Follow toggles
Votes
Add info submissions
Shares
Deliverable checklist (what “complete” wireframes must include)
For every screen above, your wireframes should include:

Default state
Loading state
Empty state
Error state
Permission denied state (where relevant)
Large text accessibility pass (no truncation)
Screen reader labels for all icon actions
Analytics event triggers annotated at key interactions







