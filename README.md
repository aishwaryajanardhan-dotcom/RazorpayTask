# MakeMyTrip · AI Trip Planner — interactive prototype

This is a working web prototype of the AI Trip Planner designs in the Figma file
(pages **MakeMyTrip Recreation** and **AI Trip Planner**). It uses only HTML, CSS and vanilla
JavaScript, so there's no build step, no Node.js and no external APIs.

## Run it
Open `index.html` in Chrome, Edge, Firefox or Safari. It works straight from the file system.
Fonts (Lato), icons and images are all bundled in `assets/`, so it also works offline.

## Files
| Path | What it is |
|---|---|
| `index.html` | App shell |
| `style.css` | Visual tokens and components that mirror the Figma library (desktop reference: 1440 px) |
| `script.js` | Data model, itinerary engine, simulated AI agent, screens and interactions |
| `assets/icons.js` | Icon path data (same paths as the Figma `AI Icon/*` and `Icon/*` components) |
| `assets/icons/*.svg` | The same icons as standalone SVG files |
| `assets/img/` | Hero mountains, airline tail art, flag, destination illustrations, favicon |
| `assets/fonts/` | Lato 400/400 italic/700/900 (SIL Open Font License) |

## The journey (Figma frame → screen)
1. **01 Homepage**: The recreated MakeMyTrip homepage, with an AI entry card and a "Plan a trip with AI" pill.
2. **02 Conversational discovery**: The AI parses your intent (dates, budget, solo, vibe, mobility) and asks only for what's missing. It then offers optional comfort questions and summarises a trip brief, which you can edit by chat or with the pencil icons.
3. **02b Loading**: Shows the agent's progress and moves on automatically.
4. **03 Destinations**: Three destinations, each with evidence, an expandable "Why this destination?" and source labels. You can sort them and compare them side by side. Typed questions get answers, including uncertainty and policy-safe replies about safety.
5. **04 Itinerary**: The trip is built from your choices. Late arrivals, long transfers and late returns are flagged, and the AI's reasoning is shown. Day tabs, alternatives and a live budget meter are included.
6. **05 Review & modify**: Swap the stay, an activity, the train or the dates, by chat or with controls. You see an impact preview (cost, travel time, return time, flags) before you apply, plus a list of what stays unchanged. Undo is available.
7. **06 Readiness & final review**: A checklist built from the actual plan (done, pending or suggested), with progress tracking, a trip summary and an approval step.

## Things to try in the chat
- Screen 2: paste the example request, or try "budget 12000", "next weekend" or "leave Saturday morning".
- Screen 3: "Which has the shortest trip from the station?", "Is Rishikesh safe?", "What about Dharamkot at night?"
- Screens 4–5: "I don't want to travel back late at night", "Make it cheaper", "Move to 27–29 Nov", "Add Kunjapuri sunrise", "Switch me to Ganga View in Tapovan", "undo".

## Edge cases
Use the **Prototype controls** button (bottom right) to jump to any screen or trigger:
- no plan within budget
- the chosen stay is sold out
- dates changed after planning
- no reliable neighbourhood info
- an activity with an inconvenient return
- a stay swap that affects the rest of the trip
- a live-price error with retry
- a full reset

## Data and transparency
All travel data (fares, schedules, stays, review counts, distances) is **simulated** and labelled
that way in the UI. The planner never calls a place or property "safe" or "unsafe". It shows the
evidence, where it came from, and where information is missing. The real details are the emergency
numbers (112, 1091) and hospital names, which are marked "verify locally".

Your selections are saved in the browser's localStorage, so they survive navigation and reloads.
Use **Reset prototype** to start over.
