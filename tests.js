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
        "practice.greet.Actor.Other"
        // TODO The condition on the previous line really needs to be an eq condition.
        // As written it'll bind to the Greeter and Greeted from *any* active instance
        // of the `greet` practice – create multiple instances to verify.
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
        "not practice.tendBar.Bartender.customer.Actor"
      ],
      outcomes: [
        "insert practice.tendBar.Bartender.customer.Customer"
      ]
    },
    {
      name: "[Actor]: Walk away from bar",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor"
      ],
      outcomes: [
        "delete practice.tendBar.Bartender.customer.Customer"
      ]
    },
    {
      name: "[Actor]: Order [Beverage]",
      conditions: [
        "practice.tendBar.Bartender.customer.Actor",
        "not practice.tendBar.Bartender.customer.Actor!beverage",
        "practice.tendBar.data.beverageType.Beverage"
      ],
      outcomes: [
        "insert practice.tendBar.Bartender.customer.Customer!order!Beverage"
        // TODO insert an obligation-to-act on the part of the bartender?
      ]
    },
    {
      name: "[Actor]: Fulfill [Customer]'s order",
      conditions: [
        "practice.tendBar.Actor", // Actor == Bartender? (probably needs an eq condition tbh)
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
        "insert practice.tendBar.Bartender.customer.Customer!spill"
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

/// Test Praxish: initialize a `testPraxishState`,
/// yeet a practice instance in there, and start ticking.

const testPraxishState = createPraxishState();
testPraxishState.allChars = ["max", "nic", "isaac"];
definePractice(testPraxishState, greetPractice);
insert(testPraxishState.db, "practice.greet.max.isaac");
//insert(testPraxishState.db, "practice.tendBar.isaac");
tick(testPraxishState);
tick(testPraxishState);
tick(testPraxishState);
tick(testPraxishState);
