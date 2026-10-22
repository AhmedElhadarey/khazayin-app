import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('discussion counts use the right unit', () => {
  it('the scholar entry counts threads, never a sum of posts', () => {
    const src = read('components/khazain/community/ScholarDiscussionsEntry.tsx');
    expect(src).toMatch(/discussionThreadCount\(/);
    expect(src).not.toMatch(/n \+ t\.postCount/);
  });

  it('the discussion index words each lecture\'s count as posts', () => {
    const src = read('app/(tabs)/sections/discussion/index.tsx');
    expect(src).toMatch(/postsLabel\(/);
    expect(src).not.toMatch(/discussionsLabel\(/);
  });
});
