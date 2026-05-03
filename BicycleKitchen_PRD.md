# PRODUCT REQUIREMENTS DOCUMENT
# LA Cycling Companion — Bicycle Kitchen
# Hackathon Build — One Day Sprint

---

## OVERVIEW

Build a mobile-first React web app that turns nervous new cyclists into confident LA riders.
The app is built for Bicycle Kitchen, a nonprofit bike repair education org in Los Angeles.

**Core problem:** People leave Bicycle Kitchen with a fixed bike but no idea how to ride safely in LA.
**Solution:** An AI-powered cycling companion app with three modules:
1. A personalized onboarding flow that builds a rider profile
2. An on-screen learning hub with lessons, quizzes, route planning, and street view ride preview
3. A real-time AI voice companion for live rides

---

## TECH STACK

- React + Vite
- Tailwind CSS
- React Router (client-side routing)
- Claude API: claude-sonnet-4-20250514 (AI responses, onboarding summary, quiz explanations)
- Google Maps JavaScript API (map display, route planning, street view)
- Google Places API (address autocomplete)
- Google Directions API (bike route calculation, travelMode: BICYCLING)
- Google Geocoding API (reverse geocode live position to street/neighborhood)
- Web Speech API — SpeechSynthesis (text-to-speech output)
- Web Speech API — SpeechRecognition (voice input from user)
- Geolocation API — navigator.geolocation.watchPosition (live position tracking)
- localStorage for user profile persistence (no backend, no accounts)

---

## ENVIRONMENT VARIABLES

```
VITE_GOOGLE_MAPS_API_KEY=
VITE_ANTHROPIC_API_KEY=
```

Google Cloud APIs to enable:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API
- Street View Static API

---

## DESIGN SYSTEM

**Aesthetic:** Urban bike shop zine. Bold, high-contrast, community energy. Not corporate.
**Palette:**
  - Primary: #F4640A (orange)
  - Background: #0F0F0F (near black)
  - Surface: #1A1A1A (dark card)
  - Cream: #F5F0E8 (text, accents)
  - Danger: #E63946 (hazard alerts)
  - Safe: #2DC653 (beginner-friendly indicators)

**Typography:**
  - Headings: Bebas Neue (Google Fonts)
  - Body: DM Sans (Google Fonts)

**General UI rules:**
  - Mobile-first, max-width 430px centered on desktop
  - Cards with 1px border using orange accent
  - Buttons: bold, full-width on mobile, orange fill or outlined
  - Icons: use lucide-react
  - No purple gradients. No Inter font. No generic AI aesthetics.

---

## FILE STRUCTURE

```
src/
  components/
    Map.jsx                  # Google Maps wrapper component
    StreetViewPreview.jsx    # Street View slideshow along route
    VoiceCompanion.jsx       # Core voice logic (TTS + STT + Claude)
    QuizCard.jsx             # Renders a single quiz question
    RouteCard.jsx            # Renders a single route option
    LessonCard.jsx           # Renders a single lesson
    ProgressBar.jsx          # Lessons completed tracker
    PermissionBanner.jsx     # "Got a tip — hear it?" consent UI
  pages/
    Onboarding.jsx           # 5-screen onboarding flow
    Dashboard.jsx            # Main hub with 3 module cards
    Routes.jsx               # Route planner + Street View preview
    Ride.jsx                 # Voice companion live mode
    Learn.jsx                # Lessons + quizzes hub
    Simulation.jsx           # Scenario simulation quiz
  data/
    routeConfig.js           # LA corridor difficulty + hazard notes
    neighborhoodTips.js      # Location-triggered neighborhood tips
    lessons.js               # Static lesson content (5 lessons)
    quizzes.js               # All quiz questions + answers (5 quizzes)
    simulationScenarios.js   # Scenario cards for simulation quiz
  hooks/
    useGeolocation.js        # watchPosition wrapper with cleanup
    useVoice.js              # SpeechSynthesis + SpeechRecognition
    useProfile.js            # localStorage read/write for rider profile
    useClaude.js             # Claude API call wrapper
  App.jsx                    # Router setup
  main.jsx                   # Entry point
```

---

## MODULE 1: ONBOARDING (/onboarding)

5-screen flow. No account required. Saves everything to localStorage key: `bk_profile`.

### Screen 1 — Comfort Level
Question: "How comfortable are you on a bike?"
4 options rendered as large tap targets with icons:
- 0: "Never ridden" (icon: bicycle with question mark)
- 1: "Ridden casually — parks and paths" (icon: trees/park)
- 2: "Some street riding" (icon: road)
- 3: "Regular urban cyclist" (icon: city buildings)
Stored as: profile.comfortLevel (integer 0-3)

### Screen 2 — Where Have You Ridden?
Multi-select tag cloud. User selects all that apply.
Tags (render as pill buttons, orange when selected):
Silver Lake, Echo Park, Downtown LA, Hollywood, Koreatown, Culver City,
Santa Monica, Venice, Long Beach, Pasadena, The Valley (Burbank/NoHo),
Mostly trails/parks, Other cities outside LA
Stored as: profile.riderAreas (string array)

### Screen 3 — What Scares You Most?
Multi-select. User picks all that apply.
Options:
- Fast cars
- No bike lanes
- Getting doored
- Hills
- Intersections and turns
- Getting lost
- Night riding
Stored as: profile.fears (string array)

### Screen 4 — Guidance Level
Slider with 3 stops:
- 0: "Minimal — alerts only"
- 1: "Balanced"
- 2: "Full guidance — talk me through everything"
Label above slider updates as user drags.
Stored as: profile.verbosity (integer 0-2)

### Screen 5 — Profile Summary
Call Claude API with this prompt:
```
Based on this cyclist profile, write a 2-sentence warm, encouraging rider persona summary 
for a new Bicycle Kitchen member. Be specific to their areas and fears. Avoid generic advice.
Profile: comfortLevel=${profile.comfortLevel}/3, riderAreas=${profile.riderAreas.join(', ')},
fears=${profile.fears.join(', ')}, verbosity=${profile.verbosity}/2
Return only the 2 sentences. No preamble.
```
Display summary in a styled card.
CTA button: "Let's Ride" → navigates to /dashboard
Stored as: profile.summary (string)
Also store: profile.completedAt (ISO date string)

---

## MODULE 2: DASHBOARD (/dashboard)

Top section: Show profile.summary in a card. Orange left border.
Below: "Your Confidence Badges" — row of badge icons, filled for completed quizzes (read from localStorage key `bk_badges`).
Progress bar: `${completedLessons}/5 lessons complete`

Three large navigation cards:
1. **Plan a Ride** → /routes
   Subtitle: "Find your route and preview what you'll see"
2. **Learn & Practice** → /learn
   Subtitle: "Lessons, quizzes, and simulations"
3. **Start Voice Companion** → /ride
   Subtitle: "AI guide for your live ride"

If no profile found in localStorage, redirect to /onboarding.

---

## MODULE 3: ROUTE PLANNER + STREET VIEW PREVIEW (/routes)

### Route Input UI
- Start address: Google Places Autocomplete input (bias to Los Angeles)
- End address: Google Places Autocomplete input (bias to Los Angeles)
- "Find Routes" button

### Map Display
- Render Google Map centered on Los Angeles (34.0522, -118.2437)
- On route fetch, show all 3 route polylines in different colors
- Selected route highlighted in orange

### Route Calculation
Call Google Directions API:
- travelMode: BICYCLING
- provideRouteAlternatives: true
- Request up to 3 routes

### Route Cards
For each route returned, display a card showing:
- Route number (Route 1, Route 2, Route 3)
- Distance (from Directions API legs[0].distance.text)
- Estimated time (from Directions API legs[0].duration.text)
- Difficulty badge: cross-reference route summary text against CORRIDOR_DIFFICULTY keys
  - If any key substring matches route text: use that difficulty + note
  - Default: "intermediate" if no match found
- Difficulty colors: beginner=green, intermediate=yellow, confident=red
- Hazard note (from CORRIDOR_DIFFICULTY match, or generic note)
- "Preview This Ride" button

### Street View Ride Preview (StreetViewPreview component)
When user clicks "Preview This Ride":
- Extract waypoints from route polyline — sample every ~200 meters
- Render Google Street View Panorama in a modal/overlay
- Auto-advance through waypoints like a slideshow at 2.5 seconds per frame
- Show prev/next manual controls
- Overlay on top of panorama:
  - Current street name
  - Upcoming turn instruction (from Directions API steps)
  - Hazard note if current corridor matches CORRIDOR_DIFFICULTY
- Frame it with: "This is what you'll see — ride this route before you leave."

---

## DATA: routeConfig.js

```javascript
export const CORRIDOR_DIFFICULTY = {
  "Sunset Blvd": { difficulty: "confident", note: "No protected lane in most sections. Heavy traffic. Take the lane confidently or use Franklin Ave as an alternative." },
  "Los Feliz Blvd": { difficulty: "intermediate", note: "Sharrows only. Hilly sections. Moderate traffic." },
  "Griffith Park": { difficulty: "beginner", note: "Mostly car-free paths. Flat near the entrance. Great for new riders." },
  "LA River": { difficulty: "beginner", note: "Fully separated bike path. Flat. Safe for all skill levels." },
  "Venice Beach Boardwalk": { difficulty: "beginner", note: "Separated path. Gets crowded on weekends — watch for pedestrians." },
  "Wilshire Blvd": { difficulty: "confident", note: "Bus lane conflicts. Heavy dooring risk near parked cars. Stay out of the door zone." },
  "Broadway": { difficulty: "intermediate", note: "Protected lane but heavy pedestrian crossings near DTLA. Watch intersections." },
  "Figueroa St": { difficulty: "confident", note: "Protected lane exists but adjacent traffic moves fast. Stay in the lane." },
  "Cahuenga Blvd": { difficulty: "intermediate", note: "Narrow and winding through the hills. Take it slow." },
  "Pacific Coast Highway": { difficulty: "confident", note: "High speed traffic. No shoulder in some sections. Experienced riders only." },
  "Ballona Creek": { difficulty: "beginner", note: "Fully separated path through Culver City. One of LA's safest routes." },
  "Rowena Ave": { difficulty: "beginner", note: "Protected lane connects Silver Lake to Griffith Park. Calm side street feel." },
  "8th St": { difficulty: "intermediate", note: "Bike lane runs through Koreatown. Wide but fast-moving traffic." },
  "Main St": { difficulty: "intermediate", note: "Bike lane in Santa Monica. Watch for turning cars at intersections." },
  "César Chávez Ave": { difficulty: "intermediate", note: "Bike lane present. Wide streets in East LA. High visibility is important." },
  "Franklin Ave": { difficulty: "beginner", note: "Calmer alternative to Sunset through Hollywood. Lower traffic." },
  "Clinton St": { difficulty: "beginner", note: "Quiet side street alternative to Sunset in Echo Park." }
}
```

---

## DATA: neighborhoodTips.js

```javascript
export const NEIGHBORHOOD_TIPS = {
  "Silver Lake": "You're in Silver Lake. Rowena Ave has a protected lane to Griffith Park. Sunset has sharrows only — take the lane confidently here.",
  "Echo Park": "Echo Park — Sunset has sharrows in this stretch. Side streets like Clinton or Marathon are calmer east-west alternatives.",
  "Downtown": "Downtown LA — use Broadway's protected lane. Watch for rideshare vehicles blocking the lane near 7th and 8th Street.",
  "Hollywood": "Hollywood — Franklin Ave is calmer than Sunset for east-west travel. High rideshare stop activity, stay alert near hotel zones.",
  "Koreatown": "Koreatown streets are wide but traffic moves fast. 8th Street has a bike lane and connects well east-west.",
  "Venice": "You're near Venice. The beach path is fully separated. Main Street has a lane, but watch for right-turning cars.",
  "Culver City": "Culver City has some of LA's best protected lanes. Ballona Creek path is fully separated from cars.",
  "Los Feliz": "Los Feliz Blvd has sharrows and some hills. Griffith Park entrance nearby is car-free and flat.",
  "Santa Monica": "Santa Monica — Ocean Avenue has a protected lane. Main Street lane is reliable. Watch for tourists on the boardwalk path.",
  "East LA": "Wide streets here. César Chávez has a bike lane. Stay visible — use lights if you have them, even during the day.",
  "Pasadena": "Pasadena has decent bike infrastructure. Colorado Blvd has lanes. Watch for the busy intersection at Lake Ave.",
  "Burbank": "The Valley streets are wide but car-centric. Chandler Blvd has a protected lane that's one of the best in the Valley."
}
```

---

## MODULE 4: VOICE COMPANION (/ride)

This is the flagship feature. Full-screen, mobile-optimized.

### Startup
On page load, read profile from localStorage.
Request geolocation permission.
Initialize SpeechSynthesis.
Initialize SpeechRecognition (continuous: false, language: 'en-US').

### Live Location Tracking (useGeolocation hook)
Use navigator.geolocation.watchPosition with options:
- enableHighAccuracy: true
- maximumAge: 5000
- timeout: 10000
Every 15 seconds, reverse geocode current lat/lng via Google Geocoding API.
Extract: street name (route), neighborhood (sublocality or locality).
Store as: currentStreet, currentNeighborhood in component state.
When neighborhood changes: queue a neighborhood tip (from neighborhoodTips.js).

### Claude System Prompt (constructed dynamically at ride start)
```
You are a cycling safety companion for a new rider currently riding in Los Angeles.
Rider profile: comfort level ${profile.comfortLevel}/3, 
previously ridden in: ${profile.riderAreas.join(', ')},
worried about: ${profile.fears.join(', ')},
verbosity preference: ${profile.verbosity}/2 (0=minimal, 2=full guidance).
Current location: ${currentStreet}, ${currentNeighborhood}, Los Angeles.

Your job is to give concise, specific, safety-first guidance.
When verbosity is 0, speak only for immediate safety alerts.
When verbosity is 1, give tips when asked or when entering a new area.
When verbosity is 2, proactively offer tips and encouragement.

CRITICAL SAFETY RULE: Always announce "Quick tip — ready?" before speaking 
any non-urgent information. Wait for the user to say yes before continuing.
For urgent hazards only, speak immediately without asking permission.

Keep responses under 2 sentences unless the user asks a question.
Be warm, direct, specific to LA. Never condescending.
Reference specific street names and local landmarks when relevant.
```

### PermissionBanner Component
Before any non-urgent tip is spoken:
Render a non-blocking banner at the bottom of the screen with:
- Text: "Got a tip — hear it?"
- [Yes] button (orange, large tap target)
- [Later] button (outlined)
User can also say "yes" or "no" into microphone.
If "Yes": speak the queued tip via TTS.
If "Later": dismiss banner, tip is discarded.
Urgent hazard alerts bypass this banner entirely.

### UI States

**Idle state:**
- Full-screen Google Map with live position marker (orange bicycle icon)
- Current street name displayed in top bar
- Large microphone button at bottom (orange circle, 80px)
- "Tap to ask anything" label below mic
- Verbosity level toggle in top-right corner

**Companion speaking state:**
- Animated waveform (CSS animation, 5 vertical bars)
- Text caption of what is being spoken (large, readable, white on dark)
- "Skip" button to stop TTS

**User asking state:**
- Mic button pulses red (recording)
- Real-time STT transcription shown as user speaks
- On silence: send to Claude API, stream response, speak via TTS

### Supported Voice Commands (handle via Claude API with location context)
- "Where am I?" → responds with current street + neighborhood tip
- "Which way should I go?" → asks for destination, then navigates Directions API, speaks next turn
- "Is there a bike lane here?" → checks CORRIDOR_DIFFICULTY for current street
- "What should I watch out for?" → pulls hazard note from neighborhoodTips or CORRIDOR_DIFFICULTY
- "I'm nervous" → calm, specific reassurance based on current location + profile.fears
- Any other free-form question → passes directly to Claude with full location + profile context

### useClaude hook
```javascript
export async function askClaude(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}
```

### useVoice hook
```javascript
// speak(text) — uses window.speechSynthesis
// startListening(onResult) — uses SpeechRecognition, calls onResult with transcript
// stopListening()
// isSpeaking — boolean state
// isListening — boolean state
```

---

## MODULE 5: LEARN & PRACTICE HUB (/learn)

### Layout
Tabs at top: "Lessons" | "Quizzes" | "Simulate"

### Lessons Tab
5 lesson cards. Each shows title, 3-bullet summary, "Read" button.
Lesson detail view (inline expand or modal): full content + a "Try this route" link that passes a suggested LA route to /routes.

Clicking "Complete Lesson" saves to localStorage `bk_lessons` array and updates dashboard progress.

---

## DATA: lessons.js

```javascript
export const LESSONS = [
  {
    id: 1,
    title: "Reading LA's Bike Infrastructure",
    summary: ["Protected lanes have a physical barrier", "Sharrows mean you share with cars", "No marking means take the full lane"],
    content: "Full lesson text here...",
    practiceRoute: { start: "Bicycle Kitchen, 4429 Fountain Ave, Los Angeles", end: "Griffith Park Observatory" }
  },
  {
    id: 2,
    title: "The Door Zone",
    summary: ["Stay 3 feet from parked cars", "Watch for heads inside parked cars", "Ride closer to the center lane if needed"],
    content: "Full lesson text here...",
    practiceRoute: { start: "Silver Lake", end: "Los Feliz Blvd" }
  },
  {
    id: 3,
    title: "Intersections and Left Turns",
    summary: ["Box turns keep you safe at busy intersections", "Signal early with your arm", "Make eye contact with drivers"],
    content: "Full lesson text here...",
    practiceRoute: { start: "DTLA Broadway", end: "Grand Park" }
  },
  {
    id: 4,
    title: "Riding at Night in LA",
    summary: ["California law requires a white front light", "Red rear reflector is required", "Lit streets are safer than dark shortcuts"],
    content: "Full lesson text here...",
    practiceRoute: { start: "Venice Beach Boardwalk", end: "Santa Monica Pier" }
  },
  {
    id: 5,
    title: "What To Do When Things Go Wrong",
    summary: ["Flat tire: pull over safely, step off, move to sidewalk", "Aggressive driver: do not engage, turn off route", "Getting lost: stop, open maps, reorient"],
    content: "Full lesson text here...",
    practiceRoute: null
  }
]
```

---

## DATA: quizzes.js

5 quizzes, 5 questions each. On completion, save badge to localStorage `bk_badges` array.

```javascript
export const QUIZZES = [
  {
    id: "la-bike-laws",
    title: "LA Bike Laws",
    badge: "Law-Abiding Cyclist",
    questions: [
      {
        question: "In California, who is required to wear a helmet while cycling?",
        options: ["Everyone", "Only riders under 18", "No one — it's optional", "Only on freeways"],
        correct: 1,
        explanation: "California law requires helmets for cyclists under 18. Adults are encouraged but not legally required."
      },
      {
        question: "Can you ride your bike on the sidewalk in Los Angeles?",
        options: ["Yes, always", "No, never", "Depends on the city district", "Only if under 12"],
        correct: 2,
        explanation: "Sidewalk riding rules vary by LA district. In many areas it's technically allowed but discouraged for safety."
      },
      {
        question: "California Vehicle Code 21202 says cyclists must ride:",
        options: ["In the center of the lane", "On the left side of the road", "As far right as practicable", "On the sidewalk when available"],
        correct: 2,
        explanation: "CVC 21202 requires riding as far right as practicable — with exceptions for turning, hazards, or lanes too narrow to share."
      },
      {
        question: "What does a sharrow marking on the road mean?",
        options: ["Bikes only lane", "Shared lane — bikes and cars", "No bikes allowed", "Bike priority zone"],
        correct: 1,
        explanation: "Sharrows (shared lane markings) indicate a shared lane. You have the right to be there, but there's no physical separation from cars."
      },
      {
        question: "At night, California law requires your bike to have:",
        options: ["Reflectors only", "A white front light visible from 300 feet", "A bell", "Nothing — lights are optional"],
        correct: 1,
        explanation: "California law requires a white front light visible from 300 feet at night, plus a rear red reflector."
      }
    ]
  },
  {
    id: "hazard-recognition",
    title: "Hazard Recognition",
    badge: "Street Smart",
    questions: [
      {
        question: "You're riding in a bike lane and a car door suddenly opens 10 feet ahead. What's your first move?",
        options: ["Brake hard and swerve left", "Brake hard and swerve right toward the curb", "Speed up to get past it", "Ring your bell"],
        correct: 0,
        explanation: "Swerve left into the traffic lane while braking. Swerving right puts you into the door itself or the curb."
      },
      {
        question: "You're approaching a green light intersection. What's the biggest hazard?",
        options: ["Potholes", "Cars turning right or left through your path", "Other cyclists", "The crosswalk signal"],
        correct: 1,
        explanation: "Turning cars are the #1 cause of urban cycling accidents at intersections. Make eye contact and slow down even on green."
      },
      {
        question: "You're riding and notice a car has been pacing you slowly for a block. What do you do?",
        options: ["Speed up to get away", "Turn onto a side street at the next opportunity", "Stop and confront the driver", "Ignore it"],
        correct: 1,
        explanation: "Turn onto a side street. Change your route. Do not engage, and if it continues, stop somewhere public and call for help."
      },
      {
        question: "What is the 'door zone'?",
        options: ["A protected bike lane", "The 3-4 foot space next to parked cars where doors open", "A crosswalk signal zone", "An intersection with multiple lanes"],
        correct: 1,
        explanation: "The door zone is the 3-4 feet next to parked cars. Riding here risks being hit by an opening door. Stay outside it."
      },
      {
        question: "You're riding at night and your front light dies. What's the safest move?",
        options: ["Continue riding carefully", "Ride on the sidewalk instead", "Stop in a lit area, call someone or walk your bike", "Use your phone flashlight taped to handlebars"],
        correct: 2,
        explanation: "Without a front light you're invisible to drivers at night. Stop in a lit area and arrange a safer way home."
      }
    ]
  },
  {
    id: "neighborhood-knowledge",
    title: "LA Neighborhood Knowledge",
    badge: "Local Rider",
    questions: [
      {
        question: "You're on Sunset Blvd in Hollywood and there's no bike lane. What do you do?",
        options: ["Ride on the sidewalk", "Take the full lane in traffic", "Turn around and find a different route", "Ride on the painted shoulder"],
        correct: 1,
        explanation: "With no bike lane, you take the full lane. You have the legal right. Franklin Ave nearby is a calmer alternative."
      },
      {
        question: "Which LA route is best for an absolute beginner who has never ridden in traffic?",
        options: ["Wilshire Blvd", "Pacific Coast Highway", "LA River Bike Path", "Cahuenga Blvd"],
        correct: 2,
        explanation: "The LA River Bike Path is fully separated from car traffic, flat, and runs for miles. Perfect for beginners."
      },
      {
        question: "You're riding in DTLA on Broadway and a rideshare car is stopped in the bike lane. What do you do?",
        options: ["Wait behind it", "Honk and yell", "Check over your left shoulder, merge into traffic briefly, pass, return to lane", "Ride on the sidewalk"],
        correct: 2,
        explanation: "Check mirrors/shoulder, signal, merge briefly to pass, then return to the bike lane. Standard lane change procedure."
      },
      {
        question: "What makes Culver City a good city for newer cyclists?",
        options: ["Flat terrain only", "It has some of the best protected bike lane infrastructure in LA", "No cars allowed downtown", "Very low population"],
        correct: 1,
        explanation: "Culver City invested heavily in protected cycling infrastructure. Ballona Creek path is fully separated from traffic."
      },
      {
        question: "You want to ride east-west through Echo Park but Sunset feels intimidating. What's the best alternative?",
        options: ["Just take Sunset — no alternatives exist", "Clinton Street or Marathon Street", "The 101 freeway shoulder", "Walk your bike on the sidewalk"],
        correct: 1,
        explanation: "Clinton and Marathon are quiet residential streets running parallel to Sunset. Calmer traffic, similar route."
      }
    ]
  },
  {
    id: "night-riding",
    title: "Night Riding Safety",
    badge: "Night Owl",
    questions: [
      {
        question: "California law requires a rear reflector to be visible from how far away at night?",
        options: ["100 feet", "300 feet", "500 feet", "Reflectors are optional"],
        correct: 2,
        explanation: "California requires a red rear reflector visible from 500 feet, and a white front light visible from 300 feet."
      },
      {
        question: "Which is safer for night riding in LA?",
        options: ["Unlit residential shortcuts", "Well-lit commercial streets with traffic", "Freeway shoulders", "Parks and trails"],
        correct: 1,
        explanation: "Well-lit streets with traffic are safer at night — you're visible to drivers and there are more people around."
      },
      {
        question: "What's the best clothing choice for night riding?",
        options: ["Dark colors to be less visible", "Whatever you normally wear", "Bright or reflective clothing on your upper body", "Nothing matters since you have lights"],
        correct: 2,
        explanation: "Reflective gear on your upper body makes you visible from all angles, not just front and rear."
      },
      {
        question: "Your rear light battery is dying mid-ride at night. What do you do?",
        options: ["Keep going — one light is fine", "Ride on the sidewalk for safety", "Stop, check your route, choose the most lit streets and inform someone of your location", "Speed up to get home faster"],
        correct: 2,
        explanation: "Without rear visibility you're at serious risk. Choose lit streets, slow down, and let someone know where you are."
      },
      {
        question: "At night in LA, which is the most dangerous riding condition?",
        options: ["Rain", "Riding without a rear light on a dark street with parked cars", "Full moon", "Wind"],
        correct: 1,
        explanation: "Riding without a rear light in low-visibility conditions is the highest risk scenario. Drivers cannot see you from behind."
      }
    ]
  },
  {
    id: "emergency-situations",
    title: "Emergency Situations",
    badge: "Crisis Calm",
    questions: [
      {
        question: "A car door opens directly in front of you and you have one second. What do you do?",
        options: ["Brake as hard as possible and go straight", "Brake and swerve left into the lane", "Swerve right toward the curb", "Jump off the bike"],
        correct: 1,
        explanation: "Hard brake + swerve left. Swerving right hits the door. Going straight hits it too. Left into the lane is your safest path if traffic is clear."
      },
      {
        question: "A dog starts chasing you. What's the best strategy?",
        options: ["Stop and try to pet it", "Sprint and outrun it", "Slow down and let it lose interest, or dismount and put your bike between you and the dog", "Yell loudly"],
        correct: 2,
        explanation: "Dogs chase movement. Slowing down often ends the chase. If it doesn't stop, dismount and use your bike as a barrier."
      },
      {
        question: "You get a flat tire mid-ride on a busy street. First thing you do?",
        options: ["Keep riding slowly to your destination", "Stop immediately where you are", "Signal, move to the rightmost lane, then pull off to the sidewalk or parking lane", "Call someone while continuing to ride"],
        correct: 2,
        explanation: "Signal and move safely to the right before stopping. Don't stop suddenly in traffic. Get fully off the road before assessing the flat."
      },
      {
        question: "An aggressive driver follows you after a conflict on the road. What do you do?",
        options: ["Confront them to resolve it", "Speed up and race them", "Turn into a busy public area, a store, or a populated space — do not go home", "Pull over and wait"],
        correct: 2,
        explanation: "Never lead an aggressive driver to your home. Turn into a busy public space, go inside, and call for help if needed."
      },
      {
        question: "You're riding and suddenly feel dizzy or unwell. What's the correct response?",
        options: ["Try to make it home", "Speed up to get off the road faster", "Stop immediately, move to a safe spot, sit down, call someone", "Keep riding but more slowly"],
        correct: 2,
        explanation: "Stop immediately. Riding while impaired is dangerous for you and others. Sit down, hydrate, and call someone before making any decisions."
      }
    ]
  }
]
```

---

## DATA: simulationScenarios.js

```javascript
export const SIMULATION_SCENARIOS = {
  "Silver Lake / Echo Park": [
    {
      id: 1,
      situation: "You're riding east on Sunset Blvd in Silver Lake. There's no protected bike lane — just sharrows. A large truck is close behind you. What do you do?",
      choices: [
        { label: "A", text: "Hug the curb tightly to give the truck space", correct: false },
        { label: "B", text: "Move to the center of the lane — take the full lane so the truck can't squeeze past unsafely", correct: true },
        { label: "C", text: "Speed up as fast as you can", correct: false }
      ],
      explanation: "On a sharrow, you have the right to take the full lane. Hugging the curb invites dangerous close passing."
    },
    {
      id: 2,
      situation: "You're approaching the Sunset/Alvarado intersection. A driver waves you through a 4-way stop — it's your turn anyway. What do you do?",
      choices: [
        { label: "A", text: "Wave back and ride through quickly", correct: false },
        { label: "B", text: "Make eye contact, nod, but proceed slowly and watch all other directions", correct: true },
        { label: "C", text: "Wait for all cars to go first", correct: false }
      ],
      explanation: "Always verify all directions even when waved through. Other drivers may not have seen the same signal."
    },
    {
      id: 3,
      situation: "It's getting dark. You realize your front light battery is dead. You're 3 miles from home on Sunset.",
      choices: [
        { label: "A", text: "Keep riding — you can see fine", correct: false },
        { label: "B", text: "Ride on the sidewalk the rest of the way", correct: false },
        { label: "C", text: "Stop at the next lit business, assess your options — can you charge it, get a ride, or walk a safer stretch?", correct: true }
      ],
      explanation: "Without a front light at night you are invisible to drivers. Never ride without lights after dark."
    },
    {
      id: 4,
      situation: "A parked car on Clinton Street has its windows fogged up — someone is inside. You're in the door zone. What do you do?",
      choices: [
        { label: "A", text: "Speed past before the door can open", correct: false },
        { label: "B", text: "Move 3-4 feet left of the car as you pass, out of door range", correct: true },
        { label: "C", text: "Honk your bell to alert them", correct: false }
      ],
      explanation: "The door zone is 3-4 feet. Always move out of it when passing occupied parked cars, regardless of speed."
    }
  ],
  "Downtown LA": [
    {
      id: 1,
      situation: "You're on Broadway's protected bike lane heading south. A food delivery scooter is stopped blocking the lane ahead. Traffic is heavy to your left.",
      choices: [
        { label: "A", text: "Stop and wait for them to move", correct: false },
        { label: "B", text: "Check your left shoulder, signal, briefly merge into traffic to pass, then return to the lane", correct: true },
        { label: "C", text: "Ride up onto the sidewalk to go around", correct: false }
      ],
      explanation: "Standard lane-change procedure. Check, signal, merge, pass, return. Sidewalk riding in DTLA is dangerous for pedestrians."
    },
    {
      id: 2,
      situation: "At 7th and Figueroa there are 4 lanes of fast traffic and you need to turn left. What do you do?",
      choices: [
        { label: "A", text: "Signal and merge across all 4 lanes quickly", correct: false },
        { label: "B", text: "Do a box turn: ride through the intersection, stop on the far side, wait for the light, then cross", correct: true },
        { label: "C", text: "Use the crosswalk as a pedestrian", correct: false }
      ],
      explanation: "A box turn (also called a two-stage left turn) is the safest way to turn left at a busy urban intersection."
    },
    {
      id: 3,
      situation: "A rideshare driver stops suddenly in the bike lane right in front of you to pick up a passenger.",
      choices: [
        { label: "A", text: "Brake hard and yell at them", correct: false },
        { label: "B", text: "Swerve onto the sidewalk", correct: false },
        { label: "C", text: "Brake, check left, signal, merge into traffic to pass, return to lane — standard obstacle pass", correct: true }
      ],
      explanation: "Rideshare stops in bike lanes are extremely common in DTLA. Treat it like any obstacle: check, signal, pass, return."
    }
  ],
  "Venice / Santa Monica": [
    {
      id: 1,
      situation: "You're on the Venice Boardwalk path and a large group of tourists spreads across the entire path in front of you.",
      choices: [
        { label: "A", text: "Ring bell repeatedly and ride through", correct: false },
        { label: "B", text: "Slow to walking pace, call out 'on your left' calmly, and wait for a gap", correct: true },
        { label: "C", text: "Ride on the sand to pass them", correct: false }
      ],
      explanation: "The boardwalk is a shared space. Slow down, communicate calmly, and pass when safe. Aggressive bell-ringing creates conflict."
    },
    {
      id: 2,
      situation: "You're riding on Main Street Santa Monica and a car turns right directly in front of you without signaling.",
      choices: [
        { label: "A", text: "Brake hard and swerve", correct: false },
        { label: "B", text: "You should have anticipated this — look for wheel movement and head turns at every intersection", correct: true },
        { label: "C", text: "Yell and proceed — you had the right of way", correct: false }
      ],
      explanation: "Right-hook turns are the most common cycling accident. Always watch wheels and driver head position at intersections, not just signals."
    }
  ]
}
```

---

## MODULE 5: SIMULATION QUIZ (/learn/simulation)

UI flow:
1. User picks a neighborhood from available options (Silver Lake/Echo Park, Downtown LA, Venice/Santa Monica)
2. Scenario cards display one at a time — situation text + 3 choice buttons (A, B, C)
3. On selection: immediately show correct/incorrect, then call Claude API for personalized 1-sentence explanation
4. After all scenarios: show "Ride Readiness Score" for that neighborhood (X/total correct)
5. Show badge if score ≥ 75%
6. Save badge to localStorage `bk_badges`

Claude API call for personalized explanation:
```
The cyclist just answered a scenario question. 
Their profile: comfortLevel=${profile.comfortLevel}/3, fears=${profile.fears.join(', ')}.
They chose: "${selectedChoice.text}" — which was ${selectedChoice.correct ? 'correct' : 'incorrect'}.
The correct answer is: "${correctChoice.text}"
In exactly one sentence, give them a specific, encouraging tip that connects to their stated fears or comfort level.
Return only the sentence. No preamble.
```

---

## BUILD ORDER FOR TONIGHT

Execute in this order. Each step is independently testable.

**Step 1 — Scaffold (20 min)**
- Vite + React + Tailwind + React Router
- Install: lucide-react
- Set up routes: /, /onboarding, /dashboard, /routes, /ride, /learn, /learn/simulation
- App.jsx with routes, redirect / to /onboarding if no profile, else /dashboard
- Add Google Fonts: Bebas Neue + DM Sans to index.html
- Set global CSS variables in index.css

**Step 2 — Hooks (30 min)**
- useProfile.js: getProfile(), saveProfile(), clearProfile() using localStorage key bk_profile
- useClaude.js: async askClaude(systemPrompt, userMessage) hitting /v1/messages
- useVoice.js: speak(text), startListening(onResult), isSpeaking, isListening
- useGeolocation.js: watchPosition wrapper returning { lat, lng, error }, cleanup on unmount

**Step 3 — Data files (20 min)**
- Create all 5 data files: routeConfig.js, neighborhoodTips.js, lessons.js, quizzes.js, simulationScenarios.js
- Copy content exactly from DATA sections of this document

**Step 4 — Onboarding (45 min)**
- 5-screen flow with back/next navigation
- Progress indicator (dots or bar)
- Screen 5 calls Claude API to generate summary
- On complete: saveProfile(), navigate to /dashboard

**Step 5 — Dashboard (20 min)**
- Read profile from localStorage
- Display profile.summary
- 3 nav cards
- Progress bar for lessons
- Confidence badges row

**Step 6 — Route Planner + Street View (60 min)**
- Google Maps embed
- Places autocomplete on 2 inputs
- Directions API call on form submit
- Render 3 RouteCard components
- Difficulty tagging from routeConfig.js
- StreetViewPreview component: extract polyline waypoints, slideshow via StreetViewPanorama

**Step 7 — Learn Hub (45 min)**
- Tabs: Lessons | Quizzes | Simulate
- LessonCard components from lessons.js data
- QuizCard component for quiz flow
- Results + badge saving
- Link to /learn/simulation

**Step 8 — Simulation Quiz (30 min)**
- Neighborhood selector
- Scenario card sequence
- Claude API for personalized explanations
- Score summary + badge

**Step 9 — Voice Companion (60 min)**
- Full-screen map with live position
- PermissionBanner component
- useGeolocation hook feeding reverse geocode
- Dynamic Claude system prompt construction
- Mic button → SpeechRecognition → Claude API → SpeechSynthesis
- Neighborhood change detection → queue tip → show PermissionBanner
- TTS caption overlay

**Step 10 — Polish (30 min)**
- Apply design system: orange/black/cream palette, Bebas Neue headings
- Responsive mobile layout
- Loading states for API calls
- Error states for geolocation/API failures
- Add Bicycle Kitchen logo/name to header

---

## KEY IMPLEMENTATION NOTES

1. **No backend required.** All API calls go direct from browser. Anthropic API key is in Vite env vars. This is fine for a hackathon demo.

2. **Google Maps loader.** Use @googlemaps/js-api-loader package. Load once in App.jsx and pass the google object down via context or window.google.

3. **Street View waypoint sampling.** The Directions API returns an overview_polyline. Decode it using the @googlemaps/polyline-codec package. Sample every 200m by distance.

4. **SpeechRecognition browser support.** Use `window.SpeechRecognition || window.webkitSpeechRecognition`. Works in Chrome, Edge, Safari (webkit prefix). Warn users on Firefox.

5. **Voice companion safety.** The PermissionBanner is the core safety differentiator. Non-urgent tips MUST go through the banner. Only immediate hazard alerts (from Claude responses that start with "URGENT:") should bypass it.

6. **localStorage keys used:**
   - `bk_profile` — full profile object
   - `bk_badges` — array of earned badge IDs
   - `bk_lessons` — array of completed lesson IDs

7. **Handling Claude API in browser.** Anthropic API doesn't have CORS restrictions for browser calls. No proxy needed. Set the API key in .env as VITE_ANTHROPIC_API_KEY and read it as import.meta.env.VITE_ANTHROPIC_API_KEY.

8. **Mobile geolocation.** On iOS Safari, geolocation only works on HTTPS. For local dev use vite --host and test on device over your local network, or use ngrok for a quick HTTPS tunnel.

---

## DEMO SCRIPT (for hackathon presentation)

1. Open app on mobile — land on Onboarding
2. Fill out 5 screens as a "nervous new rider from Silver Lake, scared of fast cars and getting doored"
3. See personalized AI summary generated
4. Go to Dashboard — show the 3 modules
5. Go to Route Planner — enter "Bicycle Kitchen, 4429 Fountain Ave" to "Griffith Park"
6. Show 3 route options with difficulty badges
7. Select the beginner route — click "Preview This Ride" — show Street View slideshow
8. Go to Learn — complete the Hazard Recognition quiz
9. Go to Simulation — pick Silver Lake, work through 2 scenarios
10. Go to Ride — show the live companion UI, demonstrate asking "Is there a bike lane here?" and "I'm nervous"
11. Show the PermissionBanner appearing before a non-urgent neighborhood tip

---

END OF PRD
