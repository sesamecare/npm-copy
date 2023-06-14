import { execFileSync } from 'child_process';

describe('npm-copy', () => {
  it('prints usage', () => {
    const result = execFileSync('./node_modules/.bin/ts-node', ['./src/bin/npm-copy.ts'], { encoding: 'utf-8' });
    expect(result).toContain('usage:');
  });
});
