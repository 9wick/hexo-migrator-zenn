import Parser from 'rss-parser';


export const getZennJson = async (username: string) => {


  let parser = new Parser();
  const url = `https://zenn.dev/${username}/feed?all=1`
  let feed = await parser.parseURL(url);



  return feed.items;
}