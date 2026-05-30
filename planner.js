// Declare the Planner module to which API functions will be attached.
const Planner = {};

// Given a list of `scoredActions` for a particular actor,
// return the action that the actor should actually perform.
Planner.pickAction = function(scoredActions) {
  if (!scoredActions) return null;
  return scoredActions[0];
}

// Like `pickAction`, but chooses non-deterministically
// between highly scoring actions to add variety.
// Non-determinism complicates debugging and confuses the planner
// (which limits combinatorial explosion on the turns of non-focal actors
// by considering only a single possible next action per actor-turn),
// so we've stopped using this for now.
Planner.pickActionNondeterministically = function(scoredActions) {
  if (!scoredActions) return null;
  const topScore = scoredActions[0].score;
  const firstNonTopscoringIdx = scoredActions.findIndex(pa => pa.score < topScore);
  if (firstNonTopscoringIdx > -1) {
    const bestScoringActions = scoredActions.slice(0, firstNonTopscoringIdx);
    return randNth(bestScoringActions);
  }
  return randNth(scoredActions);
}

// Given an exclusion logic `db` and a list of actor `goals`,
// return a numeric evaluation of the situation represented by the `db`
// in terms of these `goals`.
Planner.evaluate = function(db, goals) {
  let score = 0;
  for (const goal of goals) {
    const results = Praxish.query(db, goal.conditions, {});
    score += (goal.utility * results.length);
  }
  return score;
}

// Given a `praxishState`, an `actor`, and a `searchDepth` (default: 0),
// return a list of possible actions that the `actor` can perform,
// sorted by a numeric `score` property representing how much utility
// the `actor` can expect to get from performing each action.
Planner.scoreActions = function(praxishState, actor, searchDepth) {
  searchDepth = searchDepth || 0;
  let possibleActions = Praxish.getAllPossibleActions(praxishState, actor.name);
  // For practice-bound actors, filter possible actions to just those from the bound practice.
  // FIXME We should probably move this logic into `Praxish.getAllPossibleActions`
  // so that we don't waste time generating actions that will never be performed.
  if (actor.boundToPractice) {
    possibleActions = possibleActions.filter(pa => pa.practiceID === actor.boundToPractice);
  }
  // Bail out early if no possible actions.
  if (possibleActions.length === 0) return null;
  // Speculatively perform each possible action
  // and score the outcome according to the actor's goals.
  for (const possibleAction of possibleActions) {
    const prevDB = clone(praxishState.db);
    Praxish.performAction(praxishState, possibleAction);
    possibleAction.stateText = renderStateToText(praxishState); // FIXME uses a function Planner shouldn't have
    possibleAction.score = 0;
    const goals = actor.goals || [];
    possibleAction.score = Planner.evaluate(praxishState.db, goals);
    if (searchDepth > 0 && goals.length > 0) {
      // Predict what will happen in the future if we decide to take this action now,
      // and add the value of predicted future actions to this action's score.
      // First, predict what other actors might do next.
      const selfDiscountFactor = 0.9; // Weakly discount future outcomes of our own predicted actions
      const otherDiscountFactor = 0.5; // Strongly discount future outcomes of *others'* predicted actions
      const expectations = []; // Track our predictions of the future
      const prevActorIdx = praxishState.actorIdx;
      praxishState.actorIdx = advanceCursor(praxishState.actorIdx, praxishState.allChars);
      while (praxishState.actorIdx !== prevActorIdx) {
        // Figure out whose turn it is to act next
        const otherActor = praxishState.allChars[praxishState.actorIdx];
        // Predict their next action
        const possibleOtherActorActions = Planner.scoreActions(praxishState, otherActor);
        const predictedOtherActorAction = Planner.pickAction(possibleOtherActorActions);
        // Determine how good or bad this next action would be for us
        if (predictedOtherActorAction) {
          Praxish.performAction(praxishState, predictedOtherActorAction);
          const futureScore = Planner.evaluate(praxishState.db, goals);
          const discountedScore = otherDiscountFactor * futureScore;
          possibleAction.score += discountedScore;
          // Track our prediction
          expectations.push([predictedOtherActorAction.name, futureScore, discountedScore]);
        }
        // Advance to the next actor
        praxishState.actorIdx = advanceCursor(praxishState.actorIdx, praxishState.allChars);
      }
      // Then predict what *we'll* probably do next.
      // This part is recursive: it'll trigger additional rounds of prediction
      // as needed to reach the specified `searchDepth`.
      const possibleNextActions = Planner.scoreActions(praxishState, actor, searchDepth - 1);
      const predictedNextAction = Planner.pickAction(possibleNextActions);
      const futureScore = predictedNextAction?.score || 0;
      const discountedScore = selfDiscountFactor * futureScore;
      possibleAction.score += discountedScore;
      expectations.push([predictedNextAction?.name, futureScore, discountedScore]);
      possibleAction.expectations = expectations.concat(predictedNextAction.expectations || []);
    }
    praxishState.db = prevDB;
  }
  // Sort actions by score and return the sorted list.
  possibleActions.sort((a, b) => b.score - a.score);
  return possibleActions;
}
