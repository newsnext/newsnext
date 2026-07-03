export type TopicFeedOrder = "recent" | "hottest"

export interface JikeTopicFeedParams {
  topicId: string
}

export interface JikeUserUpdatesParams {
  username: string
}

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

export interface JikeTopic {
  content?: string
}

export interface JikeLinkInfo {
  linkUrl?: string
  pictureUrl?: string
  source?: string
  title?: string
}

export interface JikePost {
  id?: string
  type?: string
  content?: string
  createdAt?: string
  actionTime?: string
  commentCount?: number
  likeCount?: number
  pictures?: JikePicture[]
  target?: JikePost
  topic?: JikeTopic
  user?: JikeUser
  linkInfo?: JikeLinkInfo
  pinned?: {
    personalUpdate?: boolean
  }
}

export interface JikeFeedResponse {
  success?: boolean
  data?: JikePost[]
  error?: {
    message?: string
  }
  toast?: string
}

export interface JikeRequestOptions {
  body: Record<string, unknown>
}
