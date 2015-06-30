//shallow object equal
function equal(a,b) {
  if (a === b) return true;
  if (a === undefined && b !== undefined) return false;
  if (b === undefined && a !== undefined) return false;
  for (var k in a)
    if (a[k] !== b[k]) return false;
  for (var k in b)
    if (a[k] !== b[k]) return false;
  return true;
}

module.exports = {
	equal: equal,
};