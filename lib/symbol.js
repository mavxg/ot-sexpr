var _global_symbol_table = {};
function sym(s) {
	var x = _global_symbol_table[s];
	if (x) return x;
	x = new Symbol(s);
	_global_symbol_table[s] = x;
	return x;
}

function Symbol(s) {
	this.sym = s;
}
Symbol.prototype.toJSON = Symbol.prototype.toSexpr = function() { return this.sym; };
Symbol.prototype.size = 1;

Symbol.sym = sym;

module.exports = Symbol;