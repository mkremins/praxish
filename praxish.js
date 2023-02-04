// Return a random item from a list.
function randNth(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Given a text `template` to render and a map of `bindings` to swap in,
// return a copy of the `template` with all `[SquareBracketed]` variables
// replaced by the corresponding value from `bindings`.
function renderText(template, bindings) {
  let outputText = template;
  for (const [key, value] of Object.entries(bindings)) {
    outputText = outputText.replaceAll(`[${key}]`, value);
  }
  return outputText;
}

// Create and return a fresh "Praxish state": a wrapper object bundling up
// all of the internal state that a Praxish simulation needs to run.
// Basically you can think of this object as "the interpreter".
// FIXME For now you need to initialize `allChars` manually
// on the returned object; see `tests.js` for an example.
function createPraxishState() {
  return {db: {}, practiceDefs: {}, allChars: [], actorIdx: -1};
}

// Given a `praxishState` and a `practiceDef` defining a practice,
// update the `praxishState` to include this newly defined practice
// and return the updated `praxishState`.
function definePractice(praxishState, practiceDef) {
  praxishState.practiceDefs[practiceDef.id] = practiceDef;
  // Insert this practice's static data into the DB under the practice.PRACTICE_ID.data prefix.
  const practiceDataPrefix = `practice.${practiceDef.name}.data.`;
  const practiceData = (practiceDef.data || []).map(s => practiceDataPrefix + s);
  for (const sentence of practiceData) {
    insert(praxishState.db, sentence);
  }
  return praxishState;
}

// Given a `praxishState` and an `actor`, return a list of all possible actions
// that the `actor` can perform.
function getAllPossibleActions(praxishState, actor) {
  const initBindings = {Actor: actor};
  const allPossibleActions = [];
  for (const practiceID of Object.keys(praxishState.db.practice)) {
    // Query for instances of this practice.
    const practiceDef = praxishState.practiceDefs[practiceID];
    const prefix = `practice.${practiceID}.`;
    const instancesQuery = prefix + practiceDef.roles.join(".");
    const instances = unify(instancesQuery, praxishState.db, initBindings);
    for (const instance of instances) {
      // Get all possible actions for this actor from this instance.
      const instanceID = ground(instancesQuery, instance);
      for (const actionDef of practiceDef.actions) {
        // Unify this action's conditions with the DB and previous bindings.
        const possibleActions = unifyAll(actionDef.conditions, praxishState.db, instance);
        for (const action of possibleActions) {
          // Link this possible action to its originating practice definition,
          // practice instance, and action definition.
          action.practiceID = practiceID;
          action.instanceID = instanceID;
          action.actionID = actionDef.name;
          // Swap variable values into the action name template.
          action.name = renderText(actionDef.name, action);
          // Add this possible action to the list of all possible actions.
          allPossibleActions.push(action);
        }
      }
    }
  }
  return allPossibleActions;
}

// Given a `praxishState` and an `action` (i.e., a map of bindings including
// at least `Actor`, `practiceID`, `instanceID`, and `actionID`),
// perform the `action` and return the updated `praxishState`.
function performAction(praxishState, action) {
  console.log("Performing action", action);
  const practiceDef = praxishState.practiceDefs[action.practiceID];
  const actionDef = practiceDef.actions.find(adef => adef.name === action.actionID);
  for (const outcomeDef of actionDef.outcomes) {
    const parts = outcomeDef.trim().split(" ");
    const op = parts[0];
    if (op === "insert") {
      const sentence = ground(parts[1], action);
      insert(praxishState.db, sentence);
    }
    else if (op === "delete") {
      const sentence = ground(parts[1], action);
      retract(praxishState.db, sentence);
    }
    else {
      console.warn("Bad outcome op", op, outcome);
    }
  }
}

// Given a `praxishState`, determine whose turn it is to act,
// select an action for that character to perform, and perform the action.
function tick(praxishState) {
  // Figure out whose turn it is to act. For now, turntaking will just be simple round-robin.
  praxishState.actorIdx += 1;
  if (praxishState.actorIdx > praxishState.allChars.length - 1) praxishState.actorIdx = 0;
  const actor = praxishState.allChars[praxishState.actorIdx];
  // Get all possible actions for the current actor.
  const possibleActions = getAllPossibleActions(praxishState, actor);
  // Select an action for the actor to perform. For now, action selection will just be random.
  const action = randNth(possibleActions);
  if (!action) {
    console.warn("No actions to perform", actor);
    return;
  }
  // Perform the action.
  performAction(praxishState, action);
}
