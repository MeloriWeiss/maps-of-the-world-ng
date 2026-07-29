export interface MapSummary {
  id: number;
  name: string;
  description: string | null;
  isPublished: boolean;
  likesCount: number;
  commentsCount: number;
}

export interface StoredMap extends MapSummary {
  body: string;
}

export interface SaveMap {
  name: string;
  description?: string;
  body: string;
}
