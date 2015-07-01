# TODO

* [X] Fixup tests to match new format
* [X] transformCursor(cursor, op, isOwnOp)
* [ ] insert at path (api)
* [ ] replace region (api)
      Takes an operation (which might just be an insert)
* [ ] Simple Diff to Operations.
* [ ] Run ottypes/fuzzer against type.
* [X] add isText tests
* [X] add insert tests
* [X] add replace tests
* [ ] add attribute tests
* [ ] api uses selection and do ops.

* [ ] move insert and delete operations to the document and dump the api

# IDEAS

Could do some form of simple diff (where an object is the same if it is referentially the same). Assume items do not get reordered.