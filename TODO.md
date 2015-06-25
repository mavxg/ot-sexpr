# TODO

* [*] maintain local ids on tree (apply)
* [ ] transformCursor(cursor, op, isOwnOp)
* [ ] insert at path (api)
* [ ] replace region (api)
      Takes an operation (which might just be an insert)
* [ ] split at path (assumes head + attributes) (api)
* [ ] wrap (doc, region, rules, head, attributes) (api)
* [ ] unwrap (doc, region, rules, head, attributes) (api)
      rules says what is allowed to go where. (? by parent)
* [*] Simple Diff to Operations.
   - Later we might want it to take a path to the root of the change (like a hint - don't bother checking elsewhere). Not this is almost identical to set at path.
     or to extend an operation on a subobject to an operation on the containing document.
* [ ] Run ottypes/fuzzer against type.


# IDEAS

Could do some form of simple diff (where an object is the same if it is referentially the same). Assume items do not get reordered.