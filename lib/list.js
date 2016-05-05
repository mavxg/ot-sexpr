
var guid = require('./guid');
var Symbol = require('./symbol');
var AttributedString = require('./string');

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
List.prototype.head = function() {
	return this.values[0];
};
List.prototype.tail = function() {
	return this.values.slice(1);
};
List.prototype._build_cache = function() {
	var id_cache = {};
	var index_cache = {};
	var offset = 1;
	for (var i = 0; i < this.values.length; i++) {
		var c = this.values[i];
		var n = {node:c, offset:offset};
		if (c instanceof List)
			id_cache[c.id] = n;
		index_cache[i] = n;
		offset += (typeof c.toSexpr === 'function') ? c.size : 1;
	};
	this._id_cache = id_cache;
	this._index_cache = index_cache;
	return this;
};
List.prototype.textContent = function() {
	if (!this._textContent) {
		var ts = [];
		this.values.forEach(function(x) {
			if (typeof x.textContent === 'function')
				ts.push(x.textContent());
		});
		this._textContent = ts.join(' '); //space or not?
	}
	return this._textContent;
};
List.prototype.nodeById = function(id) {
	if (!this._id_cache)
		this._build_cache();
	return this._id_cache[id];
};
List.prototype.nodeByPath = function(path) {
	var node = this;
	var offset = 0;
	//assume that the first element in the path is us
	for (var i = 1; i < path.length; i++) {
		var id = path[i];
		var x = node.nodeById(id);
		node = x.node;
		offset += x.offset;
	};
	return {node:node, offset:offset};
};
List.prototype.nodeByIndex = function(index) {
	if (!this._index_cache)
		this._build_cache();
	return this._index_cache[index];
};
//(p)
//returns {node:..., offset:..., index:..., type: ...}
// where offset is the remainder
List.prototype.nodeAt = function(point, parent) {
	var ret =  {node:this, offset:point, type:"list"};
	if (parent)
		ret.parent = parent;
	if (point === 0) return ret;
	if (point >= this.size) throw "Point outside of node";
	var offset = 1; //skip over the up
	var i;

	for (i = 0; i < this.values.length && offset <= point; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset <= point && offset + n > point) {
			if (n === 1) {
				return {node:c, offset:0, index:i, parent:this};
			} else if (typeof c.nodeAt === 'function') {
				return c.nodeAt(point-offset, this);
			} else {
				throw "We shouldn't get here. (1)"
			}
		}
		offset += n;
	};
	return ret;
};
List.prototype.type = "list";
List.prototype.nodesAt = function(point, _start, _ret) {
	var ret = _ret || [];
	var start = _start || 0;
	ret.push({node:this, point:start, type:"list"});
	if (point === 0) return ret;
	if (point >= this.size) throw "Point outside of node";
	var offset = 1; //skip over the up
	var i;

	for (i = 0; i < this.values.length && offset <= point; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset <= point && offset + n > point) {
			if (n === 1) {
				ret.push({node:c, point:(start+offset), type:"atom"});
				return ret;
			} else if (typeof c.nodeAt === 'function') {
				return c.nodesAt(point-offset, start+offset, ret);
			} else {
				throw "We shouldn't get here. (1)"
			}
		}
		offset += n;
	};
	return ret;
};
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
	for (var k in attributes)
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
List.prototype.isText = function(point) {
	if (point < 1 || point >= this.size) return false;
	var offset = 1;
	for (var i = 0; i < this.values.length && offset < point; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset < point && offset + n > point)
			return (typeof c.isText === 'function' && c.isText(point - offset));
		offset += n;
	};
	return false;
};
//returns an array of attributes at point
// {node:...,  type:...,  attributes:...}
List.prototype.attributesAt = function(point, ret) {
	ret = ret || [];
	ret.push({node:this, type:"list", attributes:this.attributes});
	if (point === 0) return ret;
	if (point >= this.size) throw "Point outside of node";
	var i;
	var offset = 1;

	for (i = 0; i < this.values.length && offset <= point; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset <= point && offset + n > point) {
			if (n === 1) {
				return ret;
			} else if (typeof c.attributesAt === 'function') {
				return c.attributesAt(point-offset, ret);
			} else {
				throw "We shouldn't get here. (1)"
			}
		}
		offset += n;
	};
	return ret;
};

module.exports = List;