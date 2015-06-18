var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ot = require('../');

var compose = ot.compose;
var transform = ot.transform;
var opt = ot.optypes;

var r = opt.retain;
var i = opt.insert;
var d = opt['delete'];
var upA = opt.upA;
var upS = opt.upS;
var down = opt.down;
var pushS = opt.pushS;
var pushA = opt.pushA;
var pop = opt.pop;

var doc     = "doc";
var p       = "p";
var bold    = "bold";

var doca = [doc,[],[p,[],"Hello, World!"]];
var docb = [doc,[],[p,[],'Hello, ',[bold,[],'World!']]];

//insert text
var opa = [upA,r(2),upA,r(2),upS,r(7),i("Cruel "),r(6),down,down,down];
//bold text
var opb = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i(["bold",[]]),pushS,r(6),pop,down,down,down];

//target = compose(opa,opbp) = compose(opb,opap)
var opab = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i(["bold",[]]),pushS,i("Cruel "),r(6),pop,down,down,down]

//target transformed
var opbp = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i(["bold",[]]),pushS,r(12),pop,down,down,down];
var opap = [upA,r(2),upA,r(2),upS,r(7),
  down,upA,r(2),upS,i("Cruel "),r(6),down,down,down,down];


describe('Compose', function() {
  it ('Can compose insert and bold', function() {
    var comp = compose(opa,opbp);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });

  it ('Can compose bold and insert', function() {
    var comp = compose(opb,opap);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });
});