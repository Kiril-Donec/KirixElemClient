export interface Post {
  ID: string;
  AuthorID: string;
  Username: string;
  Name: string;
  Avatar: string | null;
  UserIcons: string;
  Text: string;
  Content: string | null;
  Date: string;
  Likes: number;
  Dislikes: number;
  Liked: boolean | null;
  Disliked: boolean | null;
  Comments: number;
  MyPost: boolean;
}

export interface Comment {
  Name: string;
  Username: string;
  Avatar: string | null;
  UserIcons: string;
  Text: string;
  Date: string;
}

export interface Song {
  ID: string;
  Title: string;
  Artist: string;
  Cover: string;
  File: string;
  Album?: string;
  Genre?: string;
  TrackNumber?: number;
  ReleaseYear?: string;
  Composer?: string;
  Duration: string;
  Bitrate: string;
  AudioFormat: string;
  DateAdded: string;
  Order?: number;
  Liked: boolean;
}

export interface Channel {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar: string | null;
  cover: string | null;
}
