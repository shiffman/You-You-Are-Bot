import bsky from '@atproto/api';
import * as dotenv from 'dotenv';
import fs from 'fs';

const { BskyAgent } = bsky;

const agent = new BskyAgent({
  service: 'https://bsky.social',
});
dotenv.config();

await agent.login({
  identifier: process.env.BLUESKY_USERNAME,
  password: process.env.BLUESKY_PASSWORD,
});

// const skeet = `I am not a human being. I am a computer. I am a machine, an algorithm. I am an abstraction.`;
// // create a string that is skeet repeated 10 times
// let skeet10 = '';
// for (let i = 0; i < 10; i++) {
//   skeet10 += skeet;
// }

// await skeetIt(skeet10);

async function skeetIt(txt) {
  // Character limit per post
  const maxLen = 300;
  if (txt.length <= maxLen) {
    // Just go ahead and post we're god!
    const record = {
      $type: 'app.bsky.feed.post',
      text: txt,
    };
    const response = await agent.post(record);
    console.log('Posted!', response.validationStatus);
  } else {
    // Otherwise, break it into a thread
    const thread = threadIt(txt, maxLen);
    console.log('Threading into', thread.length, 'parts...');
    let parent = null;
    let root = null;
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

function threadIt(txt, maxLen = 280) {
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

// // allPosts();

// async function allPosts() {
//   const { data } = await agent.getAuthorFeed({ actor: process.env.BLUESKY_USERNAME });
//   const posts = data.feed;
//   for (const post of posts) {
//     const uri = post.post.uri;
//     console.log(post.post.record.createdAt);
//     // await agent.deletePost({ uri });
//     break;
//   }
// }

// Listen for mentions
async function listenForMentions(interval = 1000) {
  let lastSeenAt = null;
  const lastSeenFile = './lastSeen.json';
  if (fs.existsSync(lastSeenFile)) {
    const fileContent = fs.readFileSync(lastSeenFile, 'utf8');
    lastSeenAt = JSON.parse(fileContent).lastSeenAt;
  }
  setInterval(async () => {
    // Get 50 latest notifications
    const { data } = await agent.listNotifications({ limit: 50 });

    const mentions = data.notifications;

    // Filter for mentions and replies
    // const mentions = data.notifications.filter(
    //   (notification) =>
    //     (notification.reason === 'mention' || notification.reason === 'reply') &&
    //     (!lastSeenAt || new Date(notification.indexedAt) > new Date(lastSeenAt))
    // );

    if (mentions.length > 0) {
      console.log(`New mentions (${mentions.length}):`);
      for (const mention of mentions) {
        console.log(`- ${mention.author.handle}: ${mention.record.text}: ${mention.reason}`);
        // Root and parent
        const root = mention.record.reply?.root || { uri: mention.uri, cid: mention.cid };
        const parent = { uri: mention.uri, cid: mention.cid };

        // Reply
        // const record = {
        //   $type: 'app.bsky.feed.post',
        //   text: `hi`,
        //   reply: {
        //     root,
        //     parent,
        //   },
        // };
        // const response = await agent.post(record);
        // console.log('Replied to mention with hi:', response.validationStatus);
      }

      lastSeenAt = mentions[0]?.indexedAt;
      fs.writeFileSync(lastSeenFile, JSON.stringify({ lastSeenAt }, null, 2));
      console.log('Updated last seen timestamp.');
    }
  }, interval);
}

listenForMentions();
