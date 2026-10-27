import test from 'node:test';
import assert from 'node:assert/strict';
import { readProfile, saveProfile } from '../games/duskbound/profile.mjs';

test('corrupt or unavailable storage still permits a default profile', () => {
  assert.equal(readProfile(null).hero, 'witch');
  assert.equal(readProfile({ getItem() { throw new Error('blocked'); } }).bestScore, 0);
  assert.equal(readProfile({ getItem() { return '{broken'; } }).runs, 0);
  assert.equal(saveProfile({ setItem() { throw new Error('quota'); } }, {}), false);
});
test('invalid persistent values cannot create negative records or unknown heroes', () => {
  const profile = readProfile({ getItem() { return JSON.stringify({ bestScore: -10, bestKills: '9000', bestTime: 1e20, hero: '<invalid>', sound: 'true' }); } });
  assert.equal(profile.bestScore, 0); assert.equal(profile.bestKills, 0); assert.equal(profile.bestTime, 36000);
  assert.equal(profile.hero, 'witch'); assert.equal(profile.sound, false);
});
test('a completed record and user settings survive serialization', () => {
  const memory = new Map(); const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const initial = { ...readProfile(storage), hero: 'seer', bestKills: 157, bestScore: 1830, bestTime: 209, runs: 3, wins: 1, sound: true };
  assert.equal(saveProfile(storage, initial), true); assert.deepEqual(readProfile(storage), initial);
});
