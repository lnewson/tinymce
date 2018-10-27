import {
  AddEventsBehaviour,
  AlloyEvents,
  AlloySpec,
  AlloyTriggers,
  Behaviour,
  Button as AlloyButton,
  Composing,
  CustomEvent,
  FormField as AlloyFormField,
  Invalidating,
  Memento,
  NativeEvents,
  Representing,
  SketchSpec,
  Tabstopping,
  Typeahead as AlloyTypeahead,
  AlloyComponent
} from '@ephox/alloy';
import { Types } from '@ephox/bridge';
import { Arr, Future, FutureResult, Id, Option, Result } from '@ephox/katamari';
import { Class, Traverse } from '@ephox/sugar';

import { UiFactoryBackstageShared, UiFactoryBackstageProviders } from '../../backstage/Backstage';
import { UiFactoryBackstageForUrlInput } from '../../backstage/UrlInputBackstage';
import { renderFormFieldDom, renderLabel } from '../alien/FieldLabeller';
import { formChangeEvent, formSubmitEvent } from '../general/FormEvents';
import * as Icons from '../icons/Icons';
import { ItemResponse } from '../menus/item/MenuItems';
import * as MenuParts from '../menus/menu/MenuParts';
import * as NestedMenus from '../menus/menu/NestedMenus';
import { ToolbarButtonClasses } from '../toolbar/button/ButtonClasses';
import {
  anchorTargetBottom,
  anchorTargets,
  anchorTargetTop,
  filterByQuery,
  headerTargets,
  historyTargets,
  joinMenuLists,
} from '../urlinput/Completions';

const getItems = (fileType: 'image' | 'media' | 'file', input: AlloyComponent, urlBackstage: UiFactoryBackstageForUrlInput) => {
  const urlInputValue = Representing.getValue(input);
  const term = urlInputValue.meta.text !== undefined ? urlInputValue.meta.text : urlInputValue.value;
  const info = urlBackstage.getLinkInformation();
  return info.fold(
    () => [],
    (linkInfo) => {
      const history = filterByQuery(term, historyTargets(urlBackstage.getHistory(fileType)));
      return fileType === 'file' ? joinMenuLists([
        history,
        filterByQuery(term, headerTargets(linkInfo)),
        filterByQuery(term, Arr.flatten([
          anchorTargetTop(linkInfo),
          anchorTargets(linkInfo),
          anchorTargetBottom(linkInfo)
        ]))
      ])
        : history;
    }
  );
};

// TODO: Find a place for this.
const renderInputButton = (eventName: string, className: string, iconName: string, providersBackstage: UiFactoryBackstageProviders) => {
  return AlloyButton.sketch({
    dom: {
      tag: 'button',
      classes: [ ToolbarButtonClasses.Button, className ],
      // TODO: Change the icon
      innerHtml: Icons.get(iconName, providersBackstage.icons)
    },
    action: (component) => {
      AlloyTriggers.emit(component, eventName);
    }
  });
};

export const renderUrlInput = (spec: Types.UrlInput.UrlInput, sharedBackstage: UiFactoryBackstageShared, urlBackstage: UiFactoryBackstageForUrlInput): SketchSpec => {

  const updateHistory = (component: AlloyComponent): void => {
    const urlEntry = Representing.getValue(component);
    urlBackstage.addToHistory(urlEntry.value, spec.filetype);
  };

  // TODO: Make alloy's typeahead only swallow enter and escape if menu is open
  const pField = AlloyFormField.parts().field({
    factory: AlloyTypeahead,
    dismissOnBlur: true,
    inputClasses: ['tox-textfield'],
    sandboxClasses: ['tox-dialog__popups'],
    minChars: 0,
    responseTime: 0,
    fetch: (input: AlloyComponent) => {
      const items = getItems(spec.filetype, input, urlBackstage);
      const tdata = NestedMenus.build(items, ItemResponse.BUBBLE_TO_SANDBOX, sharedBackstage.providers);
      return Future.pure(tdata);
    },

    getHotspot: (comp) => memUrlBox.getOpt(comp),

    typeaheadBehaviours: Behaviour.derive(Arr.flatten([
      urlBackstage.getValidationHandler().map(
        (handler) => Invalidating.config({
          getRoot: (comp) => Traverse.parent(comp.element()),
          invalidClass: 'tox-status-invalid',
          notify: {
          },
          validator: {
            validate: (input) => {
              const urlEntry = Representing.getValue(input);
              return FutureResult.nu((completer) => {
                handler({ type: spec.filetype, url: urlEntry.value }, (validation) => {
                  memUrlBox.getOpt(input).each((urlBox) => {
                    // TODO: Move to UrlIndicator
                    const toggle = (component: AlloyComponent, clazz: string, b: boolean) => {
                      (b ? Class.add : Class.remove)(component.element(), clazz);
                    };
                    // TODO handle the aria implications of the other 3 states
                    toggle(urlBox, 'tox-status-valid', validation.status === 'valid');
                    toggle(urlBox, 'tox-status-unknown', validation.status === 'unknown');
                  });
                  completer((validation.status === 'invalid' ? Result.error : Result.value)(validation.message));
                });
              });
            }
          }
        })
      ).toArray(),
      [
        Tabstopping.config({}),
        AddEventsBehaviour.config('urlinput-events', Arr.flatten([
          // We want to get fast feedback for the link dialog, but not sure about others
          spec.filetype === 'file' ? [
            AlloyEvents.run(NativeEvents.input(), (comp) => {
              AlloyTriggers.emitWith(comp, formChangeEvent, { name: spec.name });
            })
          ] : [ ],
          [
            AlloyEvents.run(NativeEvents.change(), (comp) => {
              AlloyTriggers.emitWith(comp, formChangeEvent, { name: spec.name });
              updateHistory(comp);
            })
          ]
        ]))
      ]
    ])),

    eventOrder: {
      [NativeEvents.input()]: [ 'streaming', 'urlinput-events', 'invalidating' ]
    },

    model: {
      getDisplayText: (itemData) => {
        return itemData.value;
      },
      selectsOver: false,
      populateFromBrowse: false
    },

    markers: {
      // FIX:
      openClass: 'dog'
    },

    lazySink: sharedBackstage.getSink,

    parts: {
      menu: MenuParts.part(false, 1, 'normal')
    },
    onExecute: (_menu, component, _entry) => {
      AlloyTriggers.emitWith(component, formSubmitEvent, {});
    },
    onItemExecute: (typeahead, _sandbox, _item, _value) => {
      updateHistory(typeahead);
      AlloyTriggers.emitWith(typeahead, formChangeEvent, { name: spec.name });
    }
  });

  const pLabel = spec.label.map(renderLabel) as Option<AlloySpec>;

  // TODO: Consider a way of merging with Checkbox.
  const makeIcon = (name, icon = name) => ({
    dom: {
      tag: 'span',
      classes: ['tox-icon', 'tox-status-icon__' + name],
      innerHtml: Icons.get('icon-' + icon, sharedBackstage.providers.icons)
    }
  });

  const memStatus = Memento.record({
    dom: {
      tag: 'span',
      classes: ['tox-status']
    },
    components: [
      makeIcon('checkmark'),
      makeIcon('warning'),
      makeIcon('error', 'warning')
    ]
  });

  const optUrlPicker = urlBackstage.getUrlPicker(spec.filetype);

  const browseUrlEvent = Id.generate('browser.url.event');

  const memUrlBox = Memento.record(
    {
      dom: {
        tag: 'div',
        classes: ['tox-input-wrap']
      },
      components: [pField, memStatus.asSpec()]
    }
  );

  const controlHWrapper = (): AlloySpec => {
    return {
      dom: {
        tag: 'div',
        classes: ['tox-form__controls-h-stack']
      },
      components: Arr.flatten([
        [memUrlBox.asSpec()],
        optUrlPicker.map(() => renderInputButton(browseUrlEvent, 'tox-browse-url', 'icon-browse', sharedBackstage.providers)).toArray()
      ])
    };
  };

  const openUrlPicker = (comp: AlloyComponent) => {
    Composing.getCurrent(comp).each((field) => {
      const urlData = Representing.getValue(field);
      optUrlPicker.each((picker) => {
        picker(urlData).get((chosenData) => {
          Representing.setValue(field, chosenData);
          AlloyTriggers.emitWith(comp, formChangeEvent, { name: spec.name });
        });
      });
    });
  };

  return AlloyFormField.sketch({
    dom: renderFormFieldDom(),
    components: pLabel.toArray().concat([
      controlHWrapper()
    ]),
    fieldBehaviours: Behaviour.derive([
      AddEventsBehaviour.config('url-input-events', [
        AlloyEvents.run<CustomEvent>(browseUrlEvent, openUrlPicker)
      ])
    ])
  });
};
