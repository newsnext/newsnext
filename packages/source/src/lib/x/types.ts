export interface XPlaceTrendResponse {
  trends: Array<{
    name: string
    url: string
  }>
  created_at?: string
}

export interface XTimelineInstruction {
  type?: string
  entry?: XTimelineEntry
  entries?: XTimelineEntry[]
}

export interface XTimelineEntry {
  entryId?: string
  content?: {
    itemContent?: {
      tweet_results?: {
        result?: XTweetResult
      }
    }
  }
}

export interface XTweetResult {
  __typename?: string
  tweet?: XTweetResult
  rest_id?: string
  core?: {
    user_results?: {
      result?: {
        legacy?: {
          profile_image_url_https?: string
          screen_name?: string
        }
      }
    }
  }
  legacy?: {
    created_at?: string
    favorite_count?: number
    full_text?: string
    entities?: {
      media?: Array<{
        media_url_https?: string
      }>
    }
  }
  note_tweet?: {
    note_tweet_results?: {
      result?: {
        text?: string
      }
    }
  }
}

export interface XUserTweetsResponse {
  data?: {
    user?: {
      result?: {
        timeline_v2?: {
          timeline?: {
            instructions?: XTimelineInstruction[]
          }
        }
      }
    }
  }
}

export interface XHomeTimelineResponse {
  data?: {
    home?: {
      home_timeline_urt?: {
        instructions?: XTimelineInstruction[]
      }
    }
  }
}

export interface XUserByScreenNameResponse {
  data?: {
    user?: {
      result?: {
        rest_id?: string
      }
    }
  }
}

export const LOCATION_OPTIONS = [
  { label: "Worldwide", value: "1" },
  { label: "United States", value: "23424977" },
  { label: "United Kingdom", value: "23424975" },
  { label: "Japan", value: "23424856" },
  { label: "Hong Kong", value: "24865698" },
  { label: "Taiwan", value: "23424971" },
  { label: "Singapore", value: "23424948" },
  { label: "India", value: "23424848" },
  { label: "Brazil", value: "23424768" },
  { label: "Germany", value: "23424829" },
] as const
