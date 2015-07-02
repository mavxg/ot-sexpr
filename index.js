//base type
var ot   = require('./lib/operations');

//extentions
ot.api   = require('./lib/api');
ot.parse = require('./lib/parser');
ot.List  = require('./lib/list');
ot.sym   = require('./lib/symbol').sym;
ot.AttributedString = require('./lib/string');

module.exports = ot;