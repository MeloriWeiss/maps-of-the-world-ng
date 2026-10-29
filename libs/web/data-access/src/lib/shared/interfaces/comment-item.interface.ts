/** Данные комментария для общих компонентов отображения. */
export interface CommentItem {
  id: number;
  user: string;
  text: string;
  date: string;
  replies: CommentItem[];
}
