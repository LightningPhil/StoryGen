import test from 'node:test';
import assert from 'node:assert/strict';

import { chunkText, endsClause, endsSentence, piecesFromText } from '../src/readAloud';

const short = (text: string) => chunkText(text, 'short');
const long = (text: string) => chunkText(text, 'long');

test('a short sentence is one chunk; a long one splits at commas', () => {
  assert.deepEqual(short('The fox slipped through the gate.'), ['The fox slipped through the gate.']);
  assert.deepEqual(
    short('The fox paused at the old gate, sniffed the cold air twice, then slipped through into the dark.'),
    ['The fox paused at the old gate,', 'sniffed the cold air twice,', 'then slipped through into the dark.'],
  );
});

test('tiny fragments join a neighbour instead of being spoken alone', () => {
  assert.deepEqual(
    short('Yes, said Pip, smiling brightly at the old badger who lived down the lane, she said.'),
    ['Yes, said Pip,', 'smiling brightly at the old badger who lived down the lane, she said.'],
  );
});

test('every chunk ends where a reader would pause, never mid-phrase', () => {
  const text = 'When the rain finally stopped, the three of them crept out from under the bridge; the river was high, brown and fast.';
  const chunks = short(text);
  assert.deepEqual(chunks, [
    'When the rain finally stopped,',
    'the three of them crept out from under the bridge;',
    'the river was high,',
    'brown and fast.',
  ]);
  assert.equal(chunks.join(' '), text);
});

test('sentence-final punctuation with closing quotes ends the sentence', () => {
  assert.deepEqual(short('"Stop!" The fox froze. "Who goes there?" Nobody answered.'), [
    '"Stop!"', 'The fox froze.', '"Who goes there?"', 'Nobody answered.',
  ]);
  assert.deepEqual(short('“Run,” she said. (It was late.) They ran.'), ['“Run,” she said.', '(It was late.)', 'They ran.']);
});

test('dialogue tags after ?" and !" carry the sentence on', () => {
  assert.deepEqual(short('"Really?" she asked. "Hooray!" he shouted, waving both arms about wildly in the air.'), [
    '"Really?" she asked.',
    '"Hooray!" he shouted,',
    'waving both arms about wildly in the air.',
  ]);
});

test('an ellipsis followed by lowercase is a hesitation, not a sentence end', () => {
  assert.deepEqual(short('It’s so… wet! And big!'), ['It’s so… wet!', 'And big!']);
  assert.deepEqual(short('But... it looked just like their field. Odd.'), ['But... it looked just like their field.', 'Odd.']);
  assert.deepEqual(short('He was gone… The house was quiet.'), ['He was gone…', 'The house was quiet.']);
});

test('abbreviations, initials, decimals and times never end a sentence or clause', () => {
  assert.deepEqual(short('Mr. Fox met Dr. Mole at 09:15 near St. Ives.'), ['Mr. Fox met Dr. Mole at 09:15 near St. Ives.']);
  assert.deepEqual(short('J. K. Badger weighed 3.5 kilos, e.g. a small loaf of bread, and nothing more than that.'), [
    'J. K. Badger weighed 3.5 kilos,',
    'e.g. a small loaf of bread,',
    'and nothing more than that.',
  ]);
  assert.deepEqual(short('It cost 1,000 coins. Too many.'), ['It cost 1,000 coins.', 'Too many.']);
  assert.deepEqual(short('He knocked. "Mrs. Tiggy? Are you in?"'), ['He knocked.', '"Mrs. Tiggy?', 'Are you in?"']);
});

test('dashes are clause breaks, hyphens inside words are not', () => {
  assert.deepEqual(short('The endless ocean, the repetitive waves—it made his stomach do a little flip-flop.'), [
    'The endless ocean,',
    'the repetitive waves—',
    'it made his stomach do a little flip-flop.',
  ]);
  assert.deepEqual(short('Nature Discovery Patrol – we will be identifying at least ten distinct plant species today.'), [
    'Nature Discovery Patrol –',
    'we will be identifying at least ten distinct plant species today.',
  ]);
  assert.deepEqual(short('The well-known, much-loved otter swam home.'), ['The well-known, much-loved otter swam home.']);
});

test('an opening quote travels with the word it introduces', () => {
  assert.deepEqual(short('He looked up and said, "Wait for me, please, I am coming too."'), [
    'He looked up and said,',
    '"Wait for me,',
    'please, I am coming too."',
  ]);
});

test('long mode reads whole sentences and joins very short ones', () => {
  assert.deepEqual(long('No. Not now. The fox paused at the gate, then slipped through into the dark garden beyond.'), [
    'No. Not now. The fox paused at the gate, then slipped through into the dark garden beyond.',
  ]);
  assert.deepEqual(long('The fox paused at the gate and waited. Rain followed him all the way home. Odd.'), [
    'The fox paused at the gate and waited.',
    'Rain followed him all the way home. Odd.',
  ]);
});

test('chunks never lose or reorder any text', () => {
  const text = 'I remember the hum of a thousand discoveries, the whisper of winds carrying secrets from forgotten lands. And here, in Atheria Academy, nestled in the perpetually misty valley of Whisperwind, I found “something.” Mr. Finch, our tutor, said: “Maps lie… sometimes.” Did they? I wasn’t sure!';
  for (const mode of ['short', 'long'] as const) {
    const chunks = chunkText(text, mode);
    assert.equal(chunks.join(' '), text, mode);
    assert.ok(chunks.every(chunk => chunk.trim().length > 0));
  }
});

test('rule helpers agree with the chunker', () => {
  const pieces = piecesFromText('Mr. Fox, waited… then ran.');
  assert.equal(endsSentence(pieces[0], pieces[1]), false, 'Mr.');
  assert.equal(endsClause(pieces[1]), true, 'Fox,');
  assert.equal(endsSentence(pieces[2], pieces[3]), false, 'waited… then');
  assert.equal(endsSentence(pieces[4], undefined), true, 'ran.');
});
