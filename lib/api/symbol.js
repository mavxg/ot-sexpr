var Symbol = require('../symbol');

module.exports = function(ot) {

var push = ot._push;
var ops = ot.operations;
Symbol.prototype._insert = function() {
	return [ops.insert(this.sym,'sym')];
};
Symbol.prototype._delete = function() {
	return [ops.delete(this.sym,'sym')];
};
Symbol.prototype.diff = function(target) {
	if (target === this) return [ops.retain(1)];
	var result = this._delete();
	if (typeof target._insert === 'function') {
      result = result.concat(target._insert());
    } else {
      result.push(_d(JSON.stringify(target),'obj'));
    }
    return result;
};


};