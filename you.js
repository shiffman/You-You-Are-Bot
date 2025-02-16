import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import { RiTa } from 'rita';
import * as dotenv from 'dotenv';
import bsky from '@atproto/api';
import OpenAI from 'openai';

import { findPairs, centerOf } from './wordplay.js';

dotenv.config();

const { BskyAgent } = bsky;

const agent = new BskyAgent({
  service: 'https://bsky.social',
});

await agent.login({
  identifier: process.env.BLUESKY_USERNAME,
  password: process.env.BLUESKY_PASSWORD,
});

// const data = fs.readFileSync('data/prompts.txt', 'utf-8');
const channelID = '962162083993100388';

const instructions = fs.readFileSync('prompts/instructions.txt', 'utf-8');
// const instructions_short = fs.readFileSync('prompts/instructions_short.txt', 'utf-8');

const prompt_1 = fs.readFileSync('prompts/prompt-1.txt', 'utf-8');
const prompt_2 = fs.readFileSync('prompts/prompt-2.txt', 'utf-8');
const prompt_acrostic = fs.readFileSync('prompts/prompt-acrostic.txt', 'utf-8');

const yyabook = fs.readFileSync('yya-book/yya-all.txt', 'utf-8');

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

const queue = {};

console.log('Beep beep! 🤖');
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds, // GUILDS
    GatewayIntentBits.GuildMessages, // GUILD_MESSAGES
    GatewayIntentBits.GuildMessageReactions, // GUILD_MESSAGE_REACTIONS
  ],
});
discordClient.login(process.env.DISCORD_TOKEN);
discordClient.once('ready', readyDiscord);

async function readyDiscord() {
  generateTweet();
  const hours = 2;
  setInterval(generateTweet, hours * 60 * 60 * 1000);
  console.log('💖');
  goListen();
}

async function generateTweet(mention) {
  const r = Math.random();
  if (r < 0.05) goPair();
  else if (r < 0.1) await goCenter();
  else await go(mention);
}

function goPair() {
  const pairs = findPairs();
  addChoices(pairs);
}

async function goCenter() {
  const centers = await centerOf();
  addChoices(centers);
}

discordClient.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName, user, options } = interaction;
  console.log(commandName, user.username);
  if (commandName === 'generate-you') {
    let prompt = options.getString('prompt');
    await interaction.deferReply();
    const { rickenEmbed, tweets } = await go(prompt);
    const msg = await interaction.editReply({ embeds: [rickenEmbed] });
    console.log(msg.id);
    queue[msg.id] = { tweet: tweets };
  }
});

function random(arr) {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

async function addChoices(tweets, mention) {
  console.log('adding to queue');
  console.log(tweets);
  let content = '';
  for (let i = 0; i < tweets.length; i++) {
    content += `${i}: ${tweets[i]}\n`;
  }

  if (content.length >= 4096) {
    content = content.substring(0, 4096);
  }

  const rickenEmbed = new EmbedBuilder()
    .setTitle('Choose a tweet')
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: 'React 0️⃣-9️⃣ to select a tweet.' });

  if (mention) {
    const userName = mention.author.handle;

    rickenEmbed.setTitle('New TheYouYouAreBot Reply!');
    rickenEmbed.addFields({
      name: 'reply to',
      value: userName,
    });

    if (!mention.record.text || mention.record.text.length < 1) {
      rickenEmbed.addFields({ name: 'original tweet', value: 'No text found' });
    } else {
      rickenEmbed.addFields({ name: 'original tweet', value: mention.record.text });
    }
    // rickenEmbed.setURL(`????????`);
  }
  const msg = await discordClient.channels.cache.get(channelID).send({ embeds: [rickenEmbed] });
  queue[msg.id] = { tweet: tweets };
  if (mention) {
    // TBD is this right???
    queue[msg.id].reply = {
      parent: { uri: mention.uri, cid: mention.cid },
      root: mention.record.reply?.root || { uri: mention.uri, cid: mention.cid },
    };
    // Let's also put the full mention
    queue[msg.id].mention = mention;
  }
  // console.log(queue);
}

let passCleanup = false;

discordClient.on('messageReactionAdd', async (reaction, user) => {
  const id = reaction.message.id;
  const channel = reaction.message.channel;
  if (channel.id == channelID) {
    if (queue[id]) {
      const { tweet, reply, mention } = queue[id];
      const emoji = reaction._emoji.name;
      const index = emojiLookup[emoji];
      if (index > -1) {
        console.log('Selected: ' + emojiLookup[emoji]);
        if (passCleanup) {
          await reaction.message.reply(`grammar and formatting cleanup`);
          const result = await cleanupOpenAI(tweet[index], reply);
          const choices = [];
          for (let i = 0; i < result.length; i++) {
            choices.push(result[i].message.content);
          }
          await addChoices(choices, mention);
          return;
        }
        await reaction.message.reply(`Tweeting #${index}!`);
        await skeetIt(tweet[index], reply);
      } else if (emoji == '👍') {
        console.log('approved');
        await skeetIt(tweet, reply);
        await reaction.message.reply('Tweet posted!');
        // await reaction.message.reply('Testing not tweeting!');
        queue[id] = undefined;
      } else if (reaction._emoji.name == '👎') {
        await reaction.message.reply('tweet cancelled!');
        await generateTweet(mention);
      } else if (emoji == '🔧') {
        await reaction.message.reply('clean up mode enabled');
        passCleanup = true;
      }
    } else {
      await reaction.message.reply('did not find this tweet in the queue!');
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_SECRET_KEY,
});

async function queryOpenAI(prompt, num = 5) {
  if (!prompt || prompt.length < 1) {
    let r = Math.random();
    if (r < 0.8) {
      let randomConcept = RiTa.randomWord();
      if (Math.random() < 0.5) {
        console.log('wikipedia time');
        const response = await axios.get(
          'https://en.wikipedia.org/api/rest_v1/page/random/summary'
        );
        randomConcept = response.data.title;
        // take anything out that was in parentheses in randomConcept
        randomConcept = randomConcept.replace(/\(.*?\)/g, '');
      }

      console.log(randomConcept);
      let r2 = Math.random();
      if (r2 < 0.2) {
        prompt = 'Tell me a story.';
      } else if (r2 < 0.4) {
        prompt = 'Tell me a story about ' + randomConcept;
      } else if (r2 < 0.6) {
        prompt = 'Tell me about ' + randomConcept;
      } else {
        prompt = 'Explain the concept of ' + randomConcept;
      }
      console.log(prompt);
    } else if (r < 0.95) {
      prompt = prompt_acrostic;
      console.log('acrostic prompt');
    } else {
      prompt = prompt_2;
      console.log('word play prompt');
    }
  }

  const messages = [];
  messages.push({ role: 'system', content: instructions });
  // messages.push({ role: 'system', content: instructions_short });
  messages.push({ role: 'user', content: prompt });
  console.log(process.env.MODEL_NAME);
  const temperature = 0.9 + Math.random() * 0.3;
  console.log('Temperature: ' + temperature);
  const response = await openai.chat.completions.create({
    model: process.env.MODEL_NAME,
    messages: messages,
    response_format: {
      type: 'text',
    },
    temperature,
    max_completion_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    n: num,
  });
  return response.choices;
}

async function cleanupOpenAI(prompt, num = 1) {
  passCleanup = false;
  const messages = [];
  const newPrompt =
    'Please fix up the grammar of this paragraph. It is meant to be written in the style of Dr. Ricken Hale (character from Serverance) so you can make very minor changes to adapt the style, but do not significantly add to or alter the original text. Return only the revised text, no other information at all.\n\n' +
    prompt;

  messages.push({
    role: 'system',
    content:
      "You are now in the grammar and formatting cleanup mode. Please make sure that the text is grammatically correct and in the style of Dr. Ricken Hale. Here is Dr. Ricken Hale's book The You You Are as a style reference.\n\n" +
      yyabook +
      'Even though you have this massive reference, you should only make tiny changes to fix up grammar, formatting, or maybe one or two word choices. Your new text should essentially be identical otherwise.',
  });
  messages.push({ role: 'user', content: newPrompt });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    response_format: {
      type: 'text',
    },
    max_completion_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    n: num,
  });
  return response.choices;
}

async function go(mention) {
  let prompt = mention?.record.text;
  const result = await queryOpenAI(prompt, 8);
  const choices = [];
  for (let i = 0; i < result.length; i++) {
    choices.push(result[i].message.content);
  }
  await addChoices(choices, mention);
}

async function skeetIt(txt, reply) {
  // Character limit per post
  const maxLen = 300;
  if (txt.length <= maxLen) {
    // Just go ahead and post we're god!
    const record = {
      $type: 'app.bsky.feed.post',
      text: txt,
      reply,
    };
    const response = await agent.post(record);
    console.log('Posted!', response.validationStatus);
  } else {
    // Otherwise, break it into a thread
    const thread = threadIt(txt, maxLen);
    console.log('Threading into', thread.length, 'parts...');
    let parent, root;
    if (reply) {
      let parent = reply.parent;
      let root = reply.root;
    }
    for (const skeet of thread) {
      const record = {
        $type: 'app.bsky.feed.post',
        text: skeet,
      };
      if (parent && root) {
        record.reply = {
          root,
          parent,
        };
      }
      const response = await agent.post(record);
      console.log('Posted thread', response.validationStatus);
      if (!root) {
        root = { uri: response.uri, cid: response.cid };
      }
      parent = { uri: response.uri, cid: response.cid };
    }
  }
}

function threadIt(txt, maxLen = 300) {
  const lines = txt.split(/([?!.]+)/g).filter((s) => s.trim().length > 0);
  const thread = [];
  let currentPost = '';
  for (let i = 0; i < lines.length; i++) {
    const nextLine = lines[i];
    const potentialLength = currentPost.length + nextLine.length;
    if (potentialLength <= maxLen) {
      currentPost += nextLine;
    } else {
      thread.push(currentPost.trim());
      currentPost = nextLine;
    }
  }
  if (currentPost.trim()) {
    thread.push(currentPost.trim());
  }
  return thread;
}

let lastSeenAt = null;
const lastSeenFile = './lastSeen.json';
if (fs.existsSync(lastSeenFile)) {
  const fileContent = fs.readFileSync(lastSeenFile, 'utf8');
  lastSeenAt = JSON.parse(fileContent).lastSeenAt;
}

async function goListen() {
  const { data } = await agent.listNotifications({ limit: 50 });
  // Filter for mentions and replies
  const validReasons = ['mention', 'reply', 'quote'];
  const mentions = data.notifications.filter((notification) => {
    const isReasonValid = validReasons.includes(notification.reason);
    const isAfterLastSeen = !lastSeenAt || new Date(notification.indexedAt) > new Date(lastSeenAt);
    return isReasonValid && isAfterLastSeen;
  });
  if (mentions.length > 0) {
    console.log(`New mentions (${mentions.length}):`);
    for (const mention of mentions) {
      console.log(`- ${mention.author.handle}: ${mention.record.text}`);
      console.log('replying!');
      let prompt = mention.record.text;
      console.log('prompt: ' + prompt);
      const result = await queryOpenAI(prompt, 5);
      const choices = [];
      for (let i = 0; i < result.length; i++) {
        choices.push(result[i].message.content);
      }
      await addChoices(choices, mention);
    }

    lastSeenAt = mentions[0]?.indexedAt;
    fs.writeFileSync(lastSeenFile, JSON.stringify({ lastSeenAt }, null, 2));
    console.log('Updated last seen timestamp.');
  }
  setTimeout(goListen, 5000);
}
