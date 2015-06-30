
var guid = require('./guid');

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

//slice ...
//prefix ...

module.exports = List;