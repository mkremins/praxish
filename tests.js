/// Test basic DB functionality. Does insertion, querying, and deletion work?

const testDB = {};
insert(testDB, "foo.bar.baz");
insert(testDB, "foo.bar.woof");
insert(testDB, "foo.meow.woof");
insert(testDB, "fizz.buzz.foo");
insert(testDB, "some.other.woof");
console.log(dbToSentences(testDB));
console.log(unifyAll(["X.Y.woof", "fizz.buzz.X"], testDB));
retract(testDB, "foo.bar");
console.log(dbToSentences(testDB));

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
    "insert practice.ticTacToe.Player1.Player2.whoseTurn!Player1",
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
        "practice.ticTacToe.Player1.Player2.whoseTurn!Actor",
        "practice.ticTacToe.Player1.Player2.player.Actor.piece!Piece",
        "practice.ticTacToe.Player1.Player2.board.Row.Col!empty",
        // Grab the other player so we can make it their turn next
        "practice.ticTacToe.Player1.Player2.player.Other",
        "neq Actor Other"
      ],
      outcomes: [
        "insert practice.ticTacToe.Player1.Player2.board.Row.Col!Piece",
        "insert practice.ticTacToe.Player1.Player2.whoseTurn!Other"
      ]
    },
    // Declare-winner actions. These are super hacky and wrong: they were
    // originally conceived as a workaround for not having `if`/`call` yet,
    // and there's nothing in the practice's current definition that will keep
    // the players from *continuing* to play after the game is already decided
    // but before one of these actions is performed.
    // However, I kind of like the idea of "calling the game" being an action
    // that different characters can perform: it opens the door to storyful
    // interpretations like "conceding gracefully" and "being a sore winner".
    {
      name: "[Actor]: Declare [Winner] as the winner",
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
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare [Winner] as the winner",
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
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare [Winner] as the winner",
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
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare [Winner] as the winner",
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
        "insert Winner.ship.Loser.ticTacToeMemory!won",
        "insert Loser.ship.Winner.ticTacToeMemory!lost",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    // Declare-tie actions. These are actually even worse.
    {
      name: "[Actor]: Declare the game tied",
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
        "insert Player1.ship.Player2.ticTacToeMemory!tied",
        "insert Player2.ship.Player1.ticTacToeMemory!tied",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare the game tied",
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
        "insert Player1.ship.Player2.ticTacToeMemory!tied",
        "insert Player2.ship.Player1.ticTacToeMemory!tied",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare the game tied",
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
        "insert Player1.ship.Player2.ticTacToeMemory!tied",
        "insert Player2.ship.Player1.ticTacToeMemory!tied",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    },
    {
      name: "[Actor]: Declare the game tied",
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
        "insert Player1.ship.Player2.ticTacToeMemory!tied",
        "insert Player2.ship.Player1.ticTacToeMemory!tied",
        "delete practice.ticTacToe.Player1.Player2"
      ]
    }
  ]
};

// TODO Implement more practices:
// - jukebox
// - knowitalls
// - darthVader

/// Test Praxish: initialize a `testPraxishState`,
/// yeet a practice instance in there, and start ticking.

function doTicks(praxishState, n) {
  for (let i = 0; i < n; i++) {
    tick(praxishState);
  }
}

const testPraxishState = createPraxishState();
testPraxishState.allChars = ["max", "nic", "isaac"];
// First test with just the `greet` practice
console.log("PRACTICE TEST: greet");
definePractice(testPraxishState, greetPractice);
performOutcome(testPraxishState, "insert practice.greet.max.isaac");
performOutcome(testPraxishState, "insert practice.greet.nic.max");
doTicks(testPraxishState, 3);
// Then introduce and test with the `tendBar` practice
console.log("PRACTICE TEST: tendBar");
definePractice(testPraxishState, tendBarPractice);
performOutcome(testPraxishState, "insert practice.tendBar.isaac");
doTicks(testPraxishState, 12);
// And now test `ticTacToe` concurrently with the bar practice
console.log("PRACTICE TEST: ticTacToe");
definePractice(testPraxishState, ticTacToePractice);
performOutcome(testPraxishState, "insert practice.ticTacToe.max.nic");
doTicks(testPraxishState, 24);
