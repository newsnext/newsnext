import type { ProviderConfig } from "@newsnext/source/registry"
import type { SourceLoaderContext, SourceLoaderOutput, SourcePresentationMetadata } from "@newsnext/source/types"
import type {
  RedditListingResponse,
  RedditPost,
} from "./types"
import { REDDIT_ORIGIN, redditPostsToNewsItems } from "./utils"

const REDDIT_LISTING_LIMIT = 50
const REDDIT_USER_ITEM_TEMPLATE = {
  inline: "{% if scope.item.attributes.community %}{{ scope.item.attributes.community }} · {% endif %}{{ scope.item.stats.score | compact_number }} points · {{ scope.item.stats.comments | compact_number }} comments",
} as const
const REDDIT_SUBREDDIT_ITEM_TEMPLATE = {
  inline: "{% if scope.item.author %}{{ scope.item.author.name }} · {% endif %}{{ scope.item.stats.score | compact_number }} points · {{ scope.item.stats.comments | compact_number }} comments",
} as const
const REDDIT_RADAR_HOSTS = ["reddit.com", "old.reddit.com", "new.reddit.com"]
const SUBREDDIT_SORT_OPTIONS = [
  { label: "Best", value: "best" },
  { label: "Hot", value: "hot" },
  { label: "New", value: "new" },
  { label: "Rising", value: "rising" },
] as const
const SUBREDDIT_TOP_PERIOD_OPTIONS = [
  { label: "Past Hour", value: "hour" },
  { label: "Past Day", value: "day" },
  { label: "Past Week", value: "week" },
  { label: "Past Month", value: "month" },
  { label: "Past Year", value: "year" },
  { label: "All Time", value: "all" },
] as const

type SubredditSort = typeof SUBREDDIT_SORT_OPTIONS[number]["value"]
type SubredditTopPeriod = typeof SUBREDDIT_TOP_PERIOD_OPTIONS[number]["value"]

async function fetchRedditListing(
  path: string,
  context: SourceLoaderContext,
  query: Record<string, string | number> = {},
): Promise<RedditListingResponse> {
  const response = await context.fetch.get(`${REDDIT_ORIGIN}${path}`, {
    headers: {
      accept: "application/json",
    },
    searchParams: {
      limit: REDDIT_LISTING_LIMIT,
      raw_json: 1,
      sr_detail: 1,
      ...query,
    },
  }).json<RedditListingResponse>()
  if (!response.data?.children) {
    throw new Error(response.message ?? "Reddit returned an empty listing.")
  }
  return response
}

function getRedditPosts(listing: RedditListingResponse): RedditPost[] {
  return listing.data?.children
    ?.flatMap(child => child.kind === "t3" && child.data ? [child.data] : []) ?? []
}

async function fetchRedditUserPosts(
  { username }: { username: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const normalizedUsername = username.trim()
  if (!/^[\w-]{3,20}$/.test(normalizedUsername)) {
    throw new Error("Reddit username must contain 3–20 letters, numbers, underscores, or hyphens.")
  }

  const encodedUsername = encodeURIComponent(normalizedUsername)
  const listing = await fetchRedditListing(
    `/user/${encodedUsername}/submitted.json`,
    context,
    { sort: "new" },
  )
  const posts = getRedditPosts(listing)
  return {
    items: redditPostsToNewsItems(posts, {
      includeSubredditIcon: true,
    }),
    itemTemplate: REDDIT_USER_ITEM_TEMPLATE,
    metadata: {
      title: `u/${normalizedUsername}`,
    },
  }
}

async function fetchSubredditPosts(
  { sort, subreddit }: { sort: SubredditSort, subreddit: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  return fetchSubredditListing(subreddit, sort, context)
}

async function fetchSubredditTopPosts(
  { period, subreddit }: { period: SubredditTopPeriod, subreddit: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  return fetchSubredditListing(subreddit, "top", context, { t: period })
}

async function fetchSubredditListing(
  subreddit: string,
  sort: SubredditSort | "top",
  context: SourceLoaderContext,
  query: Record<string, string | number> = {},
): Promise<SourceLoaderOutput> {
  const normalizedSubreddit = subreddit.trim()
  if (!/^\w{2,21}$/.test(normalizedSubreddit)) {
    throw new Error("Subreddit name must contain 2–21 letters, numbers, or underscores.")
  }

  const encodedSubreddit = encodeURIComponent(normalizedSubreddit)
  const listing = await fetchRedditListing(
    `/r/${encodedSubreddit}/${sort}.json`,
    context,
    query,
  )
  const posts = getRedditPosts(listing)
  const community = posts.find(post => post.sr_detail)?.sr_detail
  const displayName = community?.display_name ?? normalizedSubreddit
  const badge = community?.community_icon || community?.icon_img
  const metadata: SourcePresentationMetadata = { title: `r/${displayName}` }
  if (community?.public_description) metadata.desc = community.public_description
  if (badge) metadata.badge = badge
  return {
    items: redditPostsToNewsItems(posts),
    itemTemplate: REDDIT_SUBREDDIT_ITEM_TEMPLATE,
    metadata,
  }
}

const subredditRadarRules = [
  {
    id: "reddit-subreddit",
    match: {
      hosts: REDDIT_RADAR_HOSTS,
      paths: [
        "/r/:subreddit",
        "/r/:subreddit/comments/:postId",
        "/r/:subreddit/comments/:postId/*rest",
      ],
    },
    patch: {
      params: {
        subreddit: "{{ scope.path.subreddit }}",
        sort: "hot",
      },
      metadata: {
        title: "r/{{ scope.params.subreddit }}",
        home: "/r/{{ scope.params.subreddit | url_path }}/hot/",
      },
    },
    confidence: 0.95,
  },
  ...SUBREDDIT_SORT_OPTIONS.map(({ value }) => ({
    id: `reddit-subreddit-${value}`,
    match: {
      hosts: REDDIT_RADAR_HOSTS,
      paths: [
        `/r/:subreddit/${value}`,
        `/r/:subreddit/${value}/*rest`,
      ],
    },
    patch: {
      params: {
        subreddit: "{{ scope.path.subreddit }}",
        sort: value,
      },
      metadata: {
        title: "r/{{ scope.params.subreddit }}",
        home: `/r/{{ scope.params.subreddit | url_path }}/${value}/`,
      },
    },
    confidence: 0.95,
  })),
]

export default {
  title: "Reddit",
  category: "forum",
  icon: "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png",
  color: "orange",
  defaults: {
    baseUrl: `${REDDIT_ORIGIN}/`,
    capabilities: {
      network: ["www.reddit.com"],
    },
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      home: "/",
    },
  },
  sources: {
    "user": {
      metadata: {
        title: "User Posts",
        desc: "Latest posts submitted by a Reddit user",
      },
      params: {
        username: {
          type: "text",
          title: "Username",
          default: "spez",
        },
      },
      radar: [
        {
          id: "reddit-user",
          match: {
            hosts: REDDIT_RADAR_HOSTS,
            paths: [
              "/user/:username",
              "/user/:username/*rest",
              "/u/:username",
              "/u/:username/*rest",
            ],
          },
          patch: {
            params: {
              username: "{{ scope.path.username }}",
            },
            metadata: {
              title: "u/{{ scope.params.username }}",
              home: "/user/{{ scope.params.username | url_path }}/submitted/",
            },
          },
          confidence: 0.95,
        },
      ],
      loader: {
        load: fetchRedditUserPosts,
      },
    },
    "subreddit": {
      metadata: {
        title: "Subreddit",
        desc: "Posts in a Subreddit",
      },
      params: {
        subreddit: {
          type: "text",
          title: "Subreddit",
          default: "programming",
        },
        sort: {
          type: "select",
          title: "Sort",
          values: SUBREDDIT_SORT_OPTIONS,
          default: "hot",
        },
      },
      radar: subredditRadarRules,
      loader: {
        load: fetchSubredditPosts,
      },
    },
    "subreddit-top": {
      metadata: {
        title: "Subreddit Top",
        desc: "Top posts in a Subreddit",
      },
      params: {
        subreddit: {
          type: "text",
          title: "Subreddit",
          default: "programming",
        },
        period: {
          type: "select",
          title: "Period",
          values: SUBREDDIT_TOP_PERIOD_OPTIONS,
          default: "day",
        },
      },
      radar: [
        {
          id: "reddit-subreddit-top",
          match: {
            hosts: REDDIT_RADAR_HOSTS,
            paths: [
              "/r/:subreddit/top",
              "/r/:subreddit/top/*rest",
            ],
          },
          patch: {
            params: {
              period: "{{ scope.query.t | default: 'day' }}",
              subreddit: "{{ scope.path.subreddit }}",
            },
            metadata: {
              title: "r/{{ scope.params.subreddit }} Top",
              home: "/r/{{ scope.params.subreddit | url_path }}/top/?t={{ scope.params.period | url_query }}",
            },
          },
          confidence: 0.95,
        },
      ],
      loader: {
        load: fetchSubredditTopPosts,
      },
    },
  },
} satisfies ProviderConfig
