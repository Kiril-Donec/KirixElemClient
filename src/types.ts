export interface Post {
  ID: string;
  AuthorID: string;
  Username: string;
  Name: string;
  Avatar: string | 'None';
  UserIcons: string | null;  // Изменили тип с string на string | null
  Text: string;
  Content: string | null;
  Date: string;
  Likes: number;
  Dislikes: number;
  Liked: 'Liked' | null;
  Disliked: 'Liked' | null;
  Comments: number;
  MyPost: boolean;
}

export interface Comment {
  Name: string;
  Username: string;
  Avatar: string | 'None';
  UserIcons: string | null;  // Тоже изменили тип
  Text: string;
  Date: string;
}

export interface ApiResponse {
  Type: 'Error' | 'Verify';
  Content: string;
}
