
var AttributedString = require('../string');

module.exports = function(ot) {

var UNDEFINED;
var ops = ot.operations;
var push = ot._push;

AttributedString.prototype.prefix = function(start, end, op) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var pre = [];

	op = op || ops.insert;

	if (_start === _end) return pre;
	if (_start === 0)
		pre.push(op("string","push"));

	var subs = (_start <= 1 && _end >= (this.size - 1)) ? this : this.slice(_start - 1,_end - 1);
	var chunks = subs.chunk();

	//turn chunks into inserts
	for (var i = 0; i < chunks.length; i++) {
		var chunk = chunks[i];
		pre.push(op(chunk.str, 'char', chunk.attributes));
	};

	if (_end === this.size)
		pre.push(op("string", 'pop'));

	return pre;
};
//generate delete operations for given region
AttributedString.prototype._delete = function(start, end) {
	if (start === undefined) start = 0;
	if (end === undefined) end = this.size;
	return this.prefix(start, end, ops.delete);
};
//generate insert operations for given region
AttributedString.prototype._insert = function(start, end) {
	if (start === undefined) start = 0;
	if (end === undefined) end = this.size;
	return this.prefix(start, end, ops.insert);
};
AttributedString.prototype._diff = function(other) {
	if (target === this) return [ops.retain(this.size)];
	var result;
	//TODO: string diff.
	result = this._delete();
	if (typeof target._insert === 'function') {
		result = result.concat(target._insert());
	} else {
		result.push(_d(JSON.stringify(target),'obj'));
	}
	return result;
};
AttributedString.prototype._reattributeText = function(start, end, attributes, unattributes, ret) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var offset = 1;

	if (_start === _end) return ret;
	if (_start === 0)
		push(ret, ops.retain(1));

	var subs = (_start <= 1 && _end >= (this.size - 1)) ? this : this.slice(_start - 1,_end - 1);
	var chunks = subs.chunk();

	for (var i = 0; i < chunks.length; i++) {
		var chunk = chunks[i];
		var l = chunk.str.length;
		var aa = {};
		var ua = {};
		var a = chunk.attributes;
		for (var k in attributes) {
			if (a.hasOwnProperty(k)) {
				if (a[k] !== attributes[k]) {
					ua[k] = a[k];
					aa[k] = attributes[k];
				}
			} else {
				aa[k] = attributes[k];
			}
		}
		for (var k in unattributes)
			if (a[k] === unattributes[k])
				ua[k] = a[k];
		if (Object.keys(aa).length === 0) aa = UNDEFINED;
		if (Object.keys(ua).length === 0) ua = UNDEFINED;
		push(ret, ops.retain(l, aa, ua));
	};

	if (_end === this.size)
		push(ret, ops.retain(1))
};

};