// Return a (deep) clone of any JSON-compatible `obj`.
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Return whether the character `c` is an uppercase letter.
function isUppercase(c) {
  return /[A-Z]/.test(c);
}

// Given a single exclusion logic `sentence`, a `db`, and a `bindings` map
// containing previously established assignments of logic variables to values,
// return a list of updated `bindings` maps in which each map represents
// a possible internally consistent assignment of logic variables to values.
function unify(sentence, db, bindings) {
  let possibleWorlds = [{subtree: db, bindings: bindings}];
  const parts = sentence.trim().split(/[\.\!]/);
  for (const part of parts) {
    const nextPWs = [];
    const partIsVar = isUppercase(part[0]); // Is this logic sentence part a variable or constant?
    for (const pw of possibleWorlds) {
      const branchName = partIsVar ? pw.bindings[part] : part;
      if (partIsVar && !branchName) {
        // The current logic sentence part is a variable for which this PW has no prior binding,
        // so fork the PW and move in parallel down every branch of the PW's current subtree
        // (with an appropriate binding for this variable added to each fork).
        for (const possibleValue of Object.keys(pw.subtree)) {
          const nextBindings = clone(pw.bindings); // Careful not to share bindings between forks
          nextBindings[part] = possibleValue;
          nextPWs.push({subtree: pw.subtree[possibleValue], bindings: nextBindings});
        }
      }
      else {
        // The current logic sentence part is either a constant, or a variable for which this PW
        // already has a bound value. Therefore, we can either descend into the appropriately named
        // branch of this PW's subtree (if it exists) or just kill the PW (if it doesn't).
        const nextSubtree = pw.subtree[branchName];
        if (nextSubtree) {
          // PW has an appropriately named branch to descend into, so go ahead and descend.
          pw.subtree = nextSubtree;
          nextPWs.push(pw);
        }
        else {
          // PW has no appropriately named branch to descend into, so kill this PW
          // (implicitly, via deliberate no-op rather than adding it back to nextPWs).
        }
      }
    }
    possibleWorlds = nextPWs;
  }
  return possibleWorlds.map(pw => pw.bindings);
}

// Given a list of exclusion logic `sentences` and a `db`,
// return a list of `bindings` maps in which each map represents
// a possible internally consistent assignment of logic variables to values.
function unifyAll(sentences, db) {
  let bindingsSets = [{}];
  for (const sentence of sentences) {
    const nextBindingsSets = [];
    for (const bindings of bindingsSets) {
      const newBindingsSets = unify(sentence, db, bindings);
      for (const nextBindings of newBindingsSets) {
        nextBindingsSets.push(nextBindings);
      }
    }
    bindingsSets = nextBindingsSets;
  }
  return bindingsSets;
}

// Given a single exclusion logic `sentence` (containing no logic variables)
// and a `db`, insert the `sentence` into the `db` and return the `db`.
function insert(db, sentence) {
  let subtree = db;
  const parts = sentence.trim().match(/[^\.\!]+.?/g);
  for (const part of parts) {
    const lastChar = part.slice(-1);
    if (lastChar === "!") {
      const nonPunctPart = part.slice(0, -1);
      subtree[nonPunctPart] = {}; // Always overwrite subtree with a fresh one if using !
      // TODO I suspect the always-overwrite behavior in the previous line might be a subtle bug.
      // What if we insert foo!bar.baz and then foo!bar.meow? Should this preserve foo!bar.baz,
      // since there's still only a single foo!bar node in the database?
      // Need to look at the Praxis docs a bit more to figure out the intended semantics.
      subtree = subtree[nonPunctPart];
    }
    else if (lastChar === ".") {
      const nonPunctPart = part.slice(0, -1);
      if (!subtree[nonPunctPart]) subtree[nonPunctPart] = {};
      subtree = subtree[nonPunctPart];
    }
    else {
      subtree[part] = {};
    }
  }
  return db;
}

// Given a single exclusion logic `sentence` (containing no logic variables)
// and a `db`, retract the `sentence` from the `db` and return the `db`.
function retract(db, sentence) {
  let subtree = db;
  const parts = sentence.trim().split(/[\.\!]/);
  for (const part of parts.slice(0, -1)) {
    subtree = subtree[part] || {};
  }
  delete subtree[parts.slice(-1)[0]];
  return db;
}

// Given an exclusion logic `db`, return a list of `sentences` that present
// the `db` contents in a more straightforwardly human-readable form.
// FIXME The returned sentences use only . (and never !),
// because we don't actually track cardinality in the current DB format.
// We might want to add some sort of tracking for this in the future?
function dbToSentences(db) {
  const allSentences = [];
  for (const key of Object.keys(db)) {
    const subtreeSentences = dbToSentences(db[key]).map(s => `${key}.${s}`);
    for (const sentence of [key].concat(subtreeSentences)) {
      allSentences.push(sentence);
    }
  }
  return allSentences;
}

// Given an exclusion logic `sentence` and a map of `bindings`,
// return a grounded version of the `sentence` with variables
// from the keys of `bindings` replaced by their bound values.
function ground(sentence, bindings) {
  const parts = sentence.trim().match(/[^\.\!]+.?/g);
  const groundedParts = parts.map(part => {
    if (!isUppercase(part[0])) return part;
    const lastChar = part.slice(-1)[0];
    const hasPunct = lastChar === "!" || lastChar === ".";
    const nonPunctPart = hasPunct ? part.slice(0, -1) : part;
    const boundVal = bindings[nonPunctPart];
    if (!boundVal) console.warn("Missing binding", nonPunctPart, bindings);
    return (boundVal || nonPunctPart) + (hasPunct ? lastChar : "");
  });
  return groundedParts.join("");
}
