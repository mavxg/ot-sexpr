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
Symbol.prototype.prefix = function(start, end) {
	if (start <= 0 && end >= 1)
		return [{op:'insert', value:this.sym, type:'sym', n:1}];
	return [];
};

Symbol.sym = sym;

module.exports = Symbol;