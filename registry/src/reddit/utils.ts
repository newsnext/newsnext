import type { NewsItemInput } from "@newsnext/source-kit/types"
import type { RedditPost } from "./types"

export const REDDIT_ORIGIN = "https://www.reddit.com"

interface RedditPostsToNewsItemsOptions {
  includeSubredditIcon?: boolean
}

function normalizeRedditImageUrl(url: string | undefined): string | undefined {
  const normalizedUrl = url?.replaceAll("&amp;", "&").trim()
  return normalizedUrl && /^https?:\/\//.test(normalizedUrl) ? normalizedUrl : undefined
}

function getRedditPostPictures(post: RedditPost): string[] {
  const galleryPictures = post.gallery_data?.items
    ?.map(item => item.media_id ? post.media_metadata?.[item.media_id]?.s : undefined)
    .map(source => normalizeRedditImageUrl(source?.u ?? source?.gif ?? source?.mp4))
    .filter((url): url is string => Boolean(url))
  if (galleryPictures?.length) return [...new Set(galleryPictures)]

  const previewPicture = normalizeRedditImageUrl(post.preview?.images?.[0]?.source?.url)
  if (previewPicture) return [previewPicture]

  const thumbnail = normalizeRedditImageUrl(post.thumbnail)
  return thumbnail ? [thumbnail] : []
}

export function redditPostsToNewsItems(
  posts: RedditPost[],
  options: RedditPostsToNewsItemsOptions = {},
): NewsItemInput[] {
  const { includeSubredditIcon = false } = options
  const seen = new Set<string>()

  return posts.flatMap((post): NewsItemInput[] => {
    const title = post.title?.trim()
    const permalink = post.permalink?.trim()
    if (!title || !permalink) return []

    const url = new URL(permalink, REDDIT_ORIGIN).href
    if (seen.has(url)) return []
    seen.add(url)

    const previewText = post.selftext?.trim() ?? ""
    const pictures = getRedditPostPictures(post)
    const subredditIcon = includeSubredditIcon
      ? post.sr_detail?.community_icon || post.sr_detail?.icon_img
      : undefined
    const item: NewsItemInput = {
      title,
      url,
      publishedAt: typeof post.created_utc === "number" ? post.created_utc * 1000 : undefined,
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
