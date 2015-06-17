//operations

//retain {op:'retain', n:5}
//pop {op:'pop'}
//push {op:'push', kind:[]} or {op:'push', kind:""}
//insert {op:'insert', values:[a b c]}
//insert {op:'insert', values:"text"}
//delete {op:'delete', values:[a b c]}
//delete {op:'delete', values:"text"}
// unpush, unpop


/*
TODO: we can probably optimize the apply to not make a new object it doesn't have to.

*/
var doc = "doc";
var p = "p";
var bold = "bold";

var RETAIN = "retain";
var INSERT = "insert";
var PUSH = "push";
var POP = "pop";
var DELETE = "delete";
var UNPOP = "unpop";
var UNPUSH = "unpush";

var popA = {op:POP, kind:""};
var popS = {op:POP, kind:[]};
var unpopA = {op:UNPOP, kind:""};
var unpopS = {op:UNPOP, kind:[]};

var pushA = {op:PUSH, kind:[]};
var pushS = {op:PUSH, kind:""};
var unpushA = {op:UNPUSH, kind:[]};
var unpushS = {op:UNPUSH, kind:""};


function r(n) {
	return {op:RETAIN, n:n};
}

function i(vs) {
	return {op:INSERT, values:vs};
}

function d(vs) {
	return {op:DELETE, values:vs};
}

var doca = [doc,[],[p,[],"Hello, World!"]];
var docb = [doc,[],[p,[],'Hello, ',[bold,[],'World!']]];

var opa = [r(2),[r(2),[r(7),i("Cruel "),r(6)]]];
//popS has to come where it is to put the string consumed so far into the list
var opb = [r(2),[r(2),[r(7),popS,pushA,i(["bold",[]]),pushS,r(6),popA]]];

function invert(ops) {
	function invertOp(op) {
		if (Array.isArray(op)) return invert(op);
		switch (op.op) {
			case RETAIN: return op;
			case INSERT: return d(op.values);
			case DELETE: return i(op.values);
			case PUSH:
				return (typeof op.kind === 'string') ? unpushS : unpushA;
			case POP:
				return (typeof op.kind === 'string') ? unpopS : unpopA;
			case UNPUSH: 
				return (typeof op.kind === 'string') ? pushS : pushA;
			case UNPOP:
				return (typeof op.kind === 'string') ? popS : popA;
		}
	}
	return ops.map(invertOp);
}

function compose(opA, opB) {
	//TODO
}

function transform(op1, op2, side) {
	var left = side == 'left';
	//TODO
	return op1;
}

function apply(d,ops) {
	var stack = []
	var t = [];
	var docStack = [];
	var dp = d;
	var o = 0;

	function append(vals) {
		if (typeof t === 'string') {
			t += vals
		} else {
			t = t.concat(vals);
		}
	}

	function up(opy) {
		for (var i = 0; i < opy.length; i++) {
			var op = opy[i];
			if (Array.isArray(op)) {
				//push
				stack.push(t)
				t =  (typeof dp[o] === 'string') ? "" : [];
				//unpush
				docStack.push({o:o, dp:dp});
				dp = dp[o];
				o = 0;
				//up
				up(op);
				//unpop
				var _d = docStack.pop();
				dp = _d.dp;
				o = _d.o + 1;
				//pop
				var temp = t;
				t = stack.pop();
				if (typeof t === 'string')
					t += temp;
				else
					t.push(temp);
				continue;
			}
			switch (op.op) {
				case INSERT:
					append(op.values);
					break;
				case RETAIN:
					append(dp.slice(o,o+op.n));
					o += op.n;
					break;
				case PUSH:
					stack.push(t);
					t = (typeof op.kind === 'string') ? "" : [];
					break;
				case POP:
					var temp = t;
					t = stack.pop();
					if (typeof t === 'string')
						t += temp;
					else
						t.push(temp);
					break;
				case DELETE:
					o += op.values.length;
					break;
				case UNPUSH:
					//move deeper into the doc
					docStack.push({o:o, dp:dp});
					dp = dp[o];
					o = 0;
					break;
				case UNPOP:
					//move shallower in the doc
					var _d = docStack.pop();
					dp = _d.dp;
					o = _d.o + 1;
					break;
			}
		};
	}

	up(ops);
	return t;
}