import type { NewsItem } from "@newsnext/source/types"
import type { RedditPost } from "./types"

export const REDDIT_ORIGIN = "https://www.reddit.com"

interface RedditPostsToNewsItemsOptions {
  includeAuthor?: boolean
  includeSubredditIcon?: boolean
  includeSubreddit?: boolean
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

function formatCount(value: number, singular: string, plural: string): string {
  const formattedValue = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value)
  return `${formattedValue} ${value === 1 ? singular : plural}`
}

export function redditPostsToNewsItems(
  posts: RedditPost[],
  options: RedditPostsToNewsItemsOptions = {},
): NewsItem[] {
  const {
    includeAuthor = true,
    includeSubredditIcon = false,
    includeSubreddit = true,
  } = options
  const seen = new Set<string>()

  return posts.flatMap((post): NewsItem[] => {
    const title = post.title?.trim()
    const permalink = post.permalink?.trim()
    if (!title || !permalink) return []

    const url = new URL(permalink, REDDIT_ORIGIN).href
    if (seen.has(url)) return []
    seen.add(url)

    const inlineText = [
      includeSubreddit && post.subreddit ? `r/${post.subreddit}` : undefined,
      includeAuthor && post.author ? `u/${post.author}` : undefined,
      typeof post.score === "number" ? formatCount(post.score, "point", "points") : undefined,
      typeof post.num_comments === "number"
        ? formatCount(post.num_comments, "comment", "comments")
        : undefined,
    ].filter((value): value is string => Boolean(value)).join(" · ")
    const previewText = post.selftext?.trim() ?? ""
    const pictures = getRedditPostPictures(post)
    const subredditIcon = includeSubredditIcon
      ? post.sr_detail?.community_icon || post.sr_detail?.icon_img
      : undefined
    const item: NewsItem = {
      title,
      url,
    }

    if (typeof post.created_utc === "number") item.timestamp = post.created_utc * 1000
    if (inlineText || subredditIcon) {
      item.inline = {
        ...(inlineText ? { text: inlineText } : {}),
        ...(subredditIcon
          ? { icon: { src: subredditIcon, radius: 999 } }
          : {}),
      }
    }
    if (previewText || pictures.length) {
      item.preview = {
        text: previewText,
        ...(pictures.length ? { picture: pictures } : {}),
      }
    }
    return [item]
  })
}
