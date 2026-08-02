export interface MapSummary {
  id: number;
  name: string;
  description: string | null;
  isPublished: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface PublishedMapSummary extends MapSummary {
  isLiked: boolean;
  author: {
    id: number;
    nickname: string;
  };
}

export interface StoredMap extends MapSummary {
  body: string;
}

export interface PublishedStoredMap extends StoredMap {
  isLiked: boolean;
  author: {
    id: number;
    nickname: string;
  };
}

export interface SaveMap {
  name: string;
  description?: string;
  body: string;
}

export interface LikeState {
  isLiked: boolean;
  likesCount: number;
}
