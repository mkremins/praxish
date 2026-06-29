// Declare the Swaygent module to which API functions will be attached.
const Swaygent = {};

// Given a list of `scoredActions` for a particular actor,
// return the action that the actor should actually perform.
Swaygent.pickAction = function(scoredActions) {
  if (!scoredActions) return null;
  return scoredActions[0];
}

// Given a `scoreExpr` and a map of `bindings`, return a numeric evaluation
// of the `scoreExpr` in the context of these `bindings`.
Swaygent.evaluate = function(scoreExpr, bindings) {
  if (typeof scoreExpr === "string") {
    // Assume it's a numeric-valued lvar whose value is in `bindings`.
    // FIXME Support `lvar * constant`, and/or more complex numeric exprs?
   return parseInt(bindings[scoreExpr]);
  }
  else if (typeof scoreExpr === "number") {
    // Assume it's a fixed numeric amount per result.
    return scoreExpr;
  }
  else {
    console.warn("Invalid `score` for sway", sway);
    return 0;
  }
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
      allInfluences.push({
        type: "influence", rule: influenceRule, bindings: instance,
        score: Swaygent.evaluate(influenceRule.score || 0, instance),
        name: Praxish.renderText(influenceRule.name, instance),
      });
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
    if ((practiceDef.volitions || []).length === 0) continue; // no volition rules defined
    const instancesQuery = `practice.${practiceID}.${practiceDef.roles.join(".")}`;
    const practiceInstances = DB.unify(instancesQuery, praxishState.db, {});
    for (const practiceInstance of practiceInstances) {
      for (const volitionRule of practiceDef.volitions) {
        // Query for applicable instances of this volition rule
        // in the context of a particular practice instance.
        const context = {...practiceInstance, Actor: actor};
        const volInstances = Praxish.query(praxishState.db, volitionRule.conditions, context);
        for (const instance of volInstances) {
          allVolitions.push({
            type: "volition", practiceID, rule: volitionRule, bindings: instance,
            score: Swaygent.evaluate(volitionRule.score || 0, instance),
            name: Praxish.renderText(volitionRule.name, instance),
          });
        }
      }
    }
  }
  return allVolitions;
}

// Given a list of action `sways`, return a string representing the
// priority tier of the action subject to these sways.
Swaygent.prioritize = function(sways) {
  if (sways.length === 0) return "normal";
  const tiers = ["forbidden", "required", "normal"];
  const tierIndex = Math.min(...sways.map(sway => tiers.indexOf(sway.rule.priority || "normal")));
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
  // Assign each possible action a `priority` (derived from action-level influence rules)
  // and a `score` (derived from volitional evaluation of the outcome of speculatively
  // performing this action).
  for (const possibleAction of possibleActions) {
    // Influence part: compute active influences.
    const influences = Swaygent.computeInfluences(praxishState, possibleAction);
    // Volition part: speculatively perform action, then compute active volitions.
    const prevDB = clone(praxishState.db);
    Praxish.performAction(praxishState, possibleAction);
    const volitions = Swaygent.computeVolitions(praxishState, actor.name);
    // Using full list of computed sways, determine how to score/prioritize action.
    possibleAction.sways = influences.concat(volitions);
    possibleAction.score = sum(possibleAction.sways.map(sway => sway.score));
    possibleAction.priority = Swaygent.prioritize(possibleAction.sways);
    // Restore previous DB.
    praxishState.db = prevDB;
  }
  // Sort actions by priority, then score, and return the sorted list.
  // FIXME Explicitly filter out `forbidden` actions here?
  const tiers = ["required", "normal", "forbidden"];
  possibleActions.sort((a, b) => {
    const prioritySort = tiers.indexOf(a.priority) - tiers.indexOf(b.priority);
    const utilitySort = b.score - a.score;
    return prioritySort || utilitySort;
  });
  return possibleActions;
}
