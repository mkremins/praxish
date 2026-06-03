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
        return e("div", {className: "char-checkbox"},
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
            action.sways.map(sway => {
              return e("li", {className: "sway"},
                `${sway.type}: ${sway.name} (${sway.score || 0}, ${sway.priority || "normal"})`
              )
            })
          )
        )
      })
    ),
    props.dbDiff ? e("div", {className: "db-diff"},
      props.dbDiff.removed.map(sent => e("div", {className: "removed"}, `- ${sent}`)),
      props.dbDiff.added.map(sent => e("div", {className: "added"}, `+ ${sent}`)),
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
    props.turns.map(turn => e(Turn, turn))
  );
}

function App(props) {
  return [
    e(CharactersPanel, props),
    e(TurnsTranscript, props),
  ];
}

renderUI();

/// Define game loop

function setUpTurn(appState, praxishState) {
  const turnID = appState.turns.length;
  appState.actorIdx = advanceCursor(appState.actorIdx, appState.chars);
  const actor = appState.chars[appState.actorIdx];
  const possibleActions = Swaygent.scoreActions(praxishState, actor);
  return {turnID, actor, isPlayer: actor.isPlayer, actions: possibleActions};
}

function actuallyDoAction(appState, praxishState, turnID, actionIdx) {
  // find the current turn and mark the action performed
  const turn = appState.turns.find(turn => turn.turnID === turnID);
  turn.actionIdx = actionIdx;
  // cache old DB for a sec, perform the action, save the diff
  const prevDB = clone(praxishState.db);
  Praxish.performAction(praxishState, turn.actions[actionIdx]);
  const diff = DB.diff(prevDB, praxishState.db);
  turn.dbDiff = {added: Array.from(diff.added), removed: Array.from(diff.removed)};
  // render UI and resume simulation
  renderUI();
  requestAnimationFrame(tick);
}

function tick() {
  const turn = setUpTurn(appState, appPraxishState);
  appState.turns.push(turn);
  if (turn.actor.isPlayer) {
    renderUI();
  }
  else {
    turn.isCollapsed = true;
    actuallyDoAction(appState, appPraxishState, turn.turnID, 0);
  }
}

tick();
