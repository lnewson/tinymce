asynctest(
  'Browser Test: ui.ListTest',

  [
    'ephox.agar.api.Assertions',
    'ephox.agar.api.Logger',
    'ephox.agar.api.Pipeline',
    'ephox.agar.api.Step',
    'ephox.agar.api.Waiter',
    'ephox.alloy.api.behaviour.Behaviour',
    'ephox.alloy.api.behaviour.Replacing',
    'ephox.alloy.api.behaviour.Toggling',
    'ephox.alloy.api.component.GuiFactory',
    'ephox.alloy.api.component.Memento',
    'ephox.alloy.api.system.Attachment',
    'ephox.alloy.api.system.Gui',
    'ephox.alloy.log.AlloyLogger',
    'ephox.katamari.api.Fun',
    'ephox.mcagar.api.TinyApis',
    'ephox.mcagar.api.TinyLoader',
    'ephox.sugar.api.node.Body',
    'ephox.sugar.api.properties.Attr',
    'tinymce.core.ThemeManager',
    'tinymce.themes.mobile.features.Features',
    'tinymce.themes.mobile.Theme',
    'tinymce.themes.mobile.util.FormatChangers'
  ],

  function (
    Assertions, Logger, Pipeline, Step, Waiter, Behaviour, Replacing, Toggling, GuiFactory, Memento, Attachment, Gui, AlloyLogger, Fun, TinyApis, TinyLoader,
    Body, Attr, ThemeManager, Features, Theme, FormatChangers
  ) {
    var success = arguments[arguments.length - 2];
    var failure = arguments[arguments.length - 1];

    /* This test is going to create a toolbar with both list items on it */
    var alloy = Gui.create();

    var body = Body.body();
    Attachment.attachSystem(body, alloy);

    var toolbar = GuiFactory.build({
      dom: {
        tag: 'div',
        classes: [ 'test-toolbar' ]
      },
      behaviours: Behaviour.derive([
        Replacing.config({ })
      ])
    });

    var socket = GuiFactory.build({
      dom: {
        tag: 'div',
        classes: [ 'test-socket' ]
      }
    });

    alloy.add(toolbar);
    alloy.add(socket);
    
    ThemeManager.add('headlesstest', function (editor) {
      return {
        renderUI: function (args) {
          editor.fire('SkinLoaded');
          return {
            iframeContainer: socket.element().dom(),
            editorContainer: alloy.element().dom()
          };
        }
      };
    });

    var realm = {
      system: Fun.constant(alloy)
    };

    TinyLoader.setup(function (editor, onSuccess, onFailure) {
      var features = Features.setup(realm, editor);

      FormatChangers.init(realm, editor);

      var apis = TinyApis(editor);

      console.log('features', features);

      var memBullist = Memento.record(
        features.bullist.spec()
      );

      var memNumlist = Memento.record(
        features.numlist.spec()
      );

      Replacing.set(toolbar, [
        memBullist.asSpec(),
        memNumlist.asSpec()
      ]);

      var sSetP1 = apis.sSetSelection([ 0, 0, 0 ], 'Thi'.length, [ 0, 0, 0 ], 'Thi'.length);
      var sSetP2 = apis.sSetSelection([ 1, 0 ], 'Norma'.length, [ 1, 0 ], 'Norma'.length);
      var sSetP3 = apis.sSetSelection([ 2, 0, 0 ], 'Bu'.length, [ 2, 0, 0 ], 'Bu'.length);

      var sAssertListIs = function (label, mem, state) {
        return Waiter.sTryUntil(
            label,
            Step.sync(function () {
              var button = mem.get(socket);
              Assertions.assertEq('Selected/Pressed state of button:\n' +
                '      (' + Attr.get(button.element(), 'class') + ')', state, Toggling.isOn(button));
            }),
            100,
            1000
        );
      };

      Pipeline.async({}, [
        apis.sFocus,
        apis.sSetContent(
          '<ol><li>This is an ordered list</li></ol><p>Normal paragraph</p><ul><li>Bullet list</li></ul>'
        ),
        sSetP1,
        sAssertListIs('numlist: initial selection in p1', memNumlist, false),
        sAssertListIs('bullist: initial selection in ol', memBullist, false),
        sSetP2,
        sAssertListIs('numlist: ol >>> p', memNumlist, false),
        sAssertListIs('bullist: ol >>> p', memBullist, false),
        sSetP3,
        sAssertListIs('numlist: p >>> ul', memNumlist, false),
        sAssertListIs('bullist: p >>> ul', memBullist, true),
        Step.fail('Just checking toolbar')
      ], onSuccess, onFailure);
    }, {
      theme: 'headlesstest'
      // toolbar: 'bullist numlist undo',
      // setup: function (ed) {
      //   ed.addButton('bullist', { });
      // }
    }, function () {
      success();
    }, failure);

  }
);
