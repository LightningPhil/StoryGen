import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chunkIndexAtChar,
  endsWithClausePause,
  endsWithSentencePause,
  groupChunksForSpeech,
  positionAtChar,
  type ReadChunk,
} from '../src/readAloud';

function chunk(text: string, firstWordIndex = 0): ReadChunk {
  const wordStarts: number[] = [];
  for (const match of text.matchAll(/\S+/g)) wordStarts.push(match.index ?? 0);
  return { text, wordEls: [], wordStarts, firstWordIndex };
}

test('clause pauses are commas, not full stops', () => {
  assert.equal(endsWithClausePause('the lantern,'), true);
  assert.equal(endsWithClausePause('wait;'), true);
  assert.equal(endsWithClausePause('look:'), true);
  assert.equal(endsWithClausePause('the lantern.'), false);
  assert.equal(endsWithSentencePause('the lantern.'), true);
  assert.equal(endsWithSentencePause('Really?'), true);
});

test('comma chunks are spoken as one sentence with a short TTS comma pause', () => {
  const units = groupChunksForSpeech([
    chunk('The fox paused,'),
    chunk('then slipped through the gate.'),
    chunk('Rain followed.'),
  ]);
  assert.equal(units.length, 2);
  assert.equal(units[0].text, 'The fox paused, then slipped through the gate.');
  assert.equal(units[0].chunks.length, 2);
  assert.equal(units[1].text, 'Rain followed.');
});

test('follow-along can map spoken character offsets back to comma chunks', () => {
  const unit = groupChunksForSpeech([
    chunk('The fox paused,'),
    chunk('then slipped through the gate.'),
  ])[0];
  assert.equal(chunkIndexAtChar(unit, 0), 0);
  assert.equal(chunkIndexAtChar(unit, 'The fox paused,'.length + 2), 1);
});

test('follow-along maps spoken offsets to the exact word, tolerating early indices', () => {
  const unit = groupChunksForSpeech([
    chunk('"Wait," said Pip,'),
    chunk('then ran.'),
  ])[0];
  // Offsets land on word starts.
  assert.deepEqual(positionAtChar(unit, 0), { chunkIndex: 0, wordIndex: 0 });
  assert.deepEqual(positionAtChar(unit, 8), { chunkIndex: 0, wordIndex: 1 });
  assert.deepEqual(positionAtChar(unit, 13), { chunkIndex: 0, wordIndex: 2 });
  // Second chunk begins after the joining space.
  const second = '"Wait," said Pip,'.length + 1;
  assert.deepEqual(positionAtChar(unit, second), { chunkIndex: 1, wordIndex: 0 });
  assert.deepEqual(positionAtChar(unit, second + 5), { chunkIndex: 1, wordIndex: 1 });
  // An index inside a word still resolves to that word, and past the end clamps.
  assert.deepEqual(positionAtChar(unit, 10), { chunkIndex: 0, wordIndex: 1 });
  assert.deepEqual(positionAtChar(unit, 999), { chunkIndex: 1, wordIndex: 1 });
});
