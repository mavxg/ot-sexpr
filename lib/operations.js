//operations

//retain {op:'retain', n:5}
//insert {op:'insert', values:[a b c]}
//insert {op:'insert', values:"text"}
//delete {op:'delete', values:[a b c]}
//delete {op:'delete', values:"text"}
// unpush, unpop

//with linearisation we also need UP and DOWN (with kind)

//with critical regions we also need START END

var Region = require('./region');
var Selection = require('./selection');
var List = require('./list');
var AttributedString = require('./string');
var sym = require('./symbol').sym;
var equal = require('./is').equal;

var parse = require('./parser');

//op types
var RETAIN  = "retain";
var INSERT  = "insert";
var DELETE  = "delete";
var START   = "start";
var END     = "end";

//value types
var SYMBOL  = "sym";
var CHAR    = "char";
var OBJ     = "obj";
var PUSH    = "push";
var POP     = "pop";

//push types
var STRING  = "string";
var LIST    = "list";

//linearisation
var pushA = function(attributes) { return {op:INSERT, value:LIST, type:PUSH, n:1, attributes:attributes}; }
var pushS = function(attributes) { return {op:INSERT, value:STRING, type:PUSH, n:1, attributes:attributes}; }
var unpushA = function(attributes) { return {op:DELETE, value:LIST, type:PUSH, n:1, unattributes:attributes}; }
var unpushS = function(attributes) { return {op:DELETE, value:STRING, type:PUSH, n:1, unattributes:attributes}; }
var pop   = {op:INSERT, type:POP, n:1};
var unpop = {op:DELETE, type:POP, n:1};

//critical regions
var start   = {op:START};
var end     = {op:END};

//standard text/list operations
function r(n, attributes, unattributes) {
  return {op:RETAIN, n:n, attributes:attributes, unattributes:unattributes};
}

function _i(vs, type, attributes) {
  return {op:INSERT,
    value:vs,
    type:type,
    n:(type === CHAR ? vs.length : 1),
    attributes:attributes
  };
}

function _d(vs, type, attributes) {
  return {op:DELETE,
    value:vs,
    type:type,
    n:(type === CHAR ? vs.length : 1),
    unattributes:attributes //we should make this attributes or 
                            //unattributes depending on what makes 
                            //the code simplest
  };
}

function _trim(ops) {
  i = ops.length-1;
  while (i >= 0) {
    var op = ops[i];
    if (op.op !== RETAIN || op.attributes || op.unattributes)
      break;
    ops.pop();
    i--;
  }
  return ops;
}

//RULES
// [r(a),r(b)] -> [r(a+b)] iff attributes match
// [i(a),i(b)] -> [i(a.concat(b))] iff char and attributes match
// [start,end] -> []
// [end,start] -> []

function _push(ops, op) {
  if (ops.length === 0)
    return ops.push(op);

  var t = ops[ops.length-1];
  switch (op.op) {
    case RETAIN:
      if (t.op === RETAIN && equal(op.attributes, t.attributes) && equal(op.unattributes, t.unattributes)) {
        ops.pop();
        return _push(ops, r(t.n + op.n, op.attributes, op.unattributes));
      }
      break;
    case INSERT:
      if (t.op === INSERT &&
        op.type === CHAR &&
        t.type === CHAR &&
        equal(op.attributes, t.attributes)) {
        ops.pop();
        return _push(ops, _i(t.value.concat(op.value), CHAR, t.attributes));
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
  }
  return ops.push(op);
}

/*
takes a source and target document and returns operations to modify
the source document into the target document.

Note: assumes simple operations where objects stay at the same level
within the tree.

takes an optional path and only does the diff at that path.
takes an optional critical bool to wrap the path in critical tags

Note, this assumes that strings that differ differ in entirety

*/

function _size(node) {
  if (typeof node.toSexpr === 'function') return node.size;
  return 1;
}

function diff(source, target, path, critical) {
  var result = [];
  var _source = source;
  var _target = target;
  if (path && path > 0) {
    var sn = _source.nodeAt(path);
    var tn = _source.nodeAt(path);
    if (sn.offset !== tn.offset) throw "Source and target do not match through path.";
    result.push(r(path - sn.offset));
    _source = sn.node;
    _target = tn.node;
  }

  if (_source === _target) {
    _push(result, r(_size(_source)));
    return result;
  }

  if (critical) result.push(start); //start critical region

  if (typeof _source.diff === 'function') {
    result = result.concat(_source.diff(_target));
  } else {
    result.push(_d(JSON.stringify(_source),'obj'));
    if (typeof _target._insert === 'function') {
      result = result.concat(_target._insert);
    } else {
      result.push(_d(JSON.stringify(_target),'obj'));
    }
  }
  /*
  //do an actual diff
  if (Array.isArray(source) && Array.isArray(target)) {
    result.push(upA);
    var i = 0;
    var j = 0;
    var rs = source.length;
    var ts = target.length;
    while (i < source.length && j < target.length) {
      var s = source[i];
      var t = target[j];
      if (s === t) {
        result.push(r(1));
        i++;
        j++;
        rs--;
        ts--;
      } else if (rs === ts) {
        result = result.concat(diff(s,t));
        rs--;
        ts--;
        i++;
        j++;
      } else if (rs > ts) {
        result.push(_d([s]));
        rs--;
        i++;
      } else {
        result.push(_i([t]));
        ts--;
        j++;
      }
    }
    if (rs > 0)
      result.push(_d(source.slice(i)));
    else if (ts > 0)
      result.push(_i(target.slice(j)));
    result.push(down);
  } else {
    result.push(_d([source]));
    result.push(_i([target]));
  }
  */
  if (critical) result.push(end); //end critical region

  //cleanup
  var trimmed = [];
  function append(op) { _push(trimmed, op); }
  result.forEach(append);
  return trimmed;
}

function invert(ops) {
  function invertOp(op) {
    switch (op.op) {
      case RETAIN: return r(op.n, op.unattributes, op.attributes);
      case INSERT: return _d(op.value, op.type, op.attributes);
      case DELETE: return _i(op.value, op.type, op.unattributes);
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
  if (op.type === CHAR)
    if (op.op === DELETE)
      return _d(op.value.slice(s,e), CHAR, op.unattributes);
    else //insert
      return _i(op.value.slice(s,e), op.type, op.attributes);
  if (op.op === RETAIN)
    return r((e === undefined ? op.n : e) - s, op.attributes, op.unattributes);
  return op;
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

var UNDEFINED;

function compose(opA, opB) {
  var result = [];
  var critical = 0;

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var length = 0;
  var op;

  function retain(length) {
    while (length > 0) {
      chunk = take(length, DELETE);
      if (chunk === null) throw "Retain failed for this compose"
      switch (chunk.op) {
        case INSERT:
          if (op.unattributes || op.attributes) {
            var ua = op.unattributes || {};
            var aa = op.attributes || {};
            var na = {};
            var nac = 0
            for (var k in chunk.attributes)
              if (!ua.hasOwnProperty(k)) { //assuming they match.
                na[k] = chunk.attributes[k];
                nac++;
              }
            for (var k in aa) {
              na[k] = aa[k];
              nac++;
            }
            chunk = _i(op.value, op.type, nac > 0 ? na : UNDEFINED);
          }
          append(chunk);
          length -= chunk.n;
          break;
        case RETAIN:
          if (op.unattributes || op.attributes) {
            var ua = op.unattributes || {};
            var aa = op.attributes || {};
            var na = {};
            var nu = {};
            var nac = 0;
            var nuc = 0

            //clone
            for (var k in chunk.attributes) {
              na[k] = chunk.attributes[k];
              nac++;
            }
            for (var k in chunk.unattributes) {
              nu[k] = chunk.unattributes[k];
              nuc++;
            }

            // {x:A} .... un:{x:A} a:{X:B} ... invert a:{x:A} un:{x:B} ... {}, {}
            // {x:A} .... un:{x:A} a:{X:B} ... a:{x:C} un:{x:B} ... un {x:A}, {x:C}
            for (var k in ua)
              if (na.hasOwnProperty(k)) { //must be the same
                delete na[k];
                nac--;
              } else {
                nu[k] =  ua[k];
                nuc++;
              }

            for (var k in aa)
              if (nu[k] === aa[k]) {
                delete nu[k];
                nuc--;
              } else {
                na[k] = aa[k];
                nac++;
              }
            chunk = r(op.n, nac > 0 ? na : UNDEFINED, nuc > 0 ? nu : UNDEFINED);
          }
          append(chunk); //TODO remove op.unattributes from chunk.attributes or add to chunk.unattributes
                         //     add op.attributes to chunk.attributes
          length -= chunk.n;
          break;
        case START:
          if (critical === 0) append(chunk);
          critical++;
          break;
        case END:
          critical--;
          if (critical === 0) append(chunk);
          break;
        default:
          append(chunk);
          break;
      }
    }
  }

  for (var i = 0; i < opB.length; i++) {
    op = opB[i];
    switch (op.op) {
      case INSERT:
        append(op);
        break;
      case RETAIN:
        length = op.n;
        retain(op.n);
        break;
      case DELETE:
        length = op.n;
        var s = 0;
        while (length > 0) {
          chunk = take(length, DELETE);
          if (chunk === null) throw "DELETE failed for this compose"
          switch (chunk.op) {
            case INSERT:
              length -= chunk.n;
              s += chunk.n;
              break;
            case RETAIN:
              append(_slice(op,s,s+chunk.n));
              length -= chunk.n;
              s += chunk.n;
              break;
            case START:
              if (critical === 0) append(chunk);
              critical++;
              break;
            case END:
              critical--;
              if (critical === 0) append(chunk);
              break;
            default:
              append(chunk);
              break;
          }
        }
        break;
      case START:
        if (critical === 0) append(op);
        critical++;
        break;
      case END:
        critical--;
        if (critical === 0) append(op);
        break;
    }
  };

  while ((chunk = take(-1)))
    append(chunk);

  return _trim(result);
}

function transform(opA, opB, side) {
  var left = side == 'left';
  var result = [];
  var critical_a = 0;
  var critical_b = 0;

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var op;

  //gobble opA while input
  function gobble() {
    while((chunk=peek()) && chunk.op === INSERT)
      append(take(-1));
  }

  function del(op) {
    var length = op.n;
    while (length > 0) {
      chunk = take(length, INSERT);
      switch (chunk.op) {
        case INSERT:
          append(chunk); ///??? TODO: do we need to adjust the attributes stuff?
          break;
        case DELETE:
        case RETAIN:
          length -= chunk.n;
          break;
        case START:
          if (critical_b > 0)
            throw "Overlapping Critical Region";
          critical_a++;
          break;
        case END:
          critical_a--;
          break;
      }
    }
  }

  function retain(op) {
    var length = op.n;
    while (length > 0) {
      chunk = take(length, INSERT);
      append(chunk);
      switch (chunk.op) {
        case INSERT:
          break;
        case RETAIN:
        case DELETE:
          length -= chunk.n;
          break;
        case START:
          if (critical_b > 0)
            throw "Overlapping Critical Region";
          critical_a++;
          break;
        case END:
          critical_a--;
          break;
      }
    }
  }
  
  for (var i = 0; i < opB.length; i++) {
    op = opB[i];
    switch (op.op) {
      case INSERT:
        if (left) gobble();
        append(r(op.n)) //skip over inserted
        break;
      case RETAIN:
        retain(op);
        break;
      case DELETE:
        del(op);
        break;
      case START:
        if (critical_a > 0)
          throw "Overlapping Critical Region";
        critical_b++;
        break;
      case END:
        critical_b--;
        break;
    }
  };

  while ((chunk = take(-1)))
    append(chunk);

  return _trim(result);
}

/*
function transformPoint(point, ops) {
  var pos = 0
  var cursor = point;
  for (var i=0; i < ops.length; i++) {
    var c = ops[i];
    var op_type = c.op;

    if (cursor < pos) break;

    switch (op_type) {
      case INSERT:
        cursor += c.n;
        break;
      case RETAIN:
        pos += c.n;
        break;
      case DELETE:
        cursor -= Math.min(c.n, cursor - pos);
        break;
    };
  }
  return cursor;
}
*/

function transformPoint(point, ops) {
  var pos = 0; //where are we in the original
  var cursor = point;
  for (var i=0; i < ops.length && point>=pos; i++) {
    var c = ops[i];
    var op_type = c.op;

    switch (op_type) {
      case INSERT:
        cursor += c.n;
        break;
      case RETAIN:
        pos += c.n;
        break;
      case DELETE:
        cursor -= Math.min(c.n, point - pos);
        pos += c.n;
        break;
    };
  }
  return cursor;
}

function transformRegion(region, op, isOwnOp) {
  var start = (isOwnOp) ? region.end() : region.focus;
  var nfocus = transformPoint(start, op);
  if (region.empty() || isOwnOp) {
    return (nfocus === region.focus ? region : new Region(nfocus));
  }
  var nanchor = transformPoint(region.anchor, op, isOwnOp);
  if (nfocus !== region.focus || nanchor !== region.anchor)
    return new Region(nfocus, nanchor);
  return region;
}

function transformCursor(cursor, op, isOwnOp) {
  var nrs = [];
  var changed = false;
  var len = cursor.regions.length
  for (var i = 0; i < len; i++) {
    var region = transformRegion(cursor.regions[i], op, isOwnOp);
    if (region !== cursor.regions[i]) changed = true;
    nrs.push(region);
  };
  return (changed ? new Selection(nrs) : cursor);
}

function apply(d, ops) {
  try {
    return _apply(d, ops);
  } catch (e) {
    console.log(e);
    return d;
  }
}
function _apply(d,ops) {
  //stack and t(op) for traversing output document
  var stack = []
  var t = [];
  var op;
  var offset = 0; //total document offset

  //stack for traversing the document
  var docStack = [];
  var dp = [d]; //top of document stack
  dp.index = function(i) { return this[i]; }
  var index = 0; //offset in element
  var isString = false;

  function process(op) {
    switch (op.type) {
      case CHAR:
        if (!isString) throw "Can only insert character in a string";
        t = t.add(op.value, op.attributes);
        break;
      case PUSH:
        stack.push(t);
        if (op.value === LIST) {
          t = new List(UNDEFINED, op.attributes);
        } else {
          t = new AttributedString("");
          isString = true;
        }
        break;
      case POP:
        var tmp = stack.pop();
        tmp.push(t);
        t = tmp;
        if (op.value === STRING)
          isString = false;
        break;
      case SYMBOL:
        t.push(sym(op.value));
        break;
      default:
        t.push(op.value);
        break;
    }
  }

  function del(length) {
    //basically the same as retain but do not do anything to the output stack
    var c;
    while (length > 0) {
      while (length > 0 && index >= dp.length) {
        //POP input doc (but not output)
        var pp = docStack.pop();
        index = pp.index+1;
        dp = pp.dp;
        length--;
        isString = false;
        if (length <= 0) return;
      }
      if (isString) {
        var remaining = (dp.length - index)
        if (length > remaining) {
          index+=remaining;
          length-=remaining;
        } else {
          index+=length;
          length=0;
        }
      } else {
        c = dp.index(index);
        if (c instanceof List) {
          if (c.size <= length) {
            index++;
            length-=c.size;
          } else {
            //go deeper into the document
            docStack.push({index:index, dp:dp});
            dp = c;
            index = 0;
            length--;
          }
        } else if (c instanceof AttributedString) {
          if (c.size <= length) {
            index++;
            length-=c.size;
          } else {
            isString = true;
            //go deeper into the document
            docStack.push({index:index, dp:dp});
            dp = c;
            index = 0;
            length = 0; //by definition
          }
        } else {
          //atom of some form.
          index++;
          length--;
        }
      }
    }
  }

  function retain(length, attributes, unattributes) {
    var c;
    while (length > 0) {
      while (length > 0 && index >= dp.length) {
        //POP output doc
        var tmp = stack.pop();
        tmp.push(t);
        t = tmp;
        //POP input doc
        var pp = docStack.pop();
        index = pp.index+1;
        dp = pp.dp;
        length--;
        isString = false;
      }
      if (isString) {
        var n = dp.slice(index, index + length);
        if (unattributes)
          n = n.removeAttributes(unattributes);
        if (attributes) {
          n = n.addAttributes(attributes);
        }
        length-=n.length;
        index+=n.length;
        t = t.concat(n);
      } else {
        c = dp.index(index);
        if (c instanceof List) {
          if (c.size <= length) {
            if (attributes || unattributes)
              if (length > 1)
                throw "Can only attribute the start of a list";
              else {
                if (unattributes)
                  c = c.unsetAttributes(unattributes);
                if (attributes)
                  c = c.setAttributes(attributes);
              }
            t.push(c);
            index++;
            length-=c.size;
          } else {
            var n = new List(c.id, c.attributes);
            if (unattributes)
                n = n.unsetAttributes(unattributes);
            if (attributes)
                n = n.setAttributes(attributes);
            //go deeper into the output stack
            stack.push(t);
            t = n;
            //go deeper into the document
            docStack.push({index:index, dp:dp});
            dp = c;
            index = 0;
            length--;
          }
        } else if (c instanceof AttributedString) {
          if (attributes || unattributes)
              throw "Can only attribute a substring";
          if (c.size <= length) {
            t.push(c);
            index++;
            length-=c.size;
          } else {
            isString = true;
            var n = c.slice(0, length - 1); //-1 for the start element
            //go deeper into the output stack
            stack.push(t);
            t = n;
            //go deeper into the document
            docStack.push({index:index, dp:dp});
            dp = c;
            index = length - 1;
            //length -= (1 + n.length);
            length = 0; //by definition
          }
        } else {
          //atom of some form.
          if (attributes || unattributes)
            throw "Attributes are only for strings and lists";
          t.push(c);
          index++;
          length--;
        }
      }
    }
  }

  for (var i = 0; i < ops.length; i++) {
    op = ops[i];
    switch (op.op) {
      case INSERT:
        process(op);
        break;
      case RETAIN:
        retain(op.n,op.attributes, op.unattributes);
        offset += op.n;
        break;
      case DELETE:
        del(op.n);
        offset += op.n;
        break;
      default:
        //do nothing for Start and End.
        break;
    }
  };

  if (offset < d.size) retain(d.size - offset);

  return t[0];
}

var operations = {
  retain  : r,
  insert  : _i,
  "delete": _d,
  pop     : pop,
  pushA   : pushA,
  pushS   : pushS,
  unpop   : unpop,
  unpushA : unpushA,
  unpushS : unpushS,
  start   : start,
  end     : end,
}

function create(doc) {
  if (typeof doc === 'string') return parse(doc)[0];
  return doc;
}

function serialize(doc) {
  return (doc === null) ? '(doc)' : doc.toSexpr();
}

function deserialize(doc) {
  return parse(doc === null ? '(doc)' : doc)[0];
}


module.exports = {
  name: 'sexpr',
  uri: 'https://github.com/mavxg/ot-sexpr',
  apply: apply,
  _apply: _apply,
  transform: transform,
  compose: compose,
  invert: invert,
  create: create,
  serialize: serialize,
  deserialize: deserialize,
  transformCursor: transformCursor,
  Region: Region,
  Selection: Selection,
  diff: diff,
  _trim: _trim,
  _push: _push,
  operations: operations,
};