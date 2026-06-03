/// Test basic DB functionality. Does insertion, querying, and deletion work?

const testDB = {};
DB.insert(testDB, "foo.bar.baz");
DB.insert(testDB, "foo.bar.woof");
DB.insert(testDB, "foo.meow.woof");
DB.insert(testDB, "fizz.buzz.foo");
DB.insert(testDB, "some.other.woof");
console.log(DB.dbToSentences(testDB));
console.log(DB.unifyAll(["X.Y.woof", "fizz.buzz.X"], testDB));
DB.retract(testDB, "foo.bar");
console.log(DB.dbToSentences(testDB));

/// Test math.

DB.insert(testDB, "counter.0");
let mathRes = Praxish.query(testDB, ["counter.Val", "gt Val 4"], {});
console.log("mathRes", mathRes); // should be empty
mathRes = Praxish.query(testDB, ["counter.Val", "calc NewVal add Val 5"], {});
console.log("mathRes", mathRes); // should have NewVal: 5
DB.insert(testDB, `counter!${mathRes[0].NewVal}`);
mathRes = Praxish.query(testDB, ["counter.Val", "gt Val 4"], {});
console.log("mathRes", mathRes); // should have Val: 5
mathRes = Praxish.query(testDB, [
  "counter.Val",
  "calc BigVal mul Val Val",
  "lt Val BigVal",
  "calc TinyVal sub Val BigVal",
], {});
console.log("mathRes", mathRes); // should have TinyVal: -20
DB.insert(testDB, `counter!${mathRes[0].TinyVal}`);
mathRes = Praxish.query(testDB, ["counter.Val", "lte Val -20"], {});
console.log("mathRes", mathRes); // should have Val: -20

/// Define some practices for testing Praxish proper.

const greetPractice = {
  id: "greet",
  name: "[Greeter] is greeting [Greeted]",
  roles: ["Greeter", "Greeted"],
  actions: [
    {
      name: "[Actor]: Greet [Other]",
      conditions: [
        "eq Actor Greeter",
        "eq Other Greeted"
      ],
      outcomes: [
        //"insert practice.respondToGreeting.Other.Actor",
        "delete practice.greet.Actor.Other"
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
  roles: ["JukeboxGhost"],
  actions: [
    {
      name: "[Actor]: Queue up [Song] on the jukebox",
      conditions: [
        "not practice.jukebox.JukeboxGhost.playing",
        "practiceData.jukebox.song.Song",
        "neq Actor JukeboxGhost"
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
  roles: ["Bartender"],
  actions: [
    // Not sure how I feel about these join/leave actions,
    // but they seem useful for these kinds of group situations.
    {
      name: "[Actor]: Walk up to bar",
      conditions: [
        "neq Actor Bartender",
        "not practice.tendBar.Bartender.customer.Actor"
      ],
      outcomes: [
        "insert practice.tendBar.Bartender.customer.Actor"
      ]
    },
    {
      name: "[Actor]: Walk away from bar",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Actor"
      ]
    },
    {
      name: "[Actor]: Order [Beverage]",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor",
        "not practice.tendBar.Bartender.customer.Actor!beverage",
        "practiceData.tendBar.beverageType.Beverage"
      ],
      outcomes: [
        "insert practice.tendBar.Bartender.customer.Actor!order!Beverage"
        // TODO insert an obligation-to-act on the part of the bartender?
      ]
    },
    {
      name: "[Actor]: Fulfill [Customer]'s order",
      conditions: [
        "eq Actor Bartender",
        "practice.tendBar.Bartender.customer.Customer!order!Beverage"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Customer!order",
        "insert practice.tendBar.Bartender.customer.Customer!beverage!Beverage"
      ]
    },
    {
      name: "[Actor]: Drink [Beverage]",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor!beverage!Beverage"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Actor!beverage"
        // TODO increase drunkenness if Beverage is alcoholic?
      ]
    },
    {
      name: "[Actor]: Spill [Beverage]",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor!beverage!Beverage"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Actor!beverage",
        "insert practice.tendBar.Bartender.customer.Actor!spill"
        // FIXME maybe spawn a separate spill practice like James D was playing with?
      ]
    },
    {
      name: "[Actor]: Clean up spill near [Customer]",
      conditions: [
        "practice.tendBar.Bartender.customer.Customer!spill"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Customer!spill"
        // FIXME mark politeness stuff for bartender vs spiller vs other customer cleaning it up?
        // make the bartender more annoyed?
      ]
    }
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
        "practice.ticTacToe.Player1.Player2.board.Row.Col!empty"
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

// TODO Implement more practices:
// - knowitalls
// - darthVader

/// Define a minimum viable top-level game loop...

// Given a `praxishState`, determine whose turn it is to act,
// select an action for that character to perform, and perform the action.
function tick(praxishState) {
  // Figure out whose turn it is to act. For now, turntaking will just be simple round-robin.
  praxishState.actorIdx += 1;
  if (praxishState.actorIdx > praxishState.allChars.length - 1) praxishState.actorIdx = 0;
  const actor = praxishState.allChars[praxishState.actorIdx];
  // Get all possible actions for the current actor.
  const possibleActions = Praxish.getAllPossibleActions(praxishState, actor.name);
  // Figure out what action to perform.
  // Practice-bound actors should perform random available actions from their practice;
  // actors with goals should select actions that seem to advance their goals;
  // actors without goals can do whatever.
  let actionToPerform = null;
  if (actor.boundToPractice) {
    // Filter possible actions to just those from the bound practice.
    // FIXME We should probably move this logic into `getAllPossibleActions`
    // so that we don't waste time generating actions that will never be performed.
    const practiceActions = possibleActions.filter(pa => pa.practiceID === actor.boundToPractice);
    actionToPerform = randNth(practiceActions);
  }
  else if (actor.goals && possibleActions.length > 0) {
    // Speculatively perform each possible action
    // and score the outcome according to the actor's goals.
    for (const possibleAction of possibleActions) {
      const prevDB = clone(praxishState.db);
      Praxish.performAction(praxishState, possibleAction);
      possibleAction.score = 0;
      for (const goal of actor.goals) {
        const results = Praxish.query(praxishState.db, goal.conditions, {});
        possibleAction.score += (goal.utility * results.length);
      }
      praxishState.db = prevDB;
    }
    // Select an action for the actor to perform,
    // randomly choosing among top-scoring actions for this actor's goals.
    possibleActions.sort((a, b) => b.score - a.score);
    const topScore = possibleActions[0].score;
    const firstNonTopscoringIdx = possibleActions.findIndex(pa => pa.score < topScore);
    if (firstNonTopscoringIdx > -1) {
      const bestScoringActions = possibleActions.slice(0, firstNonTopscoringIdx);
      actionToPerform = randNth(bestScoringActions);
    }
    else {
      actionToPerform = randNth(possibleActions);
    }
  }
  else {
    // Select a random action to perform.
    actionToPerform = randNth(possibleActions);
  }
  // Perform the action, if any.
  if (!actionToPerform) {
    console.warn("No actions to perform", actor.name);
    return;
  }
  console.log("Performing action ::", actionToPerform.name, actionToPerform);
  Praxish.performAction(praxishState, actionToPerform);
}

/// Test Praxish: initialize a `testPraxishState`,
/// yeet a practice instance in there, and start ticking.

function doTicks(praxishState, n) {
  for (let i = 0; i < n; i++) {
    tick(praxishState);
  }
}

const testPraxishState = Praxish.createPraxishState();
testPraxishState.allChars = [
  {
    name: "max",
    goals: [
      {
        utility: 10,
        conditions: ["practice.ticTacToe.Player1.Player2.gameOver!max!Loser"]
      },
      {
        utility: 5,
        conditions: ["practice.tendBar.Bartender.customer.max!order!cider"]
      },
      {
        utility: 5,
        conditions: ["practice.tendBar.Bartender.customer.max!order!soda"]
      }
    ]
  },
  {
    name: "nic",
    goals: [
      {
        utility: 10,
        conditions: ["practice.ticTacToe.Player1.Player2.gameOver!nic!Loser"]
      },
      {
        utility: 5,
        conditions: ["practice.tendBar.Bartender.customer.nic!order!beer"]
      }
    ]
  },
  {
    name: "isaac",
    goals: [
      {
        utility: 5,
        conditions: ["not practice.tendBar.Bartender.customer.nic!order"]
      }
    ]
  },
  {
    name: "jukebox",
    boundToPractice: "jukebox"
  }
];
// First test with just the `greet` practice
console.log("PRACTICE TEST: greet");
Praxish.definePractice(testPraxishState, greetPractice);
Praxish.performOutcome(testPraxishState, "insert practice.greet.max.isaac");
Praxish.performOutcome(testPraxishState, "insert practice.greet.nic.max");
doTicks(testPraxishState, 4);
// Then introduce and test with the `tendBar` practice
console.log("PRACTICE TEST: tendBar");
Praxish.definePractice(testPraxishState, tendBarPractice);
Praxish.performOutcome(testPraxishState, "insert practice.tendBar.isaac");
doTicks(testPraxishState, 16);
// Then test `ticTacToe` concurrently with the bar practice
console.log("PRACTICE TEST: ticTacToe");
Praxish.definePractice(testPraxishState, ticTacToePractice);
Praxish.performOutcome(testPraxishState, "insert practice.ticTacToe.max.nic");
doTicks(testPraxishState, 32);
// Then test `jukebox` concurrently with the others
console.log("PRACTICE TEST: jukebox");
Praxish.definePractice(testPraxishState, jukeboxPractice);
Praxish.performOutcome(testPraxishState, "insert practice.jukebox.jukebox");
doTicks(testPraxishState, 24);
