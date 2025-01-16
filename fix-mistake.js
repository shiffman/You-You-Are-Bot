import bsky from '@atproto/api';
import * as dotenv from 'dotenv';

dotenv.config();

const { BskyAgent } = bsky;

const agent = new BskyAgent({
  service: 'https://bsky.social',
});

await agent.login({
  identifier: process.env.BLUESKY_USERNAME,
  password: process.env.BLUESKY_PASSWORD,
});

async function deletePostsWithText(targetText) {
  try {
    console.log(`Fetching posts for user: ${process.env.BLUESKY_USERNAME}`);

    // Fetch posts from your feed
    const { data } = await agent.getAuthorFeed({ actor: process.env.BLUESKY_USERNAME });
    const posts = data.feed;

    if (!posts || posts.length === 0) {
      console.log('No posts found.');
      return;
    }

    // Iterate over posts and delete those matching the target text
    for (const post of posts) {
      const postText = post.post.record.text;
      if (postText.trim().toLowerCase() === targetText.toLowerCase()) {
        const postUri = post.post.uri;
        console.log(`Deleting post: "${postText}" with URI: ${postUri}`);
        const response = await agent.deletePost(postUri);
        console.log(response);
        console.log('Post deleted successfully.');
      }
    }

    console.log('Completed processing posts.');
  } catch (error) {
    console.error('Error while deleting posts:', error);
  }
}

// Delete all posts containing "hi"
await deletePostsWithText('hi');
