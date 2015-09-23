
//TODO: WHAT should the semantics be for the Region class? Closed, Open, Half Open (which end)?

function _min(a,b) { return a < b ? a : b; }
function _max(a,b) { return a > b ? a : b; }

//pair of points (xpos optional)
function Region(focus, anchor, xpos) {
  this.focus = focus;
  this.anchor = anchor === undefined ? focus : anchor;
  this.xpos = xpos === undefined ? false : xpos;
}
Region.prototype.empty = function() {
  return this.focus === this.anchor;
};
Region.prototype.begin = function() {
  return (this.focus < this.anchor) ? this.focus : this.anchor;
};
Region.prototype.end = function() {
  return (this.focus > this.anchor) ? this.focus : this.anchor;
};
//Region.prototype.size = function() {} //what would this be in an sexpr
//return region covering both regions
Region.prototype.cover = function(region) {
  var beg = _min(region.begin(), this.begin());
  var end = _max(region.end(), this.end());
  if (region.focus < region.anchor)
    return new Region(beg, end);
  return new Region(end, beg);
};
Region.prototype.intersection = function(region) {
  var beg = _max(region.begin(), this.begin());
  var end = _min(region.end(), this.end());
  if (beg > end) return null;
  return new Region(end, beg);
};
//Region has no subtract because subtract might return two regions
Region.prototype.intersects = function(region) {
  return (this.end() >= region.begin() && this.begin() <= region.end());
};
Region.prototype.contains = function(region) {
  if (!(region instanceof Region)) { //actually a point
    var point = region;
    return (this.begin() <= point && this.end() >= point)
  }
  return (this.begin() <= region.begin() && this.end() >= region.end())
};
Region.prototype.equals = function(region) {
  return (this.focus === region.focus && this.anchor >= region.anchor);
};

module.exports = Region;