import { Logger, RawAssertions, UnitTest } from '@ephox/agar';

import { DialogChanges } from '../../../main/ts/ui/DialogChanges';
import { ListItem, LinkDialogData } from '../../../main/ts/ui/DialogTypes';
import { Fun } from '@ephox/katamari';

UnitTest.test('DialogChanges', () => {

  Logger.sync(
    'Basic test',
    () => {
      const anchorList: ListItem[] = [
        { value: 'alpha', text: 'Alpha' },
        {
          text: 'GroupB',
          items: [
            { value: 'gamma', text: 'Gamma' }
          ]
        }
      ];

      const assertNone = (label: string, persistentText: string, catalog: ListItem[], data: Partial<LinkDialogData>) => {
        Logger.sync('assertNone(' + label + ')', () => {
          const actual = DialogChanges.getDelta(persistentText, 'anchor', catalog, data);
          actual.each(
            (a) => { throw new Error('Should not have found replacement text'); }
          );
        });
      };

      const assertSome = (label: string, expected: { url: { value: string, meta: { text: string, attach: Function } }, text: string },
                          persistentText: string, catalog: ListItem[], data: Partial<LinkDialogData>) => {
        Logger.sync('assertSome(' + label + ')', () => {
          const actual = DialogChanges.getDelta(persistentText, 'anchor', catalog, data);
          RawAssertions.assertEq('Checking replacement text', expected, actual.getOrDie(
            'Should be some'
          ));
        });
      };

      assertSome('Current text empty + Has mapping', {
        url: {
          value: 'alpha',
          meta: {
            text: 'Alpha',
            attach: Fun.noop
          }
        },
        text: 'Alpha'
      }, '', anchorList, {
        anchor: 'alpha',
        text: ''
      });

      assertNone('Current text empty + Has no mapping', '', anchorList, {
        anchor: 'beta',
        text: ''
      });

      assertSome('Current text empty + Has mapping in nested list', {
        url: {
          value: 'gamma',
          meta: {
            text: 'Gamma',
            attach: Fun.noop
          }
        },
        text: 'Gamma'
      }, '', anchorList, {
        anchor: 'gamma',
        text: ''
      });

      assertSome('Current text not empty + Has mapping', {
        url: {
          value: 'alpha',
          meta: {
            text: 'Alpha',
            attach: Fun.noop
          }
        },
        text: 'Current'
      }, 'Current', anchorList, {
        anchor: 'alpha',
        text: ''
      });

    }
  );
});