/// Define practices

const worldPractice = {
  id: "world",
  name: "The world exists",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Go to [Place]",
      conditions: [
        "practice.world.World.at.Actor!OtherPlace",
        "practice.world.World.connected.OtherPlace.Place"
      ],
      outcomes: [
        "insert practice.world.World.at.Actor!Place"
      ]
    }
  ]
};

const greetPractice = {
  id: "greet",
  name: "People can greet one another",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Greet [Other]",
      conditions: [
        "practice.world.world.at.Actor!Place",
        "practice.world.world.at.Other!Place",
        "neq Actor Other",
        "not practice.greet.World.alreadyGreeted.Actor.Other",
        "not boundToPractice.Other"
      ],
      outcomes: [
        "insert practice.greet.World.alreadyGreeted.Actor.Other",
        //"insert practice.respondToGreeting.Other.Actor",
      ]
    },
    {
      name: "[Actor]: Take offense at [Other] not reciprocating greeting",
      conditions: [
        "practice.greet.World.alreadyGreeted.Actor.Other",
        "not practice.greet.World.alreadyGreeted.Other.Actor",
        "not boundToPractice.Other",
        "not offended.Actor.Other.ignoredMyGreeting"
      ],
      outcomes: [
        "insert offended.Actor.Other.ignoredMyGreeting",
      ]
    }
  ]
};

const jukeboxPractice = {
  // TODO Add themes for different song parts,
  // an action for reflecting on themes of the currently playing song part,
  // maybe agent preferences for specific songs?
  id: "jukebox",
  name: "A jukebox is here",
  data: [
    "song.closingStar",
    "songPart.prebeginning!beginning",
    "songPart.beginning!middle",
    "songPart.middle!end"
  ],
  roles: ["Place", "JukeboxGhost"],
  actions: [
    {
      name: "[Actor]: Queue up [Song] on the jukebox",
      conditions: [
        "not practice.jukebox.JukeboxGhost.playing",
        "practiceData.jukebox.song.Song",
        "neq Actor JukeboxGhost",
        "practice.world.world.at.Actor!Place",
      ],
      outcomes: [
        "insert practice.jukebox.JukeboxGhost.playing!Song!prebeginning"
      ]
    },
    {
      name: "[Actor]: Play [Part] of [Song]",
      conditions: [
        "eq Actor JukeboxGhost",
        "practice.jukebox.JukeboxGhost.playing!Song!PrevPart",
        "practiceData.jukebox.songPart.PrevPart!Part"
      ],
      outcomes: [
        "insert practice.jukebox.JukeboxGhost.playing!Song!Part"
      ]
    },
    {
      name: "[Actor]: Finish playing [Song]",
      conditions: [
        "eq Actor JukeboxGhost",
        "practice.jukebox.JukeboxGhost.playing!Song!end"
      ],
      outcomes: [
        "delete practice.jukebox.JukeboxGhost.playing"
      ]
    }
  ]
};

const tendBarPractice = {
  id: "tendBar",
  name: "[Bartender] is tending bar",
  data: [
    "beverageType.beer!alcoholic",
    "beverageType.cider!alcoholic",
    "beverageType.soda!nonalcoholic",
    "beverageType.water!nonalcoholic"
  ],
  roles: ["Place", "Bartender"],
  actions: [
    {
      name: "[Actor]: Order [Beverage]",
      conditions: [
        "neq Actor Bartender",
        "practice.world.world.at.Actor!Place",
        "not practice.tendBar.Place.Bartender.customer.Actor!beverage",
        "practiceData.tendBar.beverageType.Beverage"
      ],
      outcomes: [
        "insert practice.tendBar.Place.Bartender.customer.Actor!order!Beverage"
        // TODO insert an obligation-to-act on the part of the bartender?
      ]
    },
    {
      name: "[Actor]: Fulfill [Customer]'s order",
      conditions: [
        "eq Actor Bartender",
        "practice.tendBar.Place.Bartender.customer.Customer!order!Beverage",
        "practice.world.world.at.Customer!Place",
        "practice.world.world.at.Bartender!Place"
      ],
      outcomes: [
        "delete practice.tendBar.Place.Bartender.customer.Customer!order",
        "insert practice.tendBar.Place.Bartender.customer.Customer!beverage!Beverage"
      ]
    },
    {
      name: "[Actor]: Drink [Beverage]",
      conditions: [
        "practice.tendBar.Place.Bartender.customer.Actor!beverage!Beverage"
      ],
      outcomes: [
        "delete practice.tendBar.Place.Bartender.customer.Actor!beverage"
        // TODO increase drunkenness if Beverage is alcoholic?
      ]
    },
    {
      name: "[Actor]: Spill [Beverage]",
      conditions: [
        "practice.tendBar.Place.Bartender.customer.Actor!beverage!Beverage",
        "practice.world.world.at.Actor!Place", // for now only allow spills *at* bar
      ],
      outcomes: [
        "delete practice.tendBar.Place.Bartender.customer.Actor!beverage",
        "insert practice.tendBar.Place.Bartender.customer.Actor!spill"
        // FIXME maybe spawn a separate spill practice like James D was playing with?
      ]
    },
    {
      name: "[Actor]: Clean up spill near [Customer]",
      conditions: [
        "practice.tendBar.Place.Bartender.customer.Customer!spill",
        "practice.world.world.at.Actor!Place",
      ],
      outcomes: [
        "delete practice.tendBar.Place.Bartender.customer.Customer!spill"
        // FIXME mark politeness stuff for bartender vs spiller vs other customer cleaning it up?
        // make the bartender more annoyed?
      ]
    },
    {
      name: "[Actor]: Take offense at [Bartender] being away from bar",
      conditions: [
        "neq Actor Bartender",
        "practice.world.world.at.Actor!Place",
        "not practice.world.world.at.Bartender!Place",
        "not offended.Actor.Bartender.notTendingBar"
      ],
      outcomes: [
        "insert offended.Actor.Bartender.notTendingBar"
      ]
    },
    {
      name: "[Actor]: Clean glass",
      conditions: [
        "eq Actor Bartender",
        "practice.world.world.at.Bartender!Place"
      ],
      outcomes: []
    },
  ]
};

const ticTacToePractice = {
  id: "ticTacToe",
  name: "[Player1] and [Player2] are playing tic-tac-toe",
  roles: ["Player1", "Player2"],
  init: [
    // Who goes first?
    "insert practice.ticTacToe.Player1.Player2.whoseTurn!Player1!Player2",
    // Who plays which piece?
    "insert practice.ticTacToe.Player1.Player2.player.Player1.piece!o",
    "insert practice.ticTacToe.Player1.Player2.player.Player2.piece!x",
    // Initial board state
    "insert practice.ticTacToe.Player1.Player2.board.top.left!empty",
    "insert practice.ticTacToe.Player1.Player2.board.top.center!empty",
    "insert practice.ticTacToe.Player1.Player2.board.top.right!empty",
    "insert practice.ticTacToe.Player1.Player2.board.middle.left!empty",
    "insert practice.ticTacToe.Player1.Player2.board.middle.center!empty",
    "insert practice.ticTacToe.Player1.Player2.board.middle.right!empty",
    "insert practice.ticTacToe.Player1.Player2.board.bottom.left!empty",
    "insert practice.ticTacToe.Player1.Player2.board.bottom.center!empty",
    "insert practice.ticTacToe.Player1.Player2.board.bottom.right!empty"
  ],
  actions: [
    {
      name: "[Actor]: Play [Piece] at [Row] [Col]",
      conditions: [
        // Check whether this move should be possible
        "not practice.ticTacToe.Player1.Player2.gameOver",
        "practice.ticTacToe.Player1.Player2.whoseTurn!Actor!Other",
        "practice.ticTacToe.Player1.Player2.player.Actor.piece!Piece",
        "practice.ticTacToe.Player1.Player2.board.Row.Col!empty",
      ],
      outcomes: [
        "insert practice.ticTacToe.Player1.Player2.board.Row.Col!Piece",
        "insert practice.ticTacToe.Player1.Player2.whoseTurn!Other!Actor",
        "call ticTacToe_checkEndConditions Player1 Player2"
      ]
    },
    // Declare-winner actions
    {
      name: "[Actor]: Concede gracefully",
      conditions: [
        "practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser",
        "eq Actor Loser"
      ],
      outcomes: [
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Gloat about victory",
      conditions: [
        "practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser",
        "eq Actor Winner"
      ],
      outcomes: [
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Remark on the pointlessness of tic-tac-toe",
      conditions: [
        "practice.ticTacToe.Player1.Player2.gameOver!tie",
        "neq Actor Winner",
        "neq Actor Loser"
      ],
      outcomes: [
        "insert Player1.ship.Player2.ticTacToeMemory!tied",
        "insert Player2.ship.Player1.ticTacToeMemory!tied",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
  ],
  functions: [
    {
      name: "ticTacToe_checkEndConditions",
      params: ["Player1", "Player2"],
      cases: [
        {
          conditions: [
            "practice.ticTacToe.Player1.Player2.board.top.Col!Piece",
            "practice.ticTacToe.Player1.Player2.board.middle.Col!Piece",
            "practice.ticTacToe.Player1.Player2.board.bottom.Col!Piece",
            "practice.ticTacToe.Player1.Player2.player.Winner.piece!Piece",
            // Grab the loser so we can mark them as having lost
            "practice.ticTacToe.Player1.Player2.player.Loser",
            "neq Winner Loser"
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser"
          ]
        },
        {
          conditions: [
            "practice.ticTacToe.Player1.Player2.board.Row.left!Piece",
            "practice.ticTacToe.Player1.Player2.board.Row.center!Piece",
            "practice.ticTacToe.Player1.Player2.board.Row.right!Piece",
            "practice.ticTacToe.Player1.Player2.player.Winner.piece!Piece",
            // Grab the loser so we can mark them as having lost
            "practice.ticTacToe.Player1.Player2.player.Loser",
            "neq Winner Loser"
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser"
          ]
        },
        {
          conditions: [
            "practice.ticTacToe.Player1.Player2.board.top.left!Piece",
            "practice.ticTacToe.Player1.Player2.board.middle.center!Piece",
            "practice.ticTacToe.Player1.Player2.board.bottom.right!Piece",
            "practice.ticTacToe.Player1.Player2.player.Winner.piece!Piece",
            // Grab the loser so we can mark them as having lost
            "practice.ticTacToe.Player1.Player2.player.Loser",
            "neq Winner Loser"
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser"
          ]
        },
        {
          conditions: [
            "practice.ticTacToe.Player1.Player2.board.top.right!Piece",
            "practice.ticTacToe.Player1.Player2.board.middle.center!Piece",
            "practice.ticTacToe.Player1.Player2.board.bottom.left!Piece",
            "practice.ticTacToe.Player1.Player2.player.Winner.piece!Piece",
            // Grab the loser so we can mark them as having lost
            "practice.ticTacToe.Player1.Player2.player.Loser",
            "neq Winner Loser"
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!Winner!Loser"
          ]
        },
        // Tie-game cases
        {
          conditions: [
            // Check that every row has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.top.C1!x",
            "practice.ticTacToe.Player1.Player2.board.top.C2!o",
            "practice.ticTacToe.Player1.Player2.board.middle.C3!x",
            "practice.ticTacToe.Player1.Player2.board.middle.C4!o",
            "practice.ticTacToe.Player1.Player2.board.bottom.C5!x",
            "practice.ticTacToe.Player1.Player2.board.bottom.C6!o",
            // Check that every column has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.R1.left!x",
            "practice.ticTacToe.Player1.Player2.board.R2.left!o",
            "practice.ticTacToe.Player1.Player2.board.R3.center!x",
            "practice.ticTacToe.Player1.Player2.board.R4.center!o",
            "practice.ticTacToe.Player1.Player2.board.R5.right!x",
            "practice.ticTacToe.Player1.Player2.board.R6.right!o",
            // Check that both *diagonals* have both piece types in 'em
            // (two corners per tie-game action)
            "practice.ticTacToe.Player1.Player2.board.top.left!P1",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P2",
            "neq P1 P2", "neq P1 empty", "neq P2 empty",
            "practice.ticTacToe.Player1.Player2.board.top.right!P3",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P4",
            "neq P3 P4", "neq P3 empty", "neq P4 empty",
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!tie"
          ]
        },
        {
          conditions: [
            // Check that every row has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.top.C1!x",
            "practice.ticTacToe.Player1.Player2.board.top.C2!o",
            "practice.ticTacToe.Player1.Player2.board.middle.C3!x",
            "practice.ticTacToe.Player1.Player2.board.middle.C4!o",
            "practice.ticTacToe.Player1.Player2.board.bottom.C5!x",
            "practice.ticTacToe.Player1.Player2.board.bottom.C6!o",
            // Check that every column has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.R1.left!x",
            "practice.ticTacToe.Player1.Player2.board.R2.left!o",
            "practice.ticTacToe.Player1.Player2.board.R3.center!x",
            "practice.ticTacToe.Player1.Player2.board.R4.center!o",
            "practice.ticTacToe.Player1.Player2.board.R5.right!x",
            "practice.ticTacToe.Player1.Player2.board.R6.right!o",
            // Check that both *diagonals* have both piece types in 'em
            // (two corners per tie-game action)
            "practice.ticTacToe.Player1.Player2.board.top.right!P1",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P2",
            "neq P1 P2", "neq P1 empty", "neq P2 empty",
            "practice.ticTacToe.Player1.Player2.board.bottom.right!P3",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P4",
            "neq P3 P4", "neq P3 empty", "neq P4 empty",
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!tie"
          ]
        },
        {
          conditions: [
            // Check that every row has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.top.C1!x",
            "practice.ticTacToe.Player1.Player2.board.top.C2!o",
            "practice.ticTacToe.Player1.Player2.board.middle.C3!x",
            "practice.ticTacToe.Player1.Player2.board.middle.C4!o",
            "practice.ticTacToe.Player1.Player2.board.bottom.C5!x",
            "practice.ticTacToe.Player1.Player2.board.bottom.C6!o",
            // Check that every column has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.R1.left!x",
            "practice.ticTacToe.Player1.Player2.board.R2.left!o",
            "practice.ticTacToe.Player1.Player2.board.R3.center!x",
            "practice.ticTacToe.Player1.Player2.board.R4.center!o",
            "practice.ticTacToe.Player1.Player2.board.R5.right!x",
            "practice.ticTacToe.Player1.Player2.board.R6.right!o",
            // Check that both *diagonals* have both piece types in 'em
            // (two corners per tie-game action)
            "practice.ticTacToe.Player1.Player2.board.bottom.right!P1",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P2",
            "neq P1 P2", "neq P1 empty", "neq P2 empty",
            "practice.ticTacToe.Player1.Player2.board.bottom.left!P3",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P4",
            "neq P3 P4", "neq P3 empty", "neq P4 empty",
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!tie"
          ]
        },
        {
          conditions: [
            // Check that every row has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.top.C1!x",
            "practice.ticTacToe.Player1.Player2.board.top.C2!o",
            "practice.ticTacToe.Player1.Player2.board.middle.C3!x",
            "practice.ticTacToe.Player1.Player2.board.middle.C4!o",
            "practice.ticTacToe.Player1.Player2.board.bottom.C5!x",
            "practice.ticTacToe.Player1.Player2.board.bottom.C6!o",
            // Check that every column has both piece types in it
            "practice.ticTacToe.Player1.Player2.board.R1.left!x",
            "practice.ticTacToe.Player1.Player2.board.R2.left!o",
            "practice.ticTacToe.Player1.Player2.board.R3.center!x",
            "practice.ticTacToe.Player1.Player2.board.R4.center!o",
            "practice.ticTacToe.Player1.Player2.board.R5.right!x",
            "practice.ticTacToe.Player1.Player2.board.R6.right!o",
            // Check that both *diagonals* have both piece types in 'em
            // (two corners per tie-game action)
            "practice.ticTacToe.Player1.Player2.board.bottom.left!P1",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P2",
            "neq P1 P2", "neq P1 empty", "neq P2 empty",
            "practice.ticTacToe.Player1.Player2.board.top.left!P3",
            "practice.ticTacToe.Player1.Player2.board.middle.center!P4",
            "neq P3 P4", "neq P3 empty", "neq P4 empty",
          ],
          outcomes: [
            "insert practice.ticTacToe.Player1.Player2.gameOver!tie"
          ]
        }
      ]
    }
  ]
};

/// Define text renderers for individual DB sentences and named entities

const sentenceRenderers = [
  ["practice.world.world.at.Actor!Place",
   "[Actor] is [Place]"],
  ["offended.Actor.Other.Reason",
   "[Actor] is offended at [Other]: '[Other] [Reason]'"],
  ["practice.tendBar.Place.Bartender.customer.Actor.order.Drink",
   "[Actor] is waiting for [Bartender] to serve them a [Drink]"],
  ["practice.tendBar.Place.Bartender.customer.Actor!beverage!Drink",
   "[Actor] has a [Drink]"],
  ["practice.tendBar.Place.Bartender.customer.Actor!spill",
   "There is a spill near [Actor]'s seat at the bar"],
  ["practice.jukebox.JukeboxGhost.playing!Song!Part",
   "The jukebox is playing the [Part] of [Song]"],
];

const nameRenderers = {
  // characters
  "min": "Min",
  "june": "June",
  "isaac": "Isaac",
  "singer": "the singer",
  // places
  "entrance": "near the entrance",
  "barArea": "at the bar",
  "jukeboxCorner": "in the corner by the jukebox",
  "stageArea": "near the stage",
  // reasons for offense
  "ignoredMyGreeting": "ignored my greeting",
  "notTendingBar": "is neglecting the bar",
  // songs
  "closingStar": "'Closing Star'",
};

/// Define characters

const allCharacters = [
  {
    name: "min",
    goals: [
      {
        name: "Order cider",
        utility: 5,
        conditions: ["practice.tendBar.Place.Bartender.customer.min!order!cider"]
      },
      {
        name: "Order soda",
        utility: 5,
        conditions: ["practice.tendBar.Place.Bartender.customer.min!order!soda"]
      },
    ]
  },
  {
    name: "june",
    goals: [
      {
        name: "Order beer",
        utility: 5,
        conditions: ["practice.tendBar.Place.Bartender.customer.june!order!beer"]
      },
    ]
  },
  {
    name: "isaac",
    goals: [
      {
        name: "Stay at the bar",
        utility: 1,
        conditions: ["practice.world.world.at.isaac!barArea"]
      },
      {
        name: "Clean up spills",
        utility: -2,
        conditions: ["practice.tendBar.Place.isaac.customer.Customer!spill"]
      },
      {
        name: "Serve customers",
        utility: -5,
        conditions: ["practice.tendBar.Place.isaac.customer.Customer!order"]
      },
      {
        name: "Preferentially serve June",
        utility: -5,
        conditions: ["practice.tendBar.Place.isaac.customer.june!order"]
      },
    ]
  },
  {
    name: "jukebox",
    boundToPractice: "jukebox"
  },
  {
    name: "singer",
    goals: [
      {
        name: "Relax backstage",
        utility: 5,
        conditions: ["practice.world.world.at.singer!backstage"]
      },
      {
        name: "Avoid others",
        utility: -3,
        conditions: [
          "practice.world.world.at.singer!Place",
          "practice.world.world.at.Other!Place",
          "neq Other singer"
        ]
      },
    ]
  }
];

/// Give all non-practice-bound characters the standard offense-avoidance goals

for (const char of allCharacters) {
  if (char.boundToPractice) continue;
  char.goals.push({
    name: "Avoid offending others",
    utility: -50,
    conditions: [`offended.Other.${char.name}`]
  });
  char.goals.push({
    name: "Take offense when expected",
    utility: 1,
    conditions: [`offended.${char.name}.Other`]
  });
}

/// Initialize our Praxish instance

const appPraxishState = Praxish.createPraxishState();
appPraxishState.allChars = allCharacters;
Praxish.definePractice(appPraxishState, worldPractice);
const placePairs = [
  // outside to entrance
  ["outside", "entrance"],
  // entrance to main places
  ["entrance", "barArea"],
  ["entrance", "jukeboxCorner"],
  ["entrance", "stageArea"],
  // main place interconnections
  ["barArea", "jukeboxCorner"],
  ["barArea", "stageArea"],
  ["jukeboxCorner", "stageArea"],
  // stage-related places
  ["stageArea", "onstage"],
  ["onstage", "backstage"],
];
for (const [p1, p2] of placePairs) {
  Praxish.performOutcome(appPraxishState, `insert practice.world.world.connected.${p1}.${p2}`);
  Praxish.performOutcome(appPraxishState, `insert practice.world.world.connected.${p2}.${p1}`);
}
for (const actor of appPraxishState.allChars) {
  Praxish.performOutcome(appPraxishState, `insert practice.world.world.at.${actor.name}!outside`);
}
Praxish.performOutcome(appPraxishState, "insert practice.world.world.at.isaac!barArea");
Praxish.performOutcome(appPraxishState, "delete practice.world.world.at.jukebox");
Praxish.definePractice(appPraxishState, greetPractice);
Praxish.performOutcome(appPraxishState, "insert practice.greet.world");
Praxish.definePractice(appPraxishState, tendBarPractice);
Praxish.performOutcome(appPraxishState, "insert practice.tendBar.barArea.isaac");
Praxish.definePractice(appPraxishState, jukeboxPractice);
Praxish.performOutcome(appPraxishState, "insert boundToPractice.jukebox");
Praxish.performOutcome(appPraxishState, "insert practice.jukebox.jukeboxCorner.jukebox");
