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
