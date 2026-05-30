/// Set up run loop

const queryInput = document.getElementById("query");
const topActionsDiv = document.getElementById("priorityactions");
const actionButtonsDiv = document.getElementById("otheractions");
const transcriptDiv = document.getElementById("transcript");

const playerActorIdx = 0; // player actor is first
let pausedForPlayer = false; // start unpaused

function prettifyName(name) {
  return nameRenderers[name] || name;
}

function renderStateToText(praxishState) {
  let allOutputSentences = [];
  for (const [query, template] of sentenceRenderers) {
    const results = DB.unify(query, praxishState.db, {});
    for (const res of results) {
      for (const [key, val] of Object.entries(res)) {
        res[key] = prettifyName(val);
      }
    }
    const sents = results.map(res => capitalizeFirst(Praxish.renderText(template, res)));
    allOutputSentences = allOutputSentences.concat(sents);
  }
  return allOutputSentences.join(". ") + (allOutputSentences.length > 0 ? "." : "");
}

function actuallyDoAction(praxishState, action) {
  console.log("Performing action ::", action.name, action);
  Praxish.performAction(praxishState, action);
  const actionHTML = `<div class="action">
    <span class="actorname">${capitalizeFirst(prettifyName(action.Actor))}:</span>
    <span class="actionname">${action.cleanName}</span><br>
    <div class="statetext">${renderStateToText(praxishState)}</div>
  </div>`;
  transcriptDiv.innerHTML = actionHTML + transcriptDiv.innerHTML;
}

function makeActionButton(praxishState, action) {
  const button = document.createElement("button");
  button.innerText = action.cleanName;
  button.onclick = ev => {
    // Perform the action
    actuallyDoAction(praxishState, action);
    // Clear the top actions
    topActionsDiv.innerHTML = "";
    // Redisplay the waiting-for-NPCs message
    actionButtonsDiv.innerHTML = `<span id="waitmsg">waiting for player's turn...</span>`;
    // Unpause the tick loop
    pausedForPlayer = false;
  };
  return button;
}

async function rankActions(possibleActions, query) {
  const queryEmb = await embed(query);
  for (const action of possibleActions) {
    const actionStr = `${action.cleanName} (${action.practiceID})`;
    const actionEmb = await embed(actionStr);
    action.pwimScore = cosineSimilarity(actionEmb, queryEmb);
  }
  possibleActions.sort((a, b) => b.pwimScore - a.pwimScore);
  return possibleActions;
}

async function submitPWIMQuery(praxishState, possibleActions) {
  // get query from text input
  const query = queryInput.value;
  queryInput.value = "";
  // get ranked actions
  const rankedActions = await rankActions(possibleActions, query);
  console.log("ranked actions", rankedActions);
  // update UI to reflect the ranked actions
  const numTopActions = 3;
  const topActions = rankedActions.slice(0, numTopActions);
  const otherActions = rankedActions.slice(numTopActions);
  const highestPWIMScore = rankedActions[0].pwimScore;
  const lowestPWIMScore = rankedActions[rankedActions.length - 1].pwimScore;
  topActionsDiv.innerHTML = "";
  for (const topAction of topActions) {
    const bgcolor = scale(
      topAction.pwimScore,
      [lowestPWIMScore, highestPWIMScore],
      [170, 0]
    );
    const button = makeActionButton(praxishState, topAction);
    button.style.backgroundColor = `rgb(${bgcolor},${bgcolor},${bgcolor})`;
    topActionsDiv.append(button);
  }
  topActionsDiv.firstChild.focus(); // focus the first top-action button
  const actionButtonsDiv = document.getElementById("otheractions");
  actionButtonsDiv.innerHTML = "";
  for (const fallbackAction of otherActions) {
    const bgcolor = scale(
      fallbackAction.pwimScore,
      [lowestPWIMScore, highestPWIMScore],
      [170, 0]
    );
    const button = makeActionButton(praxishState, fallbackAction);
    button.style.backgroundColor = `rgb(${bgcolor},${bgcolor},${bgcolor})`;
    actionButtonsDiv.append(button);
  }
}

// Given an `action`, assign it a `cleanName` property:
// a string that names the action but doesn't include the actor name as a prefix,
// to be displayed in the user interface.
// FIXME Push this up into Praxish core instead of prepending actor name by default?
function assignCleanName(action) {
  const [actorName, ...actionNameParts] = action.name.split(":");
  const actionName = actionNameParts.join(":").trim();
  action.cleanName = actionName;
}

// Given a `praxishState`, determine whose turn it is to act,
// select an action for that character to perform, and perform the action.
function tick(praxishState) {
  // Bail out early if we're waiting on the player to act.
  if (pausedForPlayer) return;
  // Figure out whose turn it is to act. For now, turntaking will just be simple round-robin.
  praxishState.actorIdx = advanceCursor(praxishState.actorIdx, praxishState.allChars);
  const actor = praxishState.allChars[praxishState.actorIdx];
  // If this is a player actor, populate the UI with possible actions
  // and wait for the player to pick one.
  // Otherwise, pick and perform a reasonable action autonomously.
  if (praxishState.actorIdx === playerActorIdx) {
    // Pause and wait for the player to act
    pausedForPlayer = true;
    // Focus the query input
    queryInput.focus();
    // Generate a list of possible actions
    const possibleActions = Praxish.getAllPossibleActions(praxishState, actor.name);
    // Assign each action a "clean name" that doesn't include the actor name as a prefix.
    // FIXME Push this up into Praxish core instead of prepending actor name by default?
    possibleActions.forEach(assignCleanName);
    // Update the query submit button to incorporate the current `possibleActions`,
    // and attach the same behavior to the Enter key on the query input
    const submitQueryButton = document.getElementById("submit");
    submitQueryButton.onclick = () => submitPWIMQuery(praxishState, possibleActions);
    queryInput.onkeyup = ev => {
      if (ev.key !== "Enter") return;
      submitQueryButton.click();
    };
    // Render an input (button?) for each of the `possibleActions`
    actionButtonsDiv.innerHTML = "";
    for (const possibleAction of possibleActions) {
      const button = makeActionButton(praxishState, possibleAction);
      actionButtonsDiv.appendChild(button);
    }
  }
  else {
    const scoredActions = Planner.scoreActions(praxishState, actor, 2);
    console.log("scoredActions", scoredActions);
    const actionToPerform = Planner.pickAction(scoredActions);
    if (!actionToPerform) {
      console.warn("No actions to perform", actor.name);
      return;
    }
    assignCleanName(actionToPerform);
    actuallyDoAction(praxishState, actionToPerform);
  }
}

/// Kick off the run loop

window.setInterval(() => tick(appPraxishState), 1000);
