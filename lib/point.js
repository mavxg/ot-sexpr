//path within s-expr
function Point(path) {
  this.path = path;
  this.hash = path.join('.');
}
Point.prototype.toJSON = function() {
  return {path:this.hash};
}
Point.prototype.equals = function(other) {
  return this.hash === other.hash;
};

Point.min = function(a, b) {
  return a.hash < b.hash ? a : b;
};
Point.max = function(a, b) {
  return a.hash >= b.hash ? a : b;
};

module.exports = Point;