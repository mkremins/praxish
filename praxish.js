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
  // Insert this practice's static data into the DB under the practiceData.PRACTICE_ID prefix.
  const practiceDataPrefix = `practiceData.${practiceDef.id}.`;
  const practiceData = (practiceDef.data || []).map(s => practiceDataPrefix + s);
  for (const sentence of practiceData) {
    insert(praxishState.db, sentence);
  }
  return praxishState;
}

// Given an exclusion logic `db`, a list of `conditions` to satisfy,
// and a map of previously established `bindings`, return all possible
// internally consistent bindings maps that satisfy the `conditions`.
// Use `query` instead of the simpler `unifyAll` when you need negation,
// variable equality checks, and so on in your conditions.
function query(db, conditions, bindings) {
  let matches = [bindings];
  for (const condition of conditions) {
    const nextMatches = [];
    const parts = condition.trim().split(/\s+/);
    if (parts.length === 1) {
      // Simple condition: just a logic sentence to try unifying with.
      for (const match of matches) {
        for (const newMatch of unify(condition, db, match)) {
          nextMatches.push(newMatch);
        }
      }
    }
    else {
      // Complex condition: an `op` plus one or more arguments.
      const op = parts[0];
      if (op === "not") {
        // Check that the argument sentence *doesn't* unify, and kill the match if it does.
        for (const match of matches) {
          const badMatches = unify(parts[1], db, match);
          if (badMatches.length > 0) continue; // Implicitly kill match via no-op
          nextMatches.push(match);
        }
      }
      else if (op === "eq") {
        // Unify the two arguments, which can be either bound vars, unbound vars, or constants.
        const [_, lhs, rhs] = parts;
        for (const match of matches) {
          const groundedLhs = isVariable(lhs) ? match[lhs] : lhs;
          const groundedRhs = isVariable(rhs) ? match[rhs] : rhs;
          if (groundedLhs && groundedRhs) {
            // Both sides bound or constant. Kill the match if they're not equal.
            if (groundedLhs !== groundedRhs) continue; // Implicitly kill match via no-op
            nextMatches.push(match);
          }
          else if (groundedLhs || groundedRhs) {
            // One side bound or constant, one unbound. Set the unbound var to the known val.
            const unboundVar = groundedLhs ? rhs : lhs;
            const groundedVal = groundedLhs ? groundedLhs : groundedRhs;
            const newMatch = clone(match);
            newMatch[unboundVar] = groundedVal;
            nextMatches.push(newMatch);
          }
          else {
            // Both sides unbound. Probably indicates an error in the practice definition.
            console.warn("Both sides of eq check unbound", condition);
          }
        }
      }
      else if (op === "neq") {
        // Kill the match if the two arguments (either constants or bound vars) are equal.
        // Basically a simplified version of the `eq` logic with the equality check inverted.
        const [_, lhs, rhs] = parts;
        for (const match of matches) {
          const groundedLhs = isVariable(lhs) ? match[lhs] : lhs;
          const groundedRhs = isVariable(rhs) ? match[rhs] : rhs;
          if (groundedLhs && groundedRhs) {
            // Both sides bound or constant. Kill the match if they're equal.
            if (groundedLhs === groundedRhs) continue; // Implicitly kill match via no-op
            nextMatches.push(match);
          }
          else {
            // At least one of the arguments is unbound.
            // Probably indicates an error in the practice definition.
            console.warn("Part of neq check unbound", condition);
          }
        }
      }
      else {
        console.warn("Bad condition op", op, condition);
      }
    }
    matches = nextMatches;
  }
  return matches;
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
        const possibleActions = query(praxishState.db, actionDef.conditions, instance);
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
  console.log("Performing action ::", action.name, action);
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
