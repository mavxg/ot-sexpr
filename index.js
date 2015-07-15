//base type
var ot   = require('./lib/operations');

//extentions
ot.api   = require('./lib/api');
ot.parse = require('./lib/parser');
ot.List  = require('./lib/list');
ot.Symbol   = require('./lib/symbol');
ot.AttributedString = require('./lib/string');
ot.sym = ot.Symbol.sym;
ot.Visitor = require('./lib/visitor');

module.exports = ot;