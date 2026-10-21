import {
  MORE_EXTENSION_ROWS,
  MORE_EXTERNAL_URLS,
  MORE_REFERENCE_ORDER,
  MORE_ROWS,
} from '../sections';

/**
 * Figma node 2102:2711. The audit found the More tab opening with two
 * settings rows the frame does not have, pushing the whole reference group
 * off the initial viewport.
 */
describe('More reference group', () => {
  it('lists the reference rows in frame order', () => {
    expect(MORE_ROWS.map((row) => row.id)).toEqual([
      'web',
      'youtube',
      'telegram',
      'whatsapp',
      'soundcloud',
      'archive',
      'contact',
      'about',
    ]);
  });

  it('declares that order as the reference contract', () => {
    expect(MORE_REFERENCE_ORDER).toEqual(MORE_ROWS.map((row) => row.id));
  });

  it('opens with the website row, not with settings', () => {
    expect(MORE_ROWS[0].id).toBe('web');
    expect(MORE_REFERENCE_ORDER).not.toContain('settings');
  });

  it('keeps the settings rows available, after the reference group', () => {
    expect(MORE_EXTENSION_ROWS.map((row) => row.id)).toEqual(['settings', 'progress']);
    MORE_EXTENSION_ROWS.forEach((row) => {
      expect([row.id, row.route]).toEqual([row.id, expect.stringMatching(/^\//)]);
      expect(row.title.length).toBeGreaterThan(0);
    });
  });

  it('has unique ids across the reference and extension groups', () => {
    const ids = [...MORE_ROWS, ...MORE_EXTENSION_ROWS].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('More row destinations', () => {
  it('gives every external row a resolvable https url', () => {
    MORE_ROWS.filter((row) => row.isExternal).forEach((row) => {
      const url = MORE_EXTERNAL_URLS[row.externalKey ?? ''];
      expect([row.id, url]).toEqual([row.id, expect.stringMatching(/^https:\/\//)]);
    });
  });

  it('gives every internal row an in-app route', () => {
    MORE_ROWS.filter((row) => !row.isExternal).forEach((row) => {
      expect([row.id, row.route]).toEqual([row.id, expect.stringMatching(/^\//)]);
    });
  });

  it('never marks a row both external and routed', () => {
    MORE_ROWS.forEach((row) => {
      expect([row.id, row.isExternal && !!row.route]).toEqual([row.id, false]);
    });
  });
});
