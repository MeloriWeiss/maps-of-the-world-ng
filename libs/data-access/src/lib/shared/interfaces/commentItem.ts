export interface CommentItem {
  id: number;
  user: string;
  text: string;
  date: string;
  replies: CommentItem[];
}
