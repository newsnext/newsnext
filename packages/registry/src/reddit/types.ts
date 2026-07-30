export interface RedditImageSource {
  url?: string
}

export interface RedditMediaSource {
  gif?: string
  mp4?: string
  u?: string
}

export interface RedditMedia {
  s?: RedditMediaSource
}

export interface RedditPost {
  author?: string
  created_utc?: number
  gallery_data?: {
    items?: Array<{
      media_id?: string
    }>
  }
  media_metadata?: Record<string, RedditMedia>
  num_comments?: number
  permalink?: string
  preview?: {
    images?: Array<{
      source?: RedditImageSource
    }>
  }
  score?: number
  selftext?: string
  sr_detail?: {
    community_icon?: string
    display_name?: string
    icon_img?: string
    public_description?: string
    title?: string
  }
  subreddit?: string
  thumbnail?: string
  title?: string
}

export interface RedditListingResponse {
  data?: {
    children?: Array<{
      data?: RedditPost
      kind?: string
    }>
  }
  message?: string
}
