import {getZennJson} from "./zenn";

import {parse as parseUrl} from 'url';
import {exists, listDir, readFile} from 'hexo-fs';
import {join, parse} from 'path';
import type Hexo from "hexo";
import type {PromiseType} from "utility-types";

import {slugize} from 'hexo-util';

// cannot find unescapeHTML in type
const {unescapeHTML} = require('hexo-util');


export const migrator = async function (this: Hexo, args: any) {
  const source = args._.shift();
  const {alias, redirect, addtag} = args;
  const skipduplicate = Object.prototype.hasOwnProperty.call(args, 'skipduplicate');
  let {limit} = args;
  const {config, log} = this;
  const Post = this.post;
  let untitledPostCounter = 0;
  let errNum = 0;
  let skipNum = 0;
  const rEntity = /&#?\w{2,4};/;
  const posts = [];
  let currentPosts: string[] = [];
  let feed: PromiseType<ReturnType<typeof getZennJson>>


  try {
    if (!source) {
      const help = [
        'Usage: hexo migrate zenn <username> [--alias]',
        '',
        'For more help, you can check the docs: http://hexo.io/docs/migration.html'
      ];

      throw help.join('\n');
    }

    feed = await getZennJson(source);
    log.info('Analyzing %s...', feed);

  } catch (err) {
    // @ts-ignore
    throw new Error(err);
  }

  if (feed) {
    if (typeof limit !== 'number' || limit > feed.length || limit <= 0) limit = feed.length;

    for (let i = 0; i < limit; i++) {
      const item = feed[i]!;
      const url = item.link;
      const created_at = item.pubDate;
      const {summary, content} = item;
      let title = item.title;


      if (!title) {
        untitledPostCounter += 1;
        const untitledPostTitle = 'Untitled Post - ' + untitledPostCounter;
        title = untitledPostTitle;
        log.warn('Post found but without any titles. Using %s', untitledPostTitle);
      } else {
        log.info('Post found: %s', title);
      }

      if (rEntity.test(title)) title = unescapeHTML(title) as string;
      if (title.includes('"') && (title.includes(':') || title.startsWith('#') || title.startsWith('!!'))) title = title.replace(/"/g, '\\"');

      const newPost = {
        title,
        date: created_at,
        tags: [...(addtag ? ["zenn"] : [])],
        alias: alias && url ? parseUrl(url).pathname : undefined,
        redirect: redirect && url ? url : undefined,
        ...(summary || content ? {
          excerpt: summary || content,
          content: summary || content,
        } : {})
      };


      posts.push(newPost);
    }
  }

  if (skipduplicate) {
    const postFolder = join(config.source_dir, '_posts');
    const folderExist = await exists(postFolder);
    const files = folderExist ? await listDir(join(config.source_dir, '_posts')) : [];
    currentPosts = files.map((file: string) => slugize(parse(file).name, {transform: 1}));
  }

  if (posts.length >= 1) {
    for (const post of posts) {
      if (currentPosts.length && skipduplicate) {
        if (currentPosts.includes(slugize(post.title, {transform: 1}))) {
          skipNum++;
          continue;
        }
      }
      try {
        await Post.create(post);
      } catch (err) {
        log.error(err);
        errNum++;
      }
    }

    const postsNum = posts.length - errNum - skipNum;
    if (untitledPostCounter) {
      log.warn('%d posts did not have titles and were prefixed with "Untitled Post".', untitledPostCounter);
    }
    if (postsNum) log.info('%d posts migrated.', postsNum);
    if (errNum) log.error('%d posts failed to migrate.', errNum);
    if (skipNum) log.info('%d posts skipped.', skipNum);
  }
};

