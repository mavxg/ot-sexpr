# TODO

* [*] maintain local ids on tree (apply)
* [ ] transformCursor
* [ ] insert at path
* [ ] set at path (replace)
* [*] Simple Diff to Operations.
   - Later we might want it to take a path to the root of the change (like a hint - don't bother checking elsewhere). Not this is almost identical to set at path.
     or to extend an operation on a subobject to an operation on the containing document.


# IDEAS

Could do some form of simple diff (where an object is the same if it is referentially the same). Assume items do not get reordered.