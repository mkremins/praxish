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

// Given an `outcome` string and a map of `bindings` to use for grounding any
// logic variables that appear in the `outcome`, return a fully grounded copy
// of the `outcome` (suitable for interpretation by `performOutcome`).
function groundOutcome(outcome, bindings) {
  const parts = outcome.trim().split(/\s+/);
  const op = parts[0];
  if (op === "insert" || op === "delete") {
    const sentence = parts[1];
    const groundedSentence = ground(sentence, bindings);
    const groundedOutcome = op + " " + groundedSentence;
    return groundedOutcome;
  }
  else if (op === "call") {
    const functionName = parts[1];
    const params = parts.slice(2);
    const groundedParams = params.map(param => ground(param, bindings));
    const groundedOutcome = op + " " + functionName + " " + groundedParams.join(" ");
    return groundedOutcome;
  }
  else {
    return outcome;
  }
}

// Given a `praxishState` and a fully grounded `outcome` (i.e., one of the
// possible consequences of an action), perform the `outcome` and return
// the updated `praxishState`.
function performOutcome(praxishState, outcome) {
  const parts = outcome.trim().split(/\s+/);
  const op = parts[0];
  if (op === "insert") {
    // First just perform the insertion.
    const sentence = parts[1];
    insert(praxishState.db, sentence);
    // Then figure out whether we're spawning a new practice instance,
    // and initialize the newly spawned instance if we are.
    const sentenceParts = sentence.split(/[\.\!]/);
    const practiceID = sentenceParts[0] === "practice" && sentenceParts[1];
    const practiceDef = praxishState.practiceDefs[practiceID];
    if (practiceID && !practiceDef) {
      console.warn("Undefined practice", practiceID);
      return praxishState;
    }
    const isSpawning = practiceDef && sentenceParts.length === practiceDef.roles.length + 2;
    if (isSpawning) {
      //console.log("Spawning practice ::", sentence);
      // If the practice definition has an `init`, run it.
      // Note that we'll need to ground any of the practice's role variables
      // that are used within an `init` outcome to perform that outcome.
      if (practiceDef.init && practiceDef.init.length > 0) {
        const roleBindings = {};
        for (let i = 0; i < practiceDef.roles.length; i++) {
          const roleName = practiceDef.roles[i];
          const roleValue = sentenceParts[i + 2];
          if (!roleValue) console.warn("Missing role value", practiceDef.id, roleName);
          roleBindings[roleName] = roleValue;
        }
        for (const initOutcome of practiceDef.init) {
          const groundedOutcome = groundOutcome(initOutcome, roleBindings);
          performOutcome(praxishState, groundedOutcome);
        }
      }
    }
  }
  else if (op === "delete") {
    const sentence = parts[1];
    retract(praxishState.db, sentence);
  }
  else if (op === "call") {
    // Look up the function to execute.
    // FIXME The current lookup process has to search within each practice definition
    // for a function with the specified name, which is unnecessarily slow.
    // We can improve performance by building a function registry at `definePractice` time.
    const functionName = parts[1];
    let functionDef = null;
    for (const practiceDef of Object.values(praxishState.practiceDefs)) {
      const functionDefs = practiceDef.functions || [];
      functionDef = functionDefs.find(fdef => fdef.name === functionName);
      if (functionDef) break;
    }
    if (!functionDef) {
      console.warn("Couldn't find function", functionName);
    }
    // Establish bindings for the function's parameters, if any.
    const paramNames = functionDef.params || [];
    const paramVals = parts.slice(2);
    const paramBindings = {};
    for (let i = 0; i < paramNames.length; i++) {
      paramBindings[paramNames[i]] = paramVals[i];
    }
    // Determine which of the function's cases to execute (if any) and execute it.
    for (const caseDef of functionDef.cases) {
      const results = query(praxishState.db, caseDef.conditions, paramBindings);
      if (results.length > 0) {
        // Execute this case with the first available bindings and stop trying other cases.
        // FIXME Only one case should be executed per `call`, right?
        const result = results[0];
        for (const outcomeDef of caseDef.outcomes || []) {
          const outcome = groundOutcome(outcomeDef, result);
          performOutcome(praxishState, outcome); // FIXME Possible infinite recursion if `call`
        }
        break;
      }
    }
  }
  else {
    console.warn("Bad outcome op", op, outcome);
  }
  return praxishState;
}

// Given a `praxishState` and an `action` (i.e., a map of bindings including
// at least `Actor`, `practiceID`, `instanceID`, and `actionID`),
// perform the `action` and return the updated `praxishState`.
function performAction(praxishState, action) {
  const practiceDef = praxishState.practiceDefs[action.practiceID];
  const actionDef = practiceDef.actions.find(adef => adef.name === action.actionID);
  for (const outcomeDef of actionDef.outcomes || []) {
    const outcome = groundOutcome(outcomeDef, action);
    performOutcome(praxishState, outcome);
  }
  return praxishState;
}

// Given a `praxishState`, determine whose turn it is to act,
// select an action for that character to perform, and perform the action.
function tick(praxishState) {
  // Figure out whose turn it is to act. For now, turntaking will just be simple round-robin.
  praxishState.actorIdx += 1;
  if (praxishState.actorIdx > praxishState.allChars.length - 1) praxishState.actorIdx = 0;
  const actor = praxishState.allChars[praxishState.actorIdx];
  // Get all possible actions for the current actor.
  const possibleActions = getAllPossibleActions(praxishState, actor.name);
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
      performAction(praxishState, possibleAction);
      possibleAction.score = 0;
      for (const goal of actor.goals) {
        const results = query(praxishState.db, goal.conditions, {});
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
  performAction(praxishState, actionToPerform);
}
