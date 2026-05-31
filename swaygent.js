// Declare the Swaygent module to which API functions will be attached.
const Swaygent = {};

// Given a list of `scoredActions` for a particular actor,
// return the action that the actor should actually perform.
Swaygent.pickAction = function(scoredActions) {
  if (!scoredActions) return null;
  return scoredActions[0];
}

// Given a `praxishState` and a `possibleAction`, compute a full list
// of `influences` that should guide prioritization of this action.
Swaygent.computeInfluences = function(praxishState, possibleAction) {
  const practiceDef = praxishState.practiceDefs[possibleAction.practiceID];
  const actionDef = practiceDef.actions.find(act => act.name === possibleAction.actionID);
  const allInfluences = [];
  for (const influenceRule of actionDef.influences || []) {
    // FIXME Should we redefine the `possibleAction` shape to cleanly separate bindings
    // from `practiceID`, `actionID`, `instanceID`, `name`, and other metadata? Right now
    // we just pass in the whole `possibleAction` as initial bindings to the query below,
    // which means we're mixing together actual lvars and metadata.
    const instances = Praxish.query(praxishState.db, influenceRule.conditions, possibleAction);
    for (const instance of instances) {
      allInfluences.push({rule: influenceRule, bindings: instance});
    }
  }
  return allInfluences;
}

// Given a `praxishState` and an `actor`, compute a full list of `volitions`
// that should guide this actor's decision-making.
Swaygent.computeVolitions = function(praxishState, actor) {
  const allVolitions = [];
  for (const practiceID of Object.keys(praxishState.db.practice)) {
    const practiceDef = praxishState.practiceDefs[practiceID];
    for (const volitionRule of practiceDef.volitions || []) {
      // Query for applicable instances of this volition rule.
      const instances = Praxish.query(praxishState.db, volitionRule.actor, {Actor: actor});
      for (const instance of instances) {
        allVolitions.push({practiceID, rule: volitionRule, bindings: instance});
        // FIXME Add `conditions`, i.e., the ground `after` query of the volition rule?
      }
    }
  }
  return allVolitions;
}

// Given an exclusion logic `db` and a list of actor `volitions`,
// return a numeric evaluation of the situation represented by the `db`
// in terms of these `volitions`.
Swaygent.evaluate = function(db, volitions) {
  let score = 0;
  for (const volition of volitions) {
    const results = Praxish.query(db, volition.rule.wants, volition.bindings);
    if (typeof volition.rule.score === "string") {
      // Assume it's a numeric-valued lvar whose value is in `bindings`.
      // FIXME Support `lvar * constant`, and/or more complex numeric exprs?
      score += sum(results.map(res => parseInt(res[volition.rule.score])));
    }
    else if (typeof volition.rule.score === "number") {
      // Assume it's a fixed numeric amount per result.
      score += (volition.rule.score * results.length);
    }
    else {
      console.warn("Invalid `score` for volition", volition);
    }
  }
  return score;
}

// Given a list of action `influences`, return a string representing the
// priority tier of the action subject to these influences.
Swaygent.prioritize = function(influences) {
  if (influences.length === 0) return "fine";
  const tiers = ["forbidden", "required", "likelier", "unlikelier"];
  const tierIndex = Math.min(influences.map(inf => tiers.indexOf(inf.rule.priority)));
  return tiers[tierIndex];
}

// Given a `praxishState` and an `actor`, return a list of possible actions
// that the `actor` can perform, sorted first by a symbolic `priority` property
// representing the priority level of each action and second by a numeric
// `score` property representing how much utility the `actor` can expect to get
// from performing each action.
Swaygent.scoreActions = function(praxishState, actor) {
  let possibleActions = Praxish.getAllPossibleActions(praxishState, actor.name);
  // For practice-bound actors, filter possible actions to just those from the bound practice.
  // FIXME We should probably move this logic into `Praxish.getAllPossibleActions`
  // so that we don't waste time generating actions that will never be performed.
  if (actor.boundToPractice) {
    possibleActions = possibleActions.filter(pa => pa.practiceID === actor.boundToPractice);
  }
  // Bail out early if no possible actions.
  if (possibleActions.length === 0) return null;
  // Calculate volitions for the acting character.
  const volitions = Swaygent.computeVolitions(praxishState, actor.name);
  // Assign each possible action a `priority` (derived from action-level influence rules)
  // and a `score` (derived from volitional evaluation of the outcome of speculatively
  // performing this action).
  for (const possibleAction of possibleActions) {
    // Influence part: compute active influences, then prioritize accordingly.
    const influences = Swaygent.computeInfluences(praxishState, possibleAction);
    possibleAction.priority = Swaygent.prioritize(influences);
    // FIXME Bail out early here if priority is `forbidden`?
    // Volition part: speculatively perform action, then evaluate outcome.
    const prevDB = clone(praxishState.db);
    Praxish.performAction(praxishState, possibleAction);
    possibleAction.stateText = renderStateToText(praxishState); // FIXME uses a function Swaygent shouldn't have
    possibleAction.score = Swaygent.evaluate(praxishState.db, volitions);
    praxishState.db = prevDB;
  }
  // Sort actions by priority, then score, and return the sorted list.
  // FIXME Explicitly filter out `forbidden` actions here?
  const tiers = ["required", "likelier", "fine", "unlikelier", "forbidden"];
  possibleActions.sort((a, b) => {
    const prioritySort = tiers.indexOf(a.priority) - tiers.indexOf(b.priority);
    const utilitySort = b.score - a.score;
    return prioritySort || utilitySort;
  });
  return possibleActions;
}
