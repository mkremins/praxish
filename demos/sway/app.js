/// Define UI

const e = React.createElement;

const appState = {
  chars: appDomainChars,
  actorIdx: -1,
  turns: [],
};

let root = null;
function renderUI() {
  if (!root) {
    root = ReactDOM.createRoot(document.getElementById("app"));
  }
  root.render(e(App, appState));
}

function CharactersPanel(props) {
  return e("div", {id: "chars-panel"},
    e("h2", {}, "Characters"),
    e("p", {className: "explainer"},
      ["Checked characters are player characters. ",
       "On a player character's turn, simulation will pause ",
       "until the player selects an action for the character to perform."],
    ),
    e("div", {id: "chars-checkboxes"},
      props.chars.map((char, idx) => {
        return e("div", {className: "char-checkbox", key: char.name},
          e("input", {
            type: "checkbox",
            checked: char.isPlayer,
            onChange: ev => {
              appState.chars[idx].isPlayer = ev.target.checked;
              renderUI();
            }
          }),
          e("span", {
            onClick: () => {
              const currentState = appState.chars[idx].isPlayer;
              appState.chars[idx].isPlayer = !currentState;
              renderUI();
            }
          }, char.name)
        );
      })
    ),
    e("button", {
      onClick: () => {
        appState.chars.forEach(char => { char.isPlayer = true; });
        renderUI();
      }
    }, "Mark all as players"),
    e("button", {
      onClick: () => {
        appState.chars.forEach(char => { char.isPlayer = false; });
        renderUI();
      }
    }, "Mark all as NPCs"),
  );
}

function Turn(props) {
  const actorType = props.isPlayer ? "player" : "NPC";
  const completionState = props.actionIdx === undefined ? "incomplete" : "complete";
  return e("div", {className: `turn ${actorType} ${completionState}`},
    e("h3", {}, `Turn ${props.turnID} by ${props.actor.name} (${actorType})`),
    e("div", {className: "actions-list"},
      props.actions.map((action, actionIdx) => {
        const wasChosen = actionIdx === props.actionIdx;
        if (completionState === "complete" && props.isCollapsed && !wasChosen) return null;
        return e("div", {
            className: `action${wasChosen?" chosen":""}`,
            key: action.name,
            onClick: () => {
              // when the player clicks an action on an untaken turn, perform that action
              if (props.actionIdx !== undefined) return;
              actuallyDoAction(appState, appPraxishState, props.turnID, actionIdx);
            }
          },
          e("h4", {}, action.name),
          e("div", {className: "tags-list"},
            e("span", {className: `tag priority ${action.priority}`}, action.priority || "normal"),
            e("span", {className: "tag score"}, action.score),
          ),
          e("ul", {className: "sways-list"},
            action.sways.map((sway, swayIdx) => {
              return e("li", {className: "sway", key: swayIdx},
                `${sway.type}: ${sway.name} (${sway.score || 0}, ${sway.rule.priority || "normal"})`
              )
            })
          )
        )
      }),
      (!props.isCollapsed ? props.impossibleActions.map((action, actionIdx) => {
        return e("div", {className: "action impossible", key: action.actionID},
          e("h4", {}, action.actionID),
          e("div", {className: "tags-list"},
            e("span", {className: "tag why-not"}, action.killedBy),
          ),
        );
      }) : null),
    ),
    props.dbDiff ? e("div", {className: "db-diff"},
      props.dbDiff.removed.map(sent => e("div", {className: "removed", key: sent}, `- ${sent}`)),
      props.dbDiff.added.map(sent => e("div", {className: "added", key: sent}, `+ ${sent}`)),
    ) : null,
    (completionState === "complete") ? e("button", {
      onClick: () => {
        appState.turns[props.turnID].isCollapsed = !props.isCollapsed;
        renderUI();
      }
    }, props.isCollapsed ? "Show alternatives" : "Hide alternatives") : null
  );
}

function TurnsTranscript(props) {
  return e("div", {id: "turns-transcript"},
    e("h2", {}, "Turns"),
    props.turns.map(turn => e(Turn, {key: turn.turnID, ...turn}))
  );
}

function App(props) {
  return e("div", {className: "app-wrapper"},
    e(CharactersPanel, props),
    e(TurnsTranscript, props),
  );
}

renderUI();

/// Define game loop

function setUpTurn(appState, praxishState) {
  const turnID = appState.turns.length;
  appState.actorIdx = advanceCursor(appState.actorIdx, appState.chars);
  const actor = appState.chars[appState.actorIdx];
  const possibleActions = Swaygent.scoreActions(praxishState, actor);
  const impossibleActions = possibleActions.impossibleActions;
  console.log("impossibleActions", impossibleActions);
  return {
    turnID, actor, isPlayer: actor.isPlayer,
    actions: possibleActions, impossibleActions,
  };
}

function actuallyDoAction(appState, praxishState, turnID, actionIdx) {
  // find the current turn and mark the action performed
  const turn = appState.turns.find(turn => turn.turnID === turnID);
  turn.actionIdx = actionIdx;
  const action = turn.actions[actionIdx];
  console.log("Performing action :: ", action);
  // cache old DB for a sec, perform the action, save the diff
  const prevDB = clone(praxishState.db);
  Praxish.performAction(praxishState, action);
  const diff = DB.diff(prevDB, praxishState.db);
  turn.dbDiff = {added: Array.from(diff.added), removed: Array.from(diff.removed)};
  // render UI and resume simulation
  renderUI();
  requestAnimationFrame(tick);
}

function selectNPCAction(turn) {
  let action = null; // Predeclare for later reassignment
  // Priority pass: permit only top-priority actions to be picked.
  const topPriority = turn.actions[0].priority;
  const topPriorityActions = takeWhile(act => act.priority === topPriority, turn.actions);
  // Positive score pass: restrict to positive-score actions if at all possible.
  const positiveScoreActions = takeWhile(act => act.score > 0, topPriorityActions);
  if (positiveScoreActions.length > 0) {
    // Top-k pass: restrict to a few of the highest-scoring actions.
    const k = 3; // Use `topPriorityActions.length` if you don't want a top-k cutoff
    const topKActions = topPriorityActions.slice(0, k);
    // Weighted random pass: select an action using weighted random choice.
    // Weights are given by the top k actions' (uniformly positive) scores,
    // self-multiplied to bias selection in favor of higher-scoring actions.
    action = weightedRandomChoice(topKActions, act => Math.pow(act.score, 3));
  }
  else {
    // Top-score pass: there are no positive-score actions, so grab the score
    // of the *least bad* possible action and restrict to actions that are tied
    // for that score.
    const topScore = topPriorityActions[0].score;
    const topScoringActions = takeWhile(act => act.score === topScore, topPriorityActions);
    // Uniform random pass: select a random top-scoring action.
    action = randNth(topScoringActions);
  }
  return turn.actions.indexOf(action);
}

function tick() {
  const turn = setUpTurn(appState, appPraxishState);
  appState.turns.push(turn);
  // FIXME If `turn.actions` is empty, what's the bare minimum way to continue?
  // Insert an empty transcript entry and proceed?
  if (turn.actor.isPlayer) {
    renderUI();
  }
  else {
    turn.isCollapsed = true;
    const actionIdx = selectNPCAction(turn);
    actuallyDoAction(appState, appPraxishState, turn.turnID, actionIdx);
  }
}

tick();
