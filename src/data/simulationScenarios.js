export const SIMULATION_SCENARIOS = {
  "Silver Lake / Echo Park": [
    {
      id: 1,
      situation: "You're riding east on Sunset Blvd in Silver Lake. There's no protected bike lane — just sharrows. A large truck is close behind you. What do you do?",
      choices: [
        { label: "A", text: "Hug the curb tightly to give the truck space", correct: false },
        { label: "B", text: "Move to the center of the lane — take the full lane so the truck can't squeeze past unsafely", correct: true },
        { label: "C", text: "Speed up as fast as you can", correct: false },
      ],
      explanation: "On a sharrow, you have the right to take the full lane. Hugging the curb invites dangerous close passing.",
    },
    {
      id: 2,
      situation: "You're approaching the Sunset/Alvarado intersection. A driver waves you through a 4-way stop — it's your turn anyway. What do you do?",
      choices: [
        { label: "A", text: "Wave back and ride through quickly", correct: false },
        { label: "B", text: "Make eye contact, nod, but proceed slowly and watch all other directions", correct: true },
        { label: "C", text: "Wait for all cars to go first", correct: false },
      ],
      explanation: "Always verify all directions even when waved through. Other drivers may not have seen the same signal.",
    },
    {
      id: 3,
      situation: "It's getting dark. You realize your front light battery is dead. You're 3 miles from home on Sunset.",
      choices: [
        { label: "A", text: "Keep riding — you can see fine", correct: false },
        { label: "B", text: "Ride on the sidewalk the rest of the way", correct: false },
        { label: "C", text: "Stop at the next lit business, assess your options — can you charge it, get a ride, or walk a safer stretch?", correct: true },
      ],
      explanation: "Without a front light at night you are invisible to drivers. Never ride without lights after dark.",
    },
    {
      id: 4,
      situation: "A parked car on Clinton Street has its windows fogged up — someone is inside. You're in the door zone. What do you do?",
      choices: [
        { label: "A", text: "Speed past before the door can open", correct: false },
        { label: "B", text: "Move 3-4 feet left of the car as you pass, out of door range", correct: true },
        { label: "C", text: "Honk your bell to alert them", correct: false },
      ],
      explanation: "The door zone is 3-4 feet. Always move out of it when passing occupied parked cars, regardless of speed.",
    },
  ],
  "Downtown LA": [
    {
      id: 1,
      situation: "You're on Broadway's protected bike lane heading south. A food delivery scooter is stopped blocking the lane ahead. Traffic is heavy to your left.",
      choices: [
        { label: "A", text: "Stop and wait for them to move", correct: false },
        { label: "B", text: "Check your left shoulder, signal, briefly merge into traffic to pass, then return to the lane", correct: true },
        { label: "C", text: "Ride up onto the sidewalk to go around", correct: false },
      ],
      explanation: "Standard lane-change procedure. Check, signal, merge, pass, return. Sidewalk riding in DTLA is dangerous for pedestrians.",
    },
    {
      id: 2,
      situation: "At 7th and Figueroa there are 4 lanes of fast traffic and you need to turn left. What do you do?",
      choices: [
        { label: "A", text: "Signal and merge across all 4 lanes quickly", correct: false },
        { label: "B", text: "Do a box turn: ride through the intersection, stop on the far side, wait for the light, then cross", correct: true },
        { label: "C", text: "Use the crosswalk as a pedestrian", correct: false },
      ],
      explanation: "A box turn (also called a two-stage left turn) is the safest way to turn left at a busy urban intersection.",
    },
    {
      id: 3,
      situation: "A rideshare driver stops suddenly in the bike lane right in front of you to pick up a passenger.",
      choices: [
        { label: "A", text: "Brake hard and yell at them", correct: false },
        { label: "B", text: "Swerve onto the sidewalk", correct: false },
        { label: "C", text: "Brake, check left, signal, merge into traffic to pass, return to lane — standard obstacle pass", correct: true },
      ],
      explanation: "Rideshare stops in bike lanes are extremely common in DTLA. Treat it like any obstacle: check, signal, pass, return.",
    },
  ],
  "Venice / Santa Monica": [
    {
      id: 1,
      situation: "You're on the Venice Boardwalk path and a large group of tourists spreads across the entire path in front of you.",
      choices: [
        { label: "A", text: "Ring bell repeatedly and ride through", correct: false },
        { label: "B", text: "Slow to walking pace, call out 'on your left' calmly, and wait for a gap", correct: true },
        { label: "C", text: "Ride on the sand to pass them", correct: false },
      ],
      explanation: "The boardwalk is a shared space. Slow down, communicate calmly, and pass when safe. Aggressive bell-ringing creates conflict.",
    },
    {
      id: 2,
      situation: "You're riding on Main Street Santa Monica and a car turns right directly in front of you without signaling.",
      choices: [
        { label: "A", text: "Brake hard and swerve", correct: false },
        { label: "B", text: "You should have anticipated this — look for wheel movement and head turns at every intersection", correct: true },
        { label: "C", text: "Yell and proceed — you had the right of way", correct: false },
      ],
      explanation: "Right-hook turns are the most common cycling accident. Always watch wheels and driver head position at intersections, not just signals.",
    },
  ],
}
