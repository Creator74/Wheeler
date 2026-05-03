# Wheeler

**Your sous-chef that takes you from the kitchen to the streets.**

Wheeler is an AI-powered cycling companion for Los Angeles riders. It helps you plan routes, practice skills, and ride with confidence — with a voice assistant that talks you through every turn.

## What it does

- **Route planning** — Enter a start and destination, get bike-friendly route options with turn-by-turn previews and stop suggestions along the way
- **Voice companion** — An always-on AI mentor (Jamie) who greets you at the start of your ride, gives proactive tips as you move through neighborhoods, and responds naturally to anything you say
- **Ride simulation** — Practice a route before you ride it with AI-generated LA scenarios tailored to your comfort level and nerves
- **Learn & practice** — Lessons, quizzes, and scenario drills covering LA bike laws, hazard recognition, and urban cycling skills
- **Ride history** — Tracks your completed routes, places visited, and weekly mileage on your dashboard

## Tech stack

- React + Vite
- Tailwind CSS
- Google Maps JavaScript API (Directions, Places, Geometry)
- Claude API (Anthropic) — route context, voice responses, simulations, profile generation
- Web Speech API — always-on voice recognition and text-to-speech

## Getting started

```bash
npm install
```

Create a `.env` file in the root:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_ANTHROPIC_API_KEY=your_claude_api_key
```

```bash
npm run dev
```

## Notes

- Location access required for live navigation
- Voice features work best on Chrome (desktop or Android) and Safari (iOS)
- Google Maps API needs the **Maps JavaScript API**, **Directions API**, **Places API**, and **Geometry library** enabled
