/// Define UI

const e = React.createElement;

const appState = {
  chars: [
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
  ],
  actorIdx: -1,
  turns: [],
};

let root = null;
function renderUI() {
  if (!root) {
    root = ReactDOM.createRoot(document.getElementById("app"));
  }
  root.render(e(App, appState));
}

function CharactersPanel(props) {
  return e("div", {id: "chars-panel"},
    e("h2", {}, "Characters"),
    e("p", {className: "explainer"},
      ["Checked characters are player characters. ",
       "On a player character's turn, simulation will pause ",
       "until the player selects an action for the character to perform."],
    ),
    e("div", {id: "chars-checkboxes"},
      props.chars.map((char, idx) => {
        return e("div", {className: "char-checkbox"},
          e("input", {
            type: "checkbox",
            checked: char.isPlayer,
            onChange: ev => {
              appState.chars[idx].isPlayer = ev.target.checked;
              renderUI();
            }
          }),
          e("span", {
            onClick: () => {
              const currentState = appState.chars[idx].isPlayer;
              appState.chars[idx].isPlayer = !currentState;
              renderUI();
            }
          }, char.name)
        );
      })
    ),
    e("button", {
      onClick: () => {
        appState.chars.forEach(char => { char.isPlayer = true; });
        renderUI();
      }
    }, "Mark all as players"),
    e("button", {
      onClick: () => {
        appState.chars.forEach(char => { char.isPlayer = false; });
        renderUI();
      }
    }, "Mark all as NPCs"),
  );
}

function Turn(props) {
  const actorType = props.actor.isPlayer ? "player" : "NPC";
  const completionState = props.actionIdx === undefined ? "incomplete" : "complete";
  return e("div", {className: `turn ${actorType} ${completionState}`},
    e("h3", {}, `Turn ${props.turnID} by ${props.actor.name} (${actorType})`),
    e("div", {className: "actions-list"},
      props.actions.map((action, actionIdx) => {
        const wasChosen = actionIdx === props.actionIdx;
        return e("div", {
            className: `action${wasChosen?" chosen":""}`,
            onClick: () => {
              // when the player clicks an action on an untaken player turn, perform that action
              if (!props.actor.isPlayer) return;
              if (props.actionIdx !== undefined) return;
              actuallyDoAction(appState, appPraxishState, props.turnID, actionIdx);
            }
          },
          e("h4", {}, action.name),
          e("div", {className: "tags-list"},
            e("span", {className: `tag priority ${action.priority}`}, action.priority || "normal"),
            e("span", {className: "tag score"}, action.score),
          ),
          e("ul", {className: "sways-list"},
            action.sways.map(sway => {
              return e("li", {className: "sway"},
                `${sway.type}: ${sway.rule.name} (${sway.rule.score || 0}, ${sway.rule.priority || "normal"})`
              )
            })
          )
        )
      })
    )
  );
}

function TurnsTranscript(props) {
  return e("div", {id: "turns-transcript"},
    e("h2", {}, "Turns"),
    props.turns.map(turn => e(Turn, turn))
  );
}

function App(props) {
  return [
    e(CharactersPanel, props),
    e(TurnsTranscript, props),
  ];
}

renderUI();

/// Define domain

const greetPractice = {
  id: "greet",
  name: "People can greet one another",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Greet [Other]",
      conditions: [
        "char.Other",
        "not practice.greet.World.alreadyGreeted.Actor.Other"
      ],
      outcomes: [
        "insert practice.greet.World.alreadyGreeted.Actor.Other",
      ],
      influences: [{
        name: "Greetings should be reciprocated",
        conditions: ["practice.greet.World.alreadyGreeted.Other.Actor"],
        priority: "required",
      }],
    }
  ],
  volitions: [{
    name: "People want to greet their friends",
    conditions: [
      "char.Actor.friends.Other",
      "practice.greet.World.alreadyGreeted.Actor.Other"
    ],
    score: 5,
  },
  {
    name: "Gregarious people want to greet strangers",
    conditions: [
      "char.Actor.tag.gregarious",
      "not char.Actor.friends.Other",
      "practice.greet.World.alreadyGreeted.Actor.Other"
    ],
    score: 2,
  }]
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
        name: "Conversations should stay roughly on topic",
        conditions: ["practice.yap.World.lastTopic.Topic"],
        score: 2,
      },
      {
        name: "A conversation's topic can drift to connected topics",
        conditions: [
          "practice.yap.World.lastTopic.OldTopic",
          "topic.OldTopic.connected.Topic"
        ],
        score: 2,
      }],
    }
  ],
  volitions: [{
    name: "People want to talk about their interests",
    conditions: [
      "char.Actor.interest.Topic",
      "practice.yap.World.lastTopic.Topic"
    ],
    score: 3,
  }]
};

// set up initial praxish state and practice definitions
const appPraxishState = Praxish.createPraxishState();
Praxish.definePractice(appPraxishState, greetPractice);
Praxish.definePractice(appPraxishState, yapPractice);
// set up characters
for (const char of appState.chars) {
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
  "char.lillislue.interest.controversialInventions",
  "char.lillislue.interest.medicalScience",
  "char.lillislue.interest.lillisluesWork",
  "char.framingham.interest.continentalPlague",
  "char.framingham.interest.continentalWar",
  "char.framingham.interest.politicalUnrest",
  "char.framingham.interest.merchantCollusion",
  // easelwood
  "char.framingham.interest.royalFamily",
  "char.framingham.interest.king",
  "char.framingham.interest.ailingKing",
  "char.framingham.interest.queen",
  "char.framingham.interest.princess",
  "char.framingham.interest.importanceOfMarriage",
  "char.framingham.interest.prince",
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

/// Define game loop

function setUpTurn(appState, praxishState) {
  const turnID = appState.turns.length;
  appState.actorIdx = advanceCursor(appState.actorIdx, appState.chars);
  const actor = appState.chars[appState.actorIdx];
  const possibleActions = Swaygent.scoreActions(praxishState, actor);
  return {turnID, actor, actions: possibleActions};
}

function actuallyDoAction(appState, praxishState, turnID, actionIdx) {
  const turn = appState.turns.find(turn => turn.turnID === turnID);
  turn.actionIdx = actionIdx;
  Praxish.performAction(praxishState, turn.actions[actionIdx]);
  renderUI();
  requestAnimationFrame(tick);
}

function tick() {
  const turn = setUpTurn(appState, appPraxishState);
  appState.turns.push(turn);
  if (turn.actor.isPlayer) {
    renderUI();
  }
  else {
    actuallyDoAction(appState, appPraxishState, turn.turnID, 0);
  }
}

tick();
