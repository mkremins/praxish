// Step the `cursor` forward through the `list`,
// cycling back to 0 if it would fall off the end.
function advanceCursor(cursor, list) {
  let nextCursor = cursor + 1;
  if (nextCursor >= list.length) {
    nextCursor = 0;
  }
  return nextCursor;
}

// Capitalize the first character of `str`.
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Return a (deep) clone of any JSON-compatible `obj`.
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Return whether the character `c` is an uppercase letter.
function isUppercase(c) {
  return /[A-Z]/.test(c);
}

// Return a random item from a list.
function randNth(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Translate `num` from the scale bounded by `oldMin` and `oldMax`
// to the scale bounded by `newMin` and `newMax`.
function scale(num, [oldMin, oldMax], [newMin, newMax]) {
  const oldRange = oldMax - oldMin;
  const newRange = newMax - newMin;
  return (((num - oldMin) / oldRange) * newRange) + newMin;
}

// Sum `xs`, a list of numbers, and return the result.
function sum(xs) {
  return xs.reduce((a, b) => a + b, 0);
}

// Return the prefix of `items` for which `pred` is consistently truthy.
function takeWhile(pred, items) {
  const prefix = [];
  for (const item of items) {
    if (!pred(item)) break;
    prefix.push(item);
  }
  return prefix;
}

// Return a weighted random choice from a list of `items`,
// with weights given by `weightFn`.
function weightedRandomChoice(items, weightFn) {
  const r = Math.random();
  const itemsWithWeights = items.map(item => ({item, weight: weightFn(item)}));
  const totalWeight = sum(itemsWithWeights.map(x => x.weight));
  let threshold = 0;
  for (const {item, weight} of itemsWithWeights) {
    threshold += weight / totalWeight;
    if (r <= threshold) return item;
  }
  return null; // Should never get here!
}
