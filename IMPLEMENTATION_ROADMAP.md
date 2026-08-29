# Pet Adoption App - Complete Implementation Roadmap
**Priority: Heaviest Work First | Approach: Backend-Complete → Frontend-Complete**

---

## 🎯 CRITICAL PATH (Start Here)

### Phase 1: Backend - Database & Core Models (HEAVIEST - START HERE)
**Why first?** Everything depends on these models. Frontend can't work without APIs.

- [ ] **1.1: Personality Trait System** (Complexity: ⭐⭐⭐⭐⭐)
  - Create `PersonalityTrait` model (e.g., "energetic", "calm", "friendly")
  - Create `TraitCategory` (Dogs, Cats, Fish, etc.)
  - Create `BreedTraitProfile` (map breeds → personality traits)
  - **Why complex?** Need comprehensive trait database to train ML model

- [ ] **1.2: Quiz System Models** (Complexity: ⭐⭐⭐⭐)
  - `QuizQuestion` model (question text, question type)
  - `QuizAnswer` model (possible answers with trait mappings)
  - `AdopterQuizResponse` model (user's answers + calculated trait vector)
  - `QuizCategory` (lifestyle, housing, experience, time availability)
  - **Why complex?** Multiple question types (multiple choice, slider, checkbox)

- [ ] **1.3: Pet Profile Enhancement** (Complexity: ⭐⭐⭐)
  - Extend existing `Pet` model with personality fields
  - Add `PetPersonalityProfile` model (vector of traits)
  - Add translation fields for bio/description
  - **Why complex?** Need to map existing pets → personality vectors

- [ ] **1.4: Matching System Models** (Complexity: ⭐⭐⭐⭐)
  - `CompatibilityScore` model (store adopter-to-pet matches)
  - `MatchingAlgorithmConfig` model (ML model weights, training data)
  - `AdoptionOutcome` model (track successful/unsuccessful matches for retraining)
  - **Why complex?** This is the core AI - needs versioning and history

- [ ] **1.5: User Preferences & Localization** (Complexity: ⭐⭐⭐)
  - Extend `CustomUser` with `preferred_language` field
  - Add `UserTimezone` field
  - Add `last_language_change` timestamp
  - **Why complex?** Must sync across all user actions

- [ ] **1.6: Translation Cache Model** (Complexity: ⭐⭐)
  - `TranslationCache` model (store API results from Google Translate)
  - Avoid repeated API calls for same text
  - **Why complex?** Rate limiting + cost optimization

---

### Phase 2: Backend - Machine Learning Core (CRITICAL COMPLEXITY)
**Why second?** Uses models from Phase 1. No frontend work can happen until this is ready.

- [ ] **2.1: Personality Vector System** (Complexity: ⭐⭐⭐⭐⭐)
  - Create `PersonalityVector` class (convert traits → numerical vectors)
  - **Example:**
    ```
    Adopter traits: [active=0.8, patient=0.7, indoor=0.3] 
    Golden Retriever: [energetic=0.9, friendly=0.95, social=0.9]
    Match score: cosine_similarity([...]) = 0.87 (87%)
    ```
  - Use scikit-learn for cosine similarity
  - **Why critical?** All matching depends on this

- [ ] **2.2: ML Model Training Pipeline** (Complexity: ⭐⭐⭐⭐⭐)
  - Create initial training data (breed standards + adopter archetypes)
  - Train model on historical adoption data (if exists) or seed data
  - Save trained model weights to database
  - Create `model.predict(adopter_vector)` → returns ranked pets
  - **Why critical?** This IS the "custom AI"

- [ ] **2.3: Matching Algorithm** (Complexity: ⭐⭐⭐⭐)
  - Input: Adopter quiz response
  - Output: Ranked list of compatible pets (with % scores)
  - Filter by: location, age preferences, breed restrictions
  - Sort by: compatibility_score DESC
  - **Why critical?** Directly used by frontend slideshow

---

### Phase 3: Backend - REST APIs (HEAVY)
**Why third?** Frontend depends on these. Core business logic.

- [ ] **3.1: Quiz API Endpoints** (Complexity: ⭐⭐⭐⭐)
  - `GET /api/quizzes/` - list available quizzes
  - `GET /api/quizzes/{id}/questions/` - get quiz questions (paginated)
  - `POST /api/quizzes/{id}/submit/` - submit answers → store response → calculate traits
  - `GET /api/users/me/quiz-responses/` - user's past responses

- [ ] **3.2: Pet Matching API** (Complexity: ⭐⭐⭐⭐)
  - `POST /api/matching/calculate/` - given adopter ID, return compatible pets
  - Returns: `[{pet_id, name, image, match_score: 87}, ...]`
  - `GET /api/matching/history/` - adopter's match history

- [ ] **3.3: Pet Management API** (Complexity: ⭐⭐⭐)
  - `POST /api/pets/` - create pet (rehomer entry)
  - `PUT /api/pets/{id}/personality/` - update pet personality traits
  - `GET /api/pets/{id}/` - get pet details + description (translated)

- [ ] **3.4: Translation API** (Complexity: ⭐⭐)
  - `POST /api/translate/` - call Google Translate API
  - Cache result in `TranslationCache` model
  - Return: `{en: "...", fr: "...", de: "...", ...}`

- [ ] **3.5: User Preferences API** (Complexity: ⭐⭐)
  - `PUT /api/users/me/preferences/` - update language, timezone
  - `GET /api/settings/languages/` - list supported languages
  - `GET /api/settings/timezones/` - list supported timezones

- [ ] **3.6: Conversation History API** (Complexity: ⭐⭐⭐)
  - `POST /api/conversations/` - start new conversation
  - `POST /api/conversations/{id}/messages/` - add user message
  - `GET /api/conversations/{id}/messages/` - get conversation history
  - (For voice/chat bot integration)

---

### Phase 4: Backend - Voice/Chat Bot Service (MEDIUM-HEAVY)
**Why fourth?** Backend APIs complete, now add conversational layer.

- [ ] **4.1: Conversation Manager** (Complexity: ⭐⭐⭐)
  - Store conversation state (which pet discussed, preferences shared, etc.)
  - Prompt engineering for Claude/custom bot
  - Parse bot responses → extract actionable data

- [ ] **4.2: Voice API Integration** (Complexity: ⭐⭐)
  - Google Cloud Speech-to-Text integration
  - Google Cloud Text-to-Speech integration
  - Queue system for voice processing
  - Store voice interactions for learning

- [ ] **4.3: Greeting & Context** (Complexity: ⭐)
  - Generate personalized greetings ("Hello {user.name}")
  - Pass context: language, timezone, past interactions
  - Format bot responses per language

---

## ✅ BACKEND COMPLETE - FRONTEND BEGINS HERE

---

### Phase 5: Frontend - Quiz UI (HEAVY)
**Now that APIs work, build UI to consume them.**

- [ ] **5.1: Virtual Book Component** (Complexity: ⭐⭐⭐⭐)
  - Page-turning animation (CSS/Framer Motion)
  - Question carousel (prev/next page)
  - Progress indicator (Page 3 of 10)
  - Mobile-friendly swipe gestures

- [ ] **5.2: Quiz Question Types** (Complexity: ⭐⭐⭐)
  - Multiple choice buttons
  - Slider input (1-10 scale)
  - Checkbox groups
  - Text input fields
  - Image selection

- [ ] **5.3: Quiz Flow & State** (Complexity: ⭐⭐⭐)
  - Fetch questions from API
  - Track answers locally
  - Show progress
  - Submit to backend on completion
  - Display result: "You're 87% compatible with Golden Retrievers!"

- [ ] **5.4: Voice Input for Quiz** (Complexity: ⭐⭐⭐)
  - Web Speech API for question audio
  - User can speak answers
  - Transcribe → map to options
  - Fallback to text input

---

### Phase 6: Frontend - Pet Slideshow (HEAVY)
**Build the core matching experience.**

- [ ] **6.1: Slideshow Component** (Complexity: ⭐⭐⭐⭐)
  - Fetch matched pets from API
  - Display one pet at a time
  - Swipe/tap to next pet
  - Double-tap to "like"
  - Show pet details: name, age, breed, personality, bio (translated)

- [ ] **6.2: Pet Card Design** (Complexity: ⭐⭐⭐)
  - Hero image
  - Name & age
  - Personality tags: "Energetic", "Friendly", "Calm"
  - Match score: "87% compatible"
  - Bio (translated from backend)
  - Like/Dislike buttons

- [ ] **6.3: Like/Dislike Logic** (Complexity: ⭐⭐)
  - POST to backend when user likes
  - Store in `AdoptionPreference` or similar
  - Update next slideshow based on preferences
  - Show "Liked" pets in separate list

---

### Phase 7: Frontend - Homepage & Voice Bot (HEAVY)
**The visual centerpiece and conversational entry point.**

- [ ] **7.1: Throbbing Circle Animation** (Complexity: ⭐⭐)
  - CSS keyframe animation (heartbeat effect)
  - SVG or div-based
  - Clickable to start voice interaction

- [ ] **7.2: Voice Chat Interface** (Complexity: ⭐⭐⭐⭐)
  - Microphone input (Web Speech API)
  - Show user's transcribed text
  - Display bot response with audio
  - Chat history view (optional)
  - Fallback to text chat

- [ ] **7.3: Greeting & Navigation** (Complexity: ⭐⭐)
  - Bot greets by name: "Hello {user.name}!"
  - Bot asks: "Interested in cats or dogs?"
  - Route to pet slideshow based on answer
  - Language in user's preferred language

- [ ] **7.4: Conversation Persistence** (Complexity: ⭐⭐)
  - Save conversation to backend
  - Resume interrupted conversations
  - Extract preferences from conversation

---

### Phase 8: Frontend - Settings & User Preferences (MEDIUM)
**Language & timezone configuration.**

- [ ] **8.1: Settings Page** (Complexity: ⭐⭐⭐)
  - Language selector dropdown
  - Timezone selector dropdown
  - Save to backend
  - Update UI immediately on change

- [ ] **8.2: Language Switching** (Complexity: ⭐⭐)
  - i18next setup in React
  - Switch language → reload translations
  - Fetch new pet descriptions (translated)
  - Update date/time formats

- [ ] **8.3: Signup Language Selection** (Complexity: ⭐⭐)
  - Language picker on registration
  - Timezone picker on registration
  - Store in user model

---

### Phase 9: Frontend - Rehomer Pet Entry Form (MEDIUM)
**Allow rehomers to add pets with personality traits.**

- [ ] **9.1: Multi-Page Pet Form** (Complexity: ⭐⭐⭐⭐)
  - Page 1: Pet info (name, species, breed, age)
  - Page 2: Medical (vaccines, birth date, health notes)
  - Page 3: Personality traits (checkboxes: calm, energetic, etc.)
  - Page 4: Photos upload
  - Virtual book page-turning

- [ ] **9.2: Personality Trait Selection** (Complexity: ⭐⭐)
  - Visual trait cards (icons + labels)
  - Multi-select checkboxes
  - Predefined traits per species
  - Custom trait input (optional)

- [ ] **9.3: Form Submission** (Complexity: ⭐⭐)
  - Validate all fields
  - POST to backend `/api/pets/`
  - Show success message
  - Redirect to pet profile

---

### Phase 10: Mobile (Expo) - Mirror Frontend (MEDIUM)
**Same features as web, optimized for mobile.**

- [ ] **10.1: Quiz for Mobile** (Complexity: ⭐⭐⭐)
  - React Native version of virtual book
  - Swipe animations (React Native Gesture Handler)
  - Voice input with Expo Audio API

- [ ] **10.2: Slideshow for Mobile** (Complexity: ⭐⭐⭐)
  - Full-screen pet cards
  - Swipe left/right
  - Native gestures

- [ ] **10.3: Voice Bot for Mobile** (Complexity: ⭐⭐⭐)
  - Expo Audio for microphone
  - Expo notifications for updates

---

## 📊 Priority Summary (Ordered by Start Time)

### TIER 1: BACKEND FOUNDATION (Weeks 1-2)
1. Database schema (Phase 1) ⭐⭐⭐⭐⭐
2. ML matching algorithm (Phase 2) ⭐⭐⭐⭐⭐
3. REST APIs (Phase 3) ⭐⭐⭐⭐

### TIER 2: BACKEND SERVICES (Week 3)
4. Voice/Chat bot backend (Phase 4) ⭐⭐⭐

### TIER 3: FRONTEND UI (Weeks 4-5)
5. Quiz UI (Phase 5) ⭐⭐⭐⭐
6. Pet slideshow (Phase 6) ⭐⭐⭐⭐
7. Homepage & voice bot (Phase 7) ⭐⭐⭐⭐

### TIER 4: FRONTEND SETTINGS (Week 6)
8. Settings & preferences (Phase 8) ⭐⭐⭐
9. Rehomer form (Phase 9) ⭐⭐⭐⭐

### TIER 5: MOBILE (Weeks 7-8)
10. Expo mobile app (Phase 10) ⭐⭐⭐

---

## 🔗 Dependencies Map

```
Phase 1 (Models)
    ↓
Phase 2 (ML Algorithm)
    ↓
Phase 3 (APIs) ← ← ← ← ← ← ← ← ↑
    ↓                           |
Phase 4 (Voice)                |
    ↓                           |
[BACKEND COMPLETE]              |
    ↓                           |
Phase 5 (Quiz UI) ────────────┘
Phase 6 (Slideshow) ──────────┘
Phase 7 (Homepage) ───────────┘
    ↓
Phase 8 (Settings)
Phase 9 (Rehomer Form)
    ↓
Phase 10 (Mobile)
```

---

## 🚀 NEXT STEP

**Start with Phase 1.1: Personality Trait System**
- This unblocks everything else
- Most complex, get it done first
- Ready to code?
