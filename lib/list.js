
var guid = require('./guid');
var Symbol = require('./symbol');

function List(id, attributes) {
	this.id = id || guid();
	this.values = [];
	this.length = 0;
	this.size = 2; //an empty sexpr has size 2 because that is how many cursor positions it adds (.).
	if (attributes && Object.keys(attributes).length > 0) this.attributes = attributes;
}

function _toSexpr(obj) {
	if (obj.toSexpr) return obj.toSexpr();
	return JSON.stringify(obj);
}

List.prototype.toSexpr = function() {
	var ret = '(' + this.values.map(_toSexpr).join(' ') + ')';
	if (this.attributes)
		return JSON.stringify(this.attributes) + ret;
	return ret;
};
List.prototype.push = function(v) {
	this.values.push(v);
	this.length++;
	this.size += (v.size || 1);
	return this; //for chaining
};
List.prototype.index = function(index) {
	return this.values[index];
};
List.prototype.setAttributes = function(attributes) {
	var na = {}
	var a = this.attributes;
	for (var k in a)
		na[k] = a[k];
	for (var k in attributes);
		na[k] = attributes[k];
	var n = new List(this.id, na);
	n.size = this.size;
	n.length = this.length;
	n.values = this.values;
	return n;
};
List.prototype.unsetAttributes = function(attributes) {
	var na = {}
	var a = this.attributes;
	for (var k in a)
		if (!attributes.hasOwnProperty(k))
			na[k] = a[k];
	var n = new List(this.id, na);
	n.size = this.size;
	n.length = this.length;
	n.values = this.values;
	return n;
};
//return the prefixed document in this region
List.prototype.prefix = function(start, end) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var pre = [];
	var offset = 1; //skip the push

	if (_start === _end) return pre;
	if (_start === 0)
		pre.push({op:'insert', value:"list", type:"push", n:1, attributes:this.attributes});

	for (var i = 0; i < this.values.length; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset < _end && offset + n > _start) {
			if (typeof c.prefix === 'function') {
				var ps = c.prefix(_start - offset,_end - offset);
				for (var j = 0; j < ps.length; j++) {
					pre.push(ps[j]);
				};
			} else {
				pre.push({op:'insert', value:JSON.stringify(c), type:"obj", n:1});
			}
		}
		offset += n;
	};

	if (_end === this.size)
		pre.push({op:'insert', type:"pop", n:1});

};

//slice ...
//prefix ...

module.exports = List;