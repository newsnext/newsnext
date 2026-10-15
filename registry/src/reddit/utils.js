import { fieldTransforms } from "@newsnext/sdk/source"

export const REDDIT_ORIGIN = "https://www.reddit.com"
function normalizeRedditImageUrl(url) {
  const normalizedUrl = url?.replaceAll("&amp;", "&").trim()
  return normalizedUrl && /^https?:\/\//.test(normalizedUrl) ? normalizedUrl : undefined
}
function getRedditPostPictures(post) {
  const galleryPictures = post.gallery_data?.items
    ?.map(item => item.media_id ? post.media_metadata?.[item.media_id]?.s : undefined)
    .map(source => normalizeRedditImageUrl(source?.u ?? source?.gif ?? source?.mp4))
    .filter(url => Boolean(url))
  if (galleryPictures?.length)
    return [...new Set(galleryPictures)]
  const previewPicture = normalizeRedditImageUrl(post.preview?.images?.[0]?.source?.url)
  if (previewPicture)
    return [previewPicture]
  const thumbnail = normalizeRedditImageUrl(post.thumbnail)
  return thumbnail ? [thumbnail] : []
}
export function redditPostsToNewsItems(posts, options = {}) {
  const { includeSubredditIcon = false } = options
  const seen = new Set()
  return posts.flatMap((post) => {
    const title = post.title?.trim()
    const permalink = post.permalink?.trim()
    if (!title || !permalink)
      return []
    const url = new URL(permalink, REDDIT_ORIGIN).href
    if (seen.has(url))
      return []
    seen.add(url)
    const previewText = post.selftext?.trim() ?? ""
    const pictures = getRedditPostPictures(post)
    const subredditIcon = includeSubredditIcon
      ? post.sr_detail?.community_icon || post.sr_detail?.icon_img
      : undefined
    const item = {
      title,
      url,
      publishedAt: fieldTransforms.seconds_to_ms(post.created_utc),
      author: {
        name: post.author ? `u/${post.author}` : undefined,
        home: post.author ? `${REDDIT_ORIGIN}/user/${post.author}/` : undefined,
      },
      stats: {
        score: post.score,
        comments: post.num_comments,
      },
      attributes: { community: post.subreddit ? `r/${post.subreddit}` : undefined },
      icon: {
        kind: "community",
        label: post.subreddit ? `r/${post.subreddit}` : undefined,
        src: subredditIcon,
      },
      content: {
        text: previewText || undefined,
        pictures,
      },
    }
    return [item]
  })
}
