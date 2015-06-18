//operations

//retain {op:'retain', n:5}
//pop {op:'pop'}
//push {op:'push', kind:[]} or {op:'push', kind:""}
//insert {op:'insert', values:[a b c]}
//insert {op:'insert', values:"text"}
//delete {op:'delete', values:[a b c]}
//delete {op:'delete', values:"text"}
// unpush, unpop

//with linearisation we also need UP and DOWN (with kind)

//with critical regions we also need START END

var RETAIN  = "retain";
var INSERT  = "insert";
var PUSH    = "push";
var POP     = "pop";
var DELETE  = "delete";
var UNPOP   = "unpop";
var UNPUSH  = "unpush";
var UP      = "up";
var DOWN    = "down";
var START   = "start";
var END     = "end";

var pop     = {op:POP};
var unpop   = {op:UNPOP};
var pushA   = {op:PUSH, kind:[]};
var pushS   = {op:PUSH, kind:""};
var unpushA = {op:UNPUSH, kind:[]};
var unpushS = {op:UNPUSH, kind:""};

//linearisation
var upA     = {op:UP, kind:[]};
var upS     = {op:UP, kind:""};
var down    = {op:DOWN};

//critical regions
var start   = {op:START};
var end     = {op:END};

//standard text/list operations
function r(n) {
  return {op:RETAIN, n:n};
}

function i(vs) {
  return {op:INSERT, values:vs, n:vs.length};
}

function d(vs) {
  return {op:DELETE, values:vs, n:vs.length};
}

pop.toJSON = function() { return "pop"; };
unpop.toJSON = function() { return "unpop"; };
upA.toJSON = function() { return "upA"; };
upS.toJSON = function() { return "upS"; };
down.toJSON = function() { return "down"; };
pushA.toJSON = function() { return "pushA"; };
pushS.toJSON = function() { return "pushS"; };
unpushA.toJSON = function() { return "unpushA"; };
unpushS.toJSON = function() { return "unpushS"; };

//we might have the pops the wrong way up... (at the moment we don't check kind)


//RULES
// [r(a),r(b)] -> [r(a+b)]
// [i(a),i(b)] -> [i(a.concat(b))]
// [start,end] -> []
// [end,start] -> []
// [upX,r(n),down] ->[r(1)]

function _push(ops, op) {
  if (ops.length === 0)
    return ops.push(op);

  var t = ops[ops.length-1];
  switch (op.op) {
    case RETAIN:
      if (t.op === RETAIN) {
        ops.pop();
        return _push(ops, r(t.n + op.n));
      }
      break;
    case INSERT:
      if (t.op === INSERT && 
        typeof t.values === typeof op.values) {
        ops.pop();
        return _push(ops, i(t.values.concat(op.values)));
      }
      break;
    case START:
      if (t.op === END)
        return ops.pop();
      break;
    case END:
      if (t.op === START)
        return ops.pop();
      break;
    case DOWN:
      if (t.op === UP) {
        ops.pop();
        return _push(ops,r(1));
      }
      if (t.op === RETAIN && 
           ops.length > 1 && 
           ops[ops.length-2].op == UP) {
        ops.pop();
        return _push(ops, r(1));
      }
  }
  return ops.push(op);
}

/*
NOTE:

Any list value you might be modifying non atomically should probably
be put in as pushA,popA except we need the system to know how to deal
with that kind of thing as we will want to insert large tables without
resorting to that kind of thing.

Although, we can simplify things by just throwing an error if we don't know
what to do. We should also not be transposing things if we are in a critical region.
perhaps we can have start critical and endcritical.

when we compose it is the unions of the critical regions.

*/

function invert(ops) {
  function invertOp(op) {
    switch (op.op) {
      case RETAIN: return op;
      case INSERT: return d(op.values);
      case DELETE: return i(op.values);
      case POP:    return unpop;
      case UNPOP:  return pop;
      case PUSH:
        return (typeof op.kind === 'string') ? unpushS : unpushA;
      case UNPUSH: 
        return (typeof op.kind === 'string') ? pushS : pushA;
      default:
        return op;
    }
  }
  return ops.map(invertOp);
}

function makeAppend(result) {
  return function(op) { 
    return _push(result, op); 
  };
}

function _slice(op, s, e) {
  switch (op.op) {
    case INSERT: return i(op.values.slice(s,e));
    case DELETE: return d(op.values.slice(s,e));
    case RETAIN: return r((e === undefined ? op.n : e) - s);
    default:     return op;
  }
}

function makeTake(ops) {
  var i = 0; //current operation
  var offset = 0; //sub offset within operation

  function take(n,indivisableField) {
    if (i === ops.length)
      return (n === -1) ? null : r(n);

    var part;
    var c = ops[i];
    if (n === -1
      || c.n === undefined
      || c.n - offset <= n
      || c.op === indivisableField) {
      //return the remainder of the current operation
      part = _slice(c, offset)
      i++;
      offset=0;
      return part;
    } else {
      part = _slice(c, offset, offset + n);
      offset += n;
      return part;
    }
  }

  function peek() {
    return ops[i];
  }

  return {
    take: take,
    peek: peek,
  }
}

function compose(opA, opB) {
  var result = [];
  var critical = 0;
  var level_b = 0; //does not include push pop
  var level_a = 0; //includes push and pop

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var length = 0;

  for (var i = 0; i < opB.length; i++) {
    var op = opB[i];
    switch (op.op) {
      case PUSH:
      case POP:
      case UNPUSH:
      case UNPOP:
      case INSERT:
        append(op);
        break;
      case UP:
        level_b++;
        chunk = peek();
        if (chunk && (chunk.op === UP || chunk.op === PUSH)) {
          append(take(-1))
          level_a++;
        } else {
          append(op);
        }
        break;
      case DOWN:
        level_b--;
        chunk = peek();
        if (chunk && (chunk.op === DOWN || chunk.op === POP)) {
          append(take(-1))
          level_a--;
          break;
        } else {
          append(op);
          if (level_b === level_a)
            op = r(1); //fall through to retain !!!
          else
            break;
        }
      case RETAIN:
        length = op.n;
        while (length > 0) {
          chunk = take(length, DELETE);
          switch (chunk.op) {
            case INSERT:
            case RETAIN:
              append(chunk);
              length -= chunk.n;
              break;
            case DOWN:
            case POP:
              level_a--;
              if (level_a===level_b) length -= 1;
              append(chunk);
              break;
            case UP:
            case PUSH:
              level_b++;
              append(chunk);
              break;
            case START:
              if (critical === 0) append(chunk);
              critical++;
              break;
            case STOP:
              critical--;
              if (critical === 0) append(chunk);
              break;
            default:
              append(chunk);
              break;
          }
        }
        break;
      case DELETE:
        length = op.n;
        //TODO
        // peek loop at end to gobble all the pushes and pops.
        break;
      case START:
        if (critical === 0) append(op);
        critical++;
        break;
      case STOP:
        critical--;
        if (critical === 0) append(op);
        break;
    }
  };

  while ((chunk = take(-1)))
    append(chunk); //TODO: probably need special cases for each..

  return result;
}

function transform(opA, opB, side) {
  var left = side == 'left';
  var result = [];
  var critical = 0;

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  
  for (var i = 0; i < opB.length; i++) {
    var op = opB[i];

    //TODO

  };

  while ((chunk = take(-1)))
    append(chunk);

  return result;
}

function apply(d,ops) {
  //stack and t(op) for traversing output documrny
  var stack = []
  var t = [];
  //stack and top(dp) for traversing input document
  var docStack = [];
  var dp = [d]; //wrap the doc so we can do [r(1)] and change nothing.
  var o = 0;

  function append(vals) {
    if (typeof t === 'string') {
      t += vals
    } else {
      t = t.concat(vals);
    }
  }

  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
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
        t.push(temp);
        break;
      case DELETE:
        o += op.n;
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
      case UP:
        //move deeper into the output
        stack.push(t);
        t = (typeof op.kind === 'string') ? "" : [];
        //move deeper into the doc
        docStack.push({o:o, dp:dp});
        dp = dp[o];
        o = 0;
        break;
      case DOWN:
        //move shallower in the doc
        var _d = docStack.pop();
        dp = _d.dp;
        o = _d.o + 1;
        //move shallower in the output
        var temp = t;
        t = stack.pop();
        t.push(temp);
        break;
      default:
        //do nothing for Start and End.
        break;
    }
  };

  return t[0];
}

module.exports = {
  name: 'sexpr',
  uri: 'https://github.com/mavxg/ot-sexpr',
  apply: apply,
  transform: transform,
  compose: compose,
  invert: invert,
  optypes: {
    retain  : r,
    insert  : i,
    "delete": d,
    pop     : pop,
    unpop   : unpop,
    pushA   : pushA,
    pushS   : pushS,
    unpushA : unpushA,
    unpushS : unpushS,
    upA     : upA,
    upS     : upS,
    down    : down,
    start   : start,
    end     : end,
  },
};