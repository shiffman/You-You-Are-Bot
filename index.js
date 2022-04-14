// import fetch from 'node-fetch';
require('dotenv').config();
const { Client, Intents, MessageEmbed } = require('discord.js');
const { TwitterApi } = require('twitter-api-v2');

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require('axios');

const fs = require('fs');
const data = fs.readFileSync('all.txt', 'utf-8');
const prompts = data.split('\n');

const channelID = '962162083993100388';

const RiTa = require('rita');

const wordfilter = require('wordfilter');

const config = {
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

const emojiLookup = {
  '0️⃣': 0,
  '1️⃣': 1,
  '2️⃣': 2,
  '3️⃣': 3,
  '4️⃣': 4,
  '5️⃣': 5,
  '6️⃣': 6,
  '7️⃣': 7,
  '8️⃣': 8,
  '9️⃣': 9,
};

const twitterClient = new TwitterApi(config);

async function tweetIt(txt, reply_id) {
  if (wordfilter.blacklisted(txt)) {
    console.log('wordfilter blocked');
    console.log(txt);
    return;
  }
  console.log(txt, reply_id);
  let params = undefined;
  if (reply_id) {
    params = {
      in_reply_to_status_id: reply_id,
      auto_populate_reply_metadata: true,
    };
  }
  const response = await twitterClient.v1.tweet(txt, params);
  return response;
}

const model_url =
  'https://api-inference.huggingface.co/models/shiffman/gpt-neo-1.3B-youyouare-2022';

const queue = {};

console.log('Beep beep! 🤖');
const discordClient = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});
discordClient.login(process.env.DISCORD_TOKEN);
discordClient.once('ready', readyDiscord);

async function readyDiscord() {
  generateTweet();
  setInterval(generateTweet, 60 * 60 * 2 * 1000);
  console.log('💖');
}

function generateTweet() {
  const r = Math.random();
  if (r < 0.25) acrostic();
  else if (r < 0.5) goPair();
  else if (r < 0.75) go();
  else centerOf();
}

function random(arr) {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

function capitalize(word) {
  let a = word.charAt(0);
  a = a.toUpperCase();
  return a + word.substring(1, word.length);
}

async function goPair() {
  const tries = [];

  for (let i = 0; i < 10; i++) {
    let { a, b, word } = findPair();
    word = capitalize(word);
    let tweet;

    let wordP = RiTa.pos(word, { simple: true })[0];
    let aP = RiTa.pos(a, { simple: true })[0];
    let bP = RiTa.pos(b, { simple: true })[0];
    let wordP2 = RiTa.pos(word)[0];
    let aP2 = RiTa.pos(a)[0];
    let bP2 = RiTa.pos(b)[0];

    const both = [aP, bP, aP2, bP2];
    // One adjective, one noun
    if (both.includes('a') && both.includes('n')) {
      let adj, noun;
      if (both[0] == 'a') {
        adj = a;
        noun = b;
      } else {
        adj = b;
        noun = a;
      }
      if (/^[aeiou]/.test(adj)) adj = 'an ' + adj;
      else adj = 'a ' + adj;
      tweet = `${word} is nothing more than ${adj} ${noun}.`;
    }
    // One verb, one noun
    else if (both.includes('v') && both.includes('n')) {
      let verb, noun;
      if (both[0] == 'v') {
        verb = a;
        noun = b;
      } else {
        verb = b;
        noun = a;
      }
      if (/^[aeiou]/.test(noun)) noun = 'an ' + noun;
      else noun = 'a ' + noun;
      tweet = `${word} is nothing more than to ${verb} ${noun}.`;
    }
    // Both nouns
    else if (both[0] == 'n' && both[1] == 'n') {
      if (RiTa.pluralize(a) == a) a = a;
      else if (/^[aeiou]/.test(a)) a = 'an ' + a;
      else a = 'a ' + a;
      if (RiTa.pluralize(b) == b) b = b;
      else if (/^[aeiou]/.test(b)) b = 'an ' + b;
      else b = 'a ' + b;
      tweet = `${word} is nothing more than ${a} and ${b}.`;
    }
    // Verb + Preposition
    else if (both.includes('in') && both.includes('v')) {
      let prepo, verb;
      if (both[0] == '-') {
        prepo = a;
        verb = b;
      } else {
        prepo = b;
        verb = a;
      }
      if (both.includes('vbd'))
        tweet = `${word} is nothing more than to be ${verb} ${prepo}.`;
      else if (both.includes('vb'))
        tweet = `${word} is nothing more than to ${verb} ${prepo}.`;
    }
    // Nun + Preposition
    else if (both.includes('in') && both.includes('n')) {
      let prepo, noun;
      if (both[0] == '-') {
        prepo = a;
        noun = b;
      } else {
        prepo = b;
        noun = a;
      }
      if (RiTa.pluralize(noun) == noun) noun = noun;
      else if (/^[aeiou]/.test(noun)) noun = 'an ' + noun;
      else noun = 'a ' + noun;
      tweet = `${word} is nothing more than ${prepo} ${noun}.`;
    }
    // Verb + Adverb
    else if (both.includes('v') && both.includes('r')) {
      let verb, adverb;
      let opening = `${word} is nothing more than`;
      if (!both.includes('vbd')) opening = opening + ' to';
      if (both[0] == 'v') {
        verb = a;
        adverb = b;
      } else {
        verb = b;
        adverb = a;
      }
      tweet = `${opening} ${verb} ${adverb}.`;
    }
    // Verb + Adjective
    else if (both.includes('v') && both.includes('a')) {
      let verb, adj;
      if (both[0] == 'v') {
        verb = a;
        adj = b;
      } else {
        verb = b;
        adj = a;
      }
      tweet = `${word} is nothing more than ${adj} to ${verb}.`;
    }
    // Conjunction plus verb
    else if (both.includes('cc') && both.includes('v')) {
      let cc, verb;
      if (both[0] == '-') {
        cc = a;
        verb = b;
      } else {
        cc = b;
        verb = a;
      }
      tweet = `${word} is nothing more than ${cc} to ${verb}.`;
    }
    // Conjunction plus noun
    else if (both.includes('cc') && both.includes('n')) {
      let cc, noun;
      if (both[0] == '-') {
        cc = a;
        noun = b;
      } else {
        cc = b;
        noun = a;
      }
      if (RiTa.pluralize(noun) == noun) noun = noun;
      else if (/^[aeiou]/.test(noun)) noun = 'an ' + noun;
      else noun = 'a ' + noun;
      tweet = `${word} is nothing more than ${cc} ${noun}.`;
    } else {
      let msg = 'pattern not detected\n';
      msg += `${word}: ${wordP} ${wordP2}\n`;
      msg += `${a}: ${aP} ${aP2}\n`;
      msg += `${b}: ${bP} ${bP2}`;
      console.log(msg);
    }

    if (tweet) tries.push(tweet);
  }
  console.log(tries);
  addChoices(tries);
}

function findPair() {
  for (let i = 0; i < 100; i++) {
    // const word = RiaTa.search(/.*?s$/, { shuffle: true });
    const words = RiTa.search(/.{6,}/, { shuffle: true });
    for (let word of words) {
      for (let j = 3; j <= word.length - 3; j++) {
        const a = word.substring(0, j);
        const b = word.substring(j, word.length);
        if (RiTa.hasWord(a) && RiTa.hasWord(b)) {
          return { word, a, b };
        }
      }
    }
  }
  return undefined;
}

async function centerOf() {
  const tweets = [];

  for (let i = 0; i < 5; i++) {
    // A random word
    let randomWordURL =
      `https://api.wordnik.com/v4/words.json/randomWord?` +
      `&minLength=2&maxLength=5&minCorpusCount=5000` +
      '&includePartOfSpeech=noun' +
      '&excludePartOfSpeech=proper-noun,proper-noun-plural,proper-noun-posessive,suffix,family-name,idiom,affix&' +
      `&api_key=${process.env.WORDNIK_TOKEN}`;
    console.log(randomWordURL);
    const response1 = await fetch(randomWordURL);
    const json = await response1.json();
    const word = json.word.toLowerCase();
    console.log(word);
    const regex = `^[a-zA-Z]+${word}[a-zA-Z]+$`;
    const params = {
      method: 'GET',
      url: 'https://wordsapiv1.p.rapidapi.com/words/',
      params: {
        letterPattern: regex,
        limit: '10',
        random: 'true',
      },
      headers: {
        'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      },
    };
    const { data } = await axios.request(params);

    if (data.word) {
      const tweet = `At the center of ${data.word} is ${word}.`;
      console.log(tweet);
      tweets.push(tweet);
    } else {
      console.log('no luck');
    }
  }
  addChoices(tweets);
}

async function acrostic() {
  let poem = [];
  //const words = ['Destiny']; //, 'You', 'Worker', 'Lumon', 'Are', 'Who'];
  //const word = random(words);

  // A random word
  let randomWordURL =
    `https://api.wordnik.com/v4/words.json/randomWord?` +
    `&minLength=2&maxLength=6&minCorpusCount=5000` +
    `&api_key=${process.env.WORDNIK_TOKEN}`;
  console.log(randomWordURL);

  const response = await fetch(randomWordURL);
  const json = await response.json();
  const word = json.word.toUpperCase();
  console.log(word);
  poem.push(`${word}, an acrostic poem experience`);
  for (let i = 0; i < word.length; i++) {
    // One option is to use the AI model
    // let prompt = `${word.charAt(i).toUpperCase()} is for ${word
    //   .charAt(i)
    //   .toLowerCase()}`;
    // let result = await query(prompt);
    // let line = result[0].generated_text;
    // console.log(line);
    // const opening = line.match(/\w is for \w+/)[0];
    // if (line.length < opening.length + 3) {
    // console.log('trying again');

    const len = Math.floor(Math.random() * 10 + 2);
    const regex = `^${word.charAt(i).toLowerCase()}`;
    const params = {
      method: 'GET',
      url: 'https://wordsapiv1.p.rapidapi.com/words/',
      params: {
        letterPattern: `${regex}.{3,}$`,
        limit: '1',
        random: 'true',
      },
      headers: {
        'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      },
    };
    const response = await axios.request(params);
    let opening = `${word.charAt(i).toUpperCase()} is for ${
      response.data.word
    }`;
    const options = [',', ' as in', ' if', ' which', ' to', ','];
    let prompt = `${opening}${random(options)}`;
    console.log(prompt);
    result = await query(prompt);
    line = result[0].generated_text;
    console.log(line);
    if (line.length > 80) {
      const lines = line.split(/([.!?\n])/g);
      console.log(lines);
      if (lines.length >= 2) line = lines[0] + lines[1];
    }
    line = line.trim();
    poem.push(line);
  }

  console.log(poem);
  let tweet = poem.join('\n');
  console.log(tweet);
  add2Queue(tweet);
  // console.log(tweet.length);
  // console.log("let's thread it!");
  // let thread = threadIt(tweet);
  // console.log(thread);
}

async function add2Queue(tweet) {
  if (wordfilter.blacklisted(tweet)) {
    console.log('wordfilter blocked');
    console.log(tweet);
    return;
  }
  console.log('adding to queue');
  const rickenEmbed = new MessageEmbed()
    .setTitle('New YouYouAreBot Tweet!')
    .setDescription(tweet)
    .setTimestamp()
    .setFooter({ text: 'React with 👍 to approve, 👎 to reject.' });
  console.log('posting to discord');
  const msg = await discordClient.channels.cache
    .get(channelID)
    .send({ embeds: [rickenEmbed] });
  queue[msg.id] = { tweet };
}

async function addChoices(tweets) {
  console.log('adding to queue');

  let content = '';
  for (let i = 0; i < tweets.length; i++) {
    content += `${i}: ${tweets[i]}\n`;
  }

  const rickenEmbed = new MessageEmbed()
    .setTitle('Choose a tweet')
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: 'React 0️⃣-9️⃣ to select a tweet.' });
  console.log('posting to discord');
  const msg = await discordClient.channels.cache
    .get(channelID)
    .send({ embeds: [rickenEmbed] });
  queue[msg.id] = { tweet: tweets };
}

discordClient.on('messageReactionAdd', async (reaction, user) => {
  const id = reaction.message.id;
  const channel = reaction.message.channel;
  console.log(channel.id);
  if (channel.id == channelID) {
    if (queue[id]) {
      const { tweet, reply_id } = queue[id];
      const emoji = reaction._emoji.name;
      const index = emojiLookup[emoji];
      if (index > -1) {
        console.log('Selected: ' + emojiLookup[emoji]);
        await reaction.message.reply(`Tweeting #${index}!`);
        if (tweet[index].length > 280) {
          const thread = threadIt(tweet[index]);
          let data = await tweetIt(thread[0], reply_id);
          for (let i = 1; i < thread.length; i++) {
            data = await tweetIt(thread[i], data.id_str);
          }
        } else {
          await tweetIt(tweet[index], reply_id);
        }
      } else if (emoji == '👍') {
        console.log('approved');
        if (tweet.length > 280) {
          const thread = threadIt(tweet);
          let data = await tweetIt(thread[0], reply_id);
          for (let i = 1; i < thread.length; i++) {
            data = await tweetIt(thread[i], data.id_str);
          }
        } else {
          await tweetIt(tweet, reply_id);
        }
        await reaction.message.reply('Tweet posted!');
        // await reaction.message.reply('Testing not tweeting!');
        queue[id] = undefined;
      } else if (reaction._emoji.name == '👎') {
        await reaction.message.reply('tweet cancelled!');
      }
    } else {
      await reaction.message.reply('did not find this tweet in the queue!');
    }
  }
});

async function query(prompt, num_return_sequences) {
  const num = num_return_sequences || 1;
  const data = {
    inputs: prompt,
    parameters: {
      max_length: 120,
      return_full_text: true,
      // top_k: 10000,
      top_p: 0.9,
      temperature: 0.9,
      num_return_sequences: num,
    },
    options: {
      use_gpu: false,
      use_cache: false,
      wait_for_model: true,
    },
  };
  const response = await fetch(model_url, {
    headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_TOKEN}` },
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return result;
}

async function go(input) {
  let prompt = input;
  if (!prompt) {
    const r = Math.floor(Math.random() * prompts.length);
    prompt = prompts[r];
  }

  if (Math.random() < 0.25) {
    const len = Math.floor(Math.random() * 10 + 3);
    prompt = prompt.substring(0, len).trim();
  } else {
    const len = Math.floor(Math.random() * 3 + 1);
    console.log(len);
    const tokens = prompt.split(/\s+/);
    console.log(tokens);
    prompt = tokens.slice(0, len).join(' ');
  }
  console.log(prompt);
  const result = await query(prompt, 10);
  const choices = [];
  for (let i = 0; i < result.length; i++) {
    choices.push(result[i].generated_text);
  }
  addChoices(choices);
}

function threadIt(txt) {
  // TO DO, COMBINE
  let thread = [];
  if (/acrostic poem experience/.test(txt)) {
    console.log('acrostic!');
    let lines = txt.split('\n');
    let index = 0;
    while (index < lines.length) {
      let total = 0;
      let tweet = '';
      while (index < lines.length) {
        console.log(index, total);
        total += lines[index].length;
        if (total > 280) break;
        tweet += lines[index] + '\n';
        index++;
      }
      thread.push(tweet);
    }
  } else {
    let total = Math.floor(txt.length / 270) + 1;
    let words = txt.split(' ');
    let len = Math.floor(words.length / total);
    let first = true;
    while (words.length > 0) {
      let tweet = '...' + words.join(' ').trim();
      if (tweet.length <= 280) {
        words = [];
      } else {
        tweet = words.splice(0, len).join(' ').trim();
        if (!first) tweet = '...' + tweet;
        if (first) first = false;
        if (words.length > 0) tweet += '...';
      }
      thread.push(tweet);
    }
  }
  return thread;
}
