define(
  'ephox.alloy.api.ui.Button',

  [
    'ephox.alloy.registry.Tagger',
    'ephox.alloy.spec.SpecSchema',
    'ephox.alloy.ui.single.ButtonSpec',
    'ephox.boulder.api.FieldSchema',
    'ephox.highway.Merger',
    'ephox.peanut.Fun'
  ],

  function (Tagger, SpecSchema, ButtonSpec, FieldSchema, Merger, Fun) {
    var schema = [
      FieldSchema.strict('dom'),
      FieldSchema.option('action'),
      FieldSchema.option('role')
    ];

    // Dupe with Tiered Menu
    var build = function (rawSpec) {
      var spec = Merger.deepMerge({ uid: Tagger.generate('') }, rawSpec);
      var detail = SpecSchema.asStructOrDie('TieredMenu', schema, spec, [ ]);
      return ButtonSpec.make(detail, spec);
    };

    return {
      build: build,
      partial: Fun.identity
    };
  }
);