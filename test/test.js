var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ot = require('../');

var compose = ot.compose;
var transform = ot.transform;
var invert = ot.invert;
var apply = ot.apply;
var opt = ot.optypes;

var r = opt.retain;
var i = opt.insert;
var d = opt['delete'];
var upA = opt.upA;
var upS = opt.upS;
var down = opt.down;
var pushS = opt.pushS;
var pushA = opt.pushA;
var unpushS = opt.unpushS;
var unpushA = opt.unpushA;
var pop = opt.pop;
var unpop = opt.unpop;

var doc     = "doc";
var p       = "p";
var bold    = "bold";

var doca = [doc,["title", "Tests"],[p,[],"Hello, World!"]];
var docb = [doc,["title", "Tests"],[p,[],'Hello, ',[bold,[],'World!']]];

//insert text
var opa = [upA,r(2),upA,r(2),upS,r(7),i("Cruel "),r(6),down,down,down];
//bold text
var opb = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,r(6),pop,down,down,down];
//Note: the list inserted after bold is atomic.

//should not modify a or b under transform
var opc = [upA,r(1),upA,i(["href","qubic.io"]),down,r(1),down];

//Unpush test
var opu = [upA,r(2),unpushA,r(3),unpop,down];

//non overlapping unpush test
var opuu = [upA,r(1),unpushA,r(2),unpop,r(1),down];

//invert targets
var opbi = [upA,r(2),upA,r(2),upS,r(7),
  unpop,unpushA,d([bold,[]]),unpushS,r(6),unpop,down,down,down];

//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),down,r(6),down,down,down]
//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),r(6),down,down,down,down]

//target = compose(opa,opbp) = compose(opb,opap)
var opab = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,i("Cruel "),r(6),pop,down,down,down]

//[upA,r(2),upA,r(2),upS,r(7),                              pop,pushA,i([bold,[]]),pushS,i("Cruel ")                                      ,r(6),pop,down,down,down]
//[upA,r(2),upA,r(2),upS,r(1),upA,r(2),upS,i("Cruel "),r(4),pop,pushA,i([bold,[]]),down,down,down,down,pushS,r(6),pop,down,down,down]

//target transformed
var opbp = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opap = [upA,r(2),upA,r(3),
  upA,r(2),upS,i("Cruel "),r(6),down,down,down,down];

//target transformed by opu
//var opbpu = [upA,r(2),upA,r(2),upS,r(7),
//  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opapu  = [upA,r(4),upS,r(7),i("Cruel "),r(6),down,down];
var opapuu = [upA,r(3),upA,r(2),upS,r(7),i("Cruel "),r(6),down,down,down];

//console.log(apply(apply(doca,opa),opbp))
//console.log(apply(apply(doca,opb),opap))

describe('Compose', function() {
  it ('Can compose insert and bold', function() {
    var comp = compose(opa,opbp);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });

  it ('Can compose bold and insert', function() {
    var comp = compose(opb,opap);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });

  it ('Self invert composes to retain 1', function() {
    var comp = compose(opb,invert(opb));
    assert.equal(JSON.stringify([r(1)]),JSON.stringify(comp));
  });
});

describe('Invert', function() {
  it ('Invert bold', function() {
    var inv = invert(opb);
    assert.equal(JSON.stringify(opbi),JSON.stringify(inv));
  });
});


describe('Transform', function() {
  it ('Can transform insert by bold', function() {
    var p = transform(opa,opb);
    assert.equal(JSON.stringify(p),JSON.stringify(opap));
  });

  it ('Can transform bold by insert', function() {
    var p = transform(opb,opa,"left");
    assert.equal(JSON.stringify(p),JSON.stringify(opbp));
  });

  it ('Can transform with unpush/pop', function() {
    var p = transform(opa,opu);
    assert.equal(JSON.stringify(p),JSON.stringify(opapu));
  });

  it ('Can transform with non overlapping unpush/pop', function() {
    var p = transform(opa,opuu);
    assert.equal(JSON.stringify(p),JSON.stringify(opapuu));
  });

  it ('Subtree inserts cause identity transform', function() {
    var ac = transform(opa,opc);
    var bc = transform(opb,opc);
    assert.equal(JSON.stringify(ac),JSON.stringify(opa));
    assert.equal(JSON.stringify(bc),JSON.stringify(opb));
  });
});