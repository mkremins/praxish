/// Practice definitions

const greetPractice = {
  id: "greet",
  name: "People can greet one another",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Greet [Other]",
      conditions: [
        "char.Other",
        "neq Actor Other",
        "not practice.greet.World.alreadyGreeted.Actor.Other"
      ],
      outcomes: [
        "insert practice.greet.World.alreadyGreeted.Actor.Other",
      ],
      influences: [{
        name: "Greetings should be reciprocated",
        conditions: ["practice.greet.World.alreadyGreeted.Other.Actor"],
        priority: "required",
      },
      {
        name: "[Actor] is friends with [Other]",
        conditions: ["char.Actor.friends.Other"],
        score: 5,
      },
      {
        name: "[Actor] is gregarious and hasn't yet met [Other]",
        conditions: [
          "char.Actor.tag.gregarious",
          "not char.Actor.friends.Other"
        ],
        score: 2,
      }],
    }
  ]
};

const yapPractice = {
  id: "yap",
  name: "People can yap about various topics",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Yap about [Topic]",
      conditions: ["char.Actor", "topic.Topic"],
      outcomes: [
        "insert practice.yap.World.lastTopic!Topic",
      ],
      influences: [{
        name: "We're already talking about [Topic]",
        conditions: ["practice.yap.World.lastTopic.Topic"],
        score: 2,
      },
      {
        name: "[Topic] is related to [OldTopic]",
        conditions: [
          "practice.yap.World.lastTopic.OldTopic",
          "topic.OldTopic.connected.Topic"
        ],
        score: 2,
      }],
    }
  ],
  volitions: [{
    name: "[Actor] is interested in [Topic]",
    conditions: [
      "char.Actor.interest.Topic",
      "practice.yap.World.lastTopic.Topic"
    ],
    score: 1,
  },
  {
    name: "[Actor]'s friend [Friend] is interested in [Topic]",
    conditions: [
      "char.Actor.friends.Friend",
      "char.Friend.interest.Topic",
      "practice.yap.World.lastTopic.Topic"
    ],
    score: 0.5,
  }]
};

/// Domain initialization

// set up initial praxish state and practice definitions
const appPraxishState = Praxish.createPraxishState();
Praxish.definePractice(appPraxishState, greetPractice);
Praxish.definePractice(appPraxishState, yapPractice);

// set up characters
const appDomainChars = [
  // flirty arrogant rake, downwardly mobile old money dad, wants to restore fortune
  {name: "vandersley"},
  // nerdy tinkerer, new money heiress (inventor dad), curious about the world
  {name: "lillislue"},
  // worrywart, old friends with vandersley, uni friends with lillis
  {name: "framingham"},
  // quiet but talented middle-class striver, recently friendly with lillis, wants to impress
  {name: "weatherford", isPlayer: true},
  // vandersley's ex. he doesn't wanna talk about it
  {name: "easelwood"}
];
for (const char of appDomainChars) {
  Praxish.performOutcome(appPraxishState, `insert char.${char.name}`);
}

// set up conversation topics
const topicPairs = [
  ["royalFamily", "king"],
  ["royalFamily", "queen"],
  ["royalFamily", "princess"],
  ["princess", "importanceOfMarriage"],
  ["importanceOfMarriage", "faith"],
  ["royalFamily", "prince"],
  ["prince", "royalScandal"],
  ["royalFamily", "royalScandal"],
  ["royalScandal", "politicalUnrest"],
  ["politicalUnrest", "merchantCollusion"],
  ["politicalUnrest", "controversialInventions"],
  ["controversialInventions", "warMachines"],
  ["controversialInventions", "medicalScience"],
  ["medicalScience", "ailingKing"],
  ["ailingKing", "royalScandal"],
  ["medicalScience", "marvelsOfTechnology"],
  ["medicalScience", "continentalPlague"],
  ["continentalPlague", "continentalWar"],
  ["continentalWar", "warMachines"],
  ["continentalWar", "politicalUnrest"],
  ["marvelsOfTechnology", "lillisluesWork"],
];
for (const [t1, t2] of topicPairs) {
  Praxish.performOutcome(appPraxishState, `insert topic.${t1}.connected.${t2}`);
  Praxish.performOutcome(appPraxishState, `insert topic.${t2}.connected.${t1}`);
}

// set up character interests
const interestSentences = [
  // vandersley
  "char.vandersley.interest.royalScandal",
  "char.vandersley.interest.politicalUnrest",
  "char.vandersley.interest.controversialInventions",
  "char.vandersley.interest.merchantCollusion",
  "char.vandersley.interest.gambling",
  // lillislue
  "char.lillislue.interest.marvelsOfTechnology",
  "char.lillislue.interest.controversialInventions",
  "char.lillislue.interest.medicalScience",
  "char.lillislue.interest.warMachines",
  "char.lillislue.interest.lillisluesWork",
  // framingham
  "char.framingham.interest.royalFamily",
  "char.framingham.interest.importanceOfMarriage",
  "char.framingham.interest.faith",
  "char.framingham.interest.continentalPlague",
  "char.framingham.interest.continentalWar",
  "char.framingham.interest.politicalUnrest",
  "char.framingham.interest.merchantCollusion",
  // weatherford
  "char.weatherford.interest.controversialInventions",
  "char.weatherford.interest.medicalScience",
  "char.weatherford.interest.lillisluesWork",
  "char.weatherford.interest.continentalPlague",
  "char.weatherford.interest.continentalWar",
  "char.weatherford.interest.politicalUnrest",
  "char.weatherford.interest.merchantCollusion",
  // easelwood
  "char.easelwood.interest.royalFamily",
  "char.easelwood.interest.king",
  "char.easelwood.interest.ailingKing",
  "char.easelwood.interest.queen",
  "char.easelwood.interest.princess",
  "char.easelwood.interest.importanceOfMarriage",
  "char.easelwood.interest.prince",
];
for (const sentence of interestSentences) {
  Praxish.performOutcome(appPraxishState, `insert ${sentence}`);
}

// set up character relationships
const relationshipSentences = [
  // vandersley
  "char.vandersley.friends.framingham",
  "char.vandersley.friends.lillislue",
  // lillislue
  "char.lillislue.friends.vandersley",
  "char.lillislue.friends.framingham",
  "char.lillislue.friends.weatherford",
  // framingham
  "char.framingham.friends.vandersley",
  "char.framingham.friends.lillislue",
  "char.framingham.friends.easelwood",
  // weatherford
  "char.weatherford.friends.lillislue",
  // easelwood
  "char.easelwood.friends.framingham",
];
for (const sentence of relationshipSentences) {
  Praxish.performOutcome(appPraxishState, `insert ${sentence}`);
}

// set up initial practice instances
const initSentences = [
  "practice.greet.world",
  "practice.yap.world",
];
for (const sentence of initSentences) {
  Praxish.performOutcome(appPraxishState, `insert ${sentence}`);
}
