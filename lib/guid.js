
var _seed = 0;
function guid() {
	return ++_seed;
}

module.exports = guid;