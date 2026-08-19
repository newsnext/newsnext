export type TopicFeedOrder = "recent" | "hottest"

export interface JikePicture {
  middlePicUrl?: string
  picUrl?: string
  smallPicUrl?: string
  thumbnailUrl?: string
}

export interface JikeUser {
  avatarImage?: JikePicture
  profileImageUrl?: string
  screenName?: string
  username?: string
}

export interface JikePost {
  id?: string
  type?: string
  content?: string
  createdAt?: string
  actionTime?: string
  commentCount?: number
  likeCount?: number
  repostCount?: number
  pictures?: JikePicture[]
  target?: JikePost
  topic?: {
    content?: string
  }
  user?: JikeUser
  linkInfo?: {
    pictureUrl?: string
    title?: string
  }
  pinned?: {
    personalUpdate?: boolean
  }
}

export interface JikeFeedResponse {
  success?: boolean
  data?: JikePost[]
  loadMoreKey?: unknown
  error?: {
    message?: string
  }
  toast?: string
}
