var ot = require('./operations');

function _size(node) {
	return (typeof node.toSexpr === 'function') ? node.size : 1;
}
//TODO: move this to the ot-sexpr library
function Visitor(doc) {
	this.stack = [];
	this.parent = doc; //always a list item
	this.node = doc.head();
	this.index = 0;
	this.point = 1;
	this.retained = 0;
	this.ops = []; //to get to the doc
}
Visitor.prototype.next = function() {
	//retain to next child depth first.
	return this.push() || this.nextSibling() || this.pop();
};
Visitor.prototype.nextSibling = function() {
	if (this.index >= (this.parent.length - 1)) return;
	var n = _size(this.node);
	this.point += n;
	this.index += 1;
	this.node = this.parent.index(this.index);
	return this.node;
};
Visitor.prototype.peekSibling = function() {
	return this.parent.index(this.index + 1);
};
Visitor.prototype.push = function() {
	if (!this.node ||
		this.node.type !== 'list' ||
		this.node.length === 0) return;
	this.stack.push({parent:this.parent,index:this.index});
	this.point += 1;
	this.parent = this.node;
	this.index = 0;
	this.node = this.parent.head();
	return this.node;
};
Visitor.prototype.pop = function() {
	if (this.stack.length === 0) return;
	//keep poping until we have a node.
	// or we run out of stack.
	var t;
	while ((t=this.stack.pop())) {
		//get to the end of the node first
		for (;this.index < this.parent.length; this.index++) {
			var n = _size(this.node);
			this.point += n;
		}
		this.point += 1; //retain the pop
		this.index = t.index + 1;
		this.parent = t.parent;
		if (this.index < this.parent.length) {
			//have a real node.
			this.node = this.parent.index(this.index);
			return this.node;
		}
		//no more nodes left in parent - pop again.
	}
	return;
};
Visitor.prototype.insert = function(ops) {
	var ourops = this.ops;
	function _push(op) { ot._push(ourops, op); }
	//retain existing
	if (this.retained < this.point) {
		_push(ot.operations.retain(this.point - this.retained));
		this.retained = this.point;
	}
	ops.forEach(_push);
};
Visitor.prototype.insertAfter = function(ops) {
	if (this.index >= this.parent.length)
		return this.insert(ops);
	var n = _size(this.node);
	var ourops = this.ops;
	function _push(op) { ot._push(ourops, op); }
	//retain existing
	if (this.retained < this.point + n) {
		_push(ot.operations.retain(this.point + n - this.retained));
		this.retained = this.point + n;
	}
	ops.forEach(_push);
};
Visitor.prototype.retain = function(n) {
	var target = this.point + n;
	//retain existing plus n
	if (this.retained < target) {
		ot._push(this.ops, ot.operations.retain(target - this.retained));
		this.retained = target;
	}
};
Visitor.prototype['delete'] = function() {
	var ourops = this.ops;
	function _push(op) { ot._push(ourops, op); }
	//retain existing
	if (this.retained < this.point) {
		_push(ot.operations.retain(this.point - this.retained));
		this.retained = this.point;
	}
	//delete node and next
	var n = 1;
	if (typeof this.node.prefix === 'function') {
		n = this.node.size;
		this.node.prefix(0,n,ot.operations.delete).forEach(_push);
	} else {
		//delete atom
		_push(ot.operations.delete(JSON.stringify(this.node),'obj'));
	}
	this.retained += n;
	return this.next();
};
Visitor.prototype.deleteChars = function(chars) {
	console.log("deleteChars: " + chars)
	var ourops = this.ops;
	function _push(op) { ot._push(ourops, op); }
	//retain existing
	if (this.retained < this.point) {
		_push(ot.operations.retain(this.point - this.retained));
		this.retained = this.point;
	}
	//TODO
	_push(ot.operations.delete(chars,'char'));
	this.retained += chars.length;
};
Visitor.prototype.replace = function(val, type, attributes) {
	//this.insert([ot.operations.start]); //start critical
	var ret = this['delete']();
	this.insert([ot.operations.insert(val, type, attributes)]); //,ot.operations.end]); //end critical
	return ret;
};

module.exports = Visitor;
