test(
  'ObjFindTest',

  [
    'ephox.katamari.api.Arr',
    'ephox.katamari.api.Fun',
    'ephox.katamari.api.Obj',
    'ephox.wrap.Jsc'
  ],

  function (Arr, Fun, Obj, Jsc) {
    var checkNone = function (input, pred) {
      var actual = Obj.find(input, pred);
      return actual.isNone();
    };

    var checkObj = function (expected, input, pred) {
      var actual = Obj.find(input, pred).getOrDie('should have value');
      assert.eq(expected, actual);
    };

    checkNone({}, function (v, k) { return v > 0; });
    checkObj(3, { 'test': 3 }, function (v, k) { return k === 'test'; });
    checkNone({ 'test': 0 }, function (v, k) { return v > 0; });
    checkObj(4, { 'blah': 4, 'test': 3 }, function (v, k) { return v > 0; });
    checkNone({ 'blah': 4, 'test': 3 }, function (v, k) { return v === 12; });

    var obj = { 'blah': 4, 'test': 3 };
    checkObj(4, obj, function (v, k, o) { return o === obj; });

    Jsc.property(
      'the value found by find always passes predicate',
      Jsc.dict(Jsc.json),
      Jsc.fun(Jsc.bool),
      function (obj, pred) {
        // I think the way that Jsc.fun works is it cares about all of its arguments, so therefore
        // we have to only pass in one if we want it to be deterministic. Just an assumption
        var value = Obj.find(obj, function (v) {
          return pred(v);
        });
        return value.fold(function () {
          var values = Obj.values(obj);
          return !Arr.exists(values, function (v) {
            return pred(v);
          });
        }, function (v) {
          return pred(v);
        });
      }
    );

    Jsc.property(
      'If predicate is always false, then find is always none',
      Jsc.dict(Jsc.json),
      function (obj) {
        var value = Obj.find(obj, Fun.constant(false));
        return value.isNone();
      }
    );

    Jsc.property(
      'If object is empty, find is always none',
      Jsc.fun(Jsc.bool),
      function (pred) {
        var value = Obj.find({ }, pred);
        return value.isNone();
      }
    );

    Jsc.property(
      'If predicate is always true, then value is always the some(first), or none if dict is empty',
      Jsc.dict(Jsc.json),
      function (obj) {
        var value = Obj.find(obj, Fun.constant(true));
        // No order is specified, so we cannot know what "first" is
        return Obj.keys(obj).length === 0 ? value.isNone() : true;
      }
    );
  }
);