import { RiTa } from 'rita';

function capitalize(word) {
  let a = word.charAt(0);
  a = a.toUpperCase();
  return a + word.substring(1, word.length);
}

function addArticle(word) {
  return /^[aeiou]/i.test(word) ? `an` : `a`;
}

function generateTweet(word, a, b, aPos, bPos) {
  const templates = {
    nn: [
      '{word} is nothing more than {articleA} {a} and {articleB} {b}.',
      '{word} is nothing more than {articleA} {a} and {articleB} {b}.',
    ],
    an: ['{word} is nothing more than {articleA} {a} {b}.'],
    vn: ['{word} is nothing more than to {a} {articleB} {b}.'],
    va: ['{word} is nothing more than {a} to {b}.'],
    vr: ['{word} is nothing more than to {a} {b}.'],
  };

  const key = `${aPos}${bPos}`;
  const options = templates[key];
  const template = options[Math.floor(Math.random() * options.length)];

  return template
    .replace('{word}', capitalize(word))
    .replace('{a}', a)
    .replace('{b}', b)
    .replace('{articleA}', addArticle(a))
    .replace('{articleB}', addArticle(b));
}

function findPair() {
  for (let i = 0; i < 100; i++) {
    let word = RiTa.randomWord({ minLength: 6 });

    for (let j = 3; j <= word.length - 3; j++) {
      const a = word.substring(0, j);
      const b = word.substring(j, word.length);
      if (RiTa.hasWord(a) && RiTa.hasWord(b)) {
        return { word, a, b };
      }
    }
  }

  throw new Error('No valid pair found.');
}

export function findPairs() {
  const tries = [];

  for (let i = 0; i < 10; i++) {
    let { a, b, word } = findPair();

    let aPos = RiTa.pos(a, { simple: true })[0];
    let bPos = RiTa.pos(b, { simple: true })[0];

    const reverseThese = [
      ['n', 'a'],
      ['n', 'v'],
      ['r', 'v'],
      ['a', 'v'],
    ];

    if (reverseThese.some(([pos1, pos2]) => aPos === pos1 && bPos === pos2)) {
      [a, b] = [b, a];
      [aPos, bPos] = [bPos, aPos];
    }

    const validCombinations = [
      ['a', 'n'], // Adjective + Noun
      ['v', 'n'], // Verb + Noun
      ['n', 'n'], // Noun + Noun
      ['v', 'r'], // Verb + Adverb
      ['v', 'a'], // Adjective + Verb
    ];

    if (validCombinations.some(([pos1, pos2]) => aPos === pos1 && bPos === pos2)) {
      const tweet = generateTweet(word, a, b, aPos, bPos);
      tries.push(tweet);
    } else {
      console.log(`Invalid pair: ${a} (${aPos}), ${b} (${bPos})`);
    }
  }
  return tries;
}

export async function centerOf() {
  const tweets = [];
  for (let i = 0; i < 50; i++) {
    // A random word
    const word = RiTa.randomWord();
    let allMatches = await RiTa.search(word);
    for (let match of allMatches) {
      const regex = new RegExp(`.+${word}.+`);
      if (regex.test(match)) {
        const tweet = `At the center of ${match} is ${word}.`;
        tweets.push(tweet);
      }
    }
  }

  if (tweets.length > 10) {
    tweets.sort(() => Math.random() - 0.5);
    return tweets.slice(0, 10);
  }

  return tweets;
}

centerOf();
