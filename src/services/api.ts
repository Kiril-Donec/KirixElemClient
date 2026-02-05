import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_API_URL = 'wss://ws.elemsocial.com/';
const POSTS_API_URL = 'https://elemsocial.com';
const SYSTEM_API_URL = 'https://elemsocial.com/System/API';

const authApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
    'api': 'true'
  }
});

const postsApi = axios.create({
  baseURL: POSTS_API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
    'api': 'true'
  }
});

const systemApi = axios.create({
  baseURL: SYSTEM_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'api': 'true'
  }
});

// Add interceptor to include S-KEY in requests
authApi.interceptors.request.use(async (config) => {
  const sKey = await AsyncStorage.getItem('S-KEY');
  if (sKey) {
    config.headers['S-KEY'] = sKey;
  }
  return config;
});

// Add response error handling
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      // Handle unauthorized error (invalid or expired S-KEY)
      await AsyncStorage.removeItem('S-KEY');
      // You might want to trigger a logout here
    }
    return Promise.reject(error);
  }
);

// Add interceptor to include S-KEY in requests
postsApi.interceptors.request.use(async (config) => {
  const sKey = await AsyncStorage.getItem('S-KEY');
  if (sKey) {
    config.headers['S-KEY'] = sKey;
  }
  return config;
});

// Add response error handling
postsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      // Handle unauthorized error (invalid or expired S-KEY)
      await AsyncStorage.removeItem('S-KEY');
      // You might want to trigger a logout here
    }
    return Promise.reject(error);
  }
);

// Add interceptor to include S-KEY in requests
systemApi.interceptors.request.use(async (config) => {
  const sKey = await AsyncStorage.getItem('S-KEY');
  if (sKey) {
    config.headers['S-KEY'] = sKey;
  }
  return config;
});

// Types
export interface LoginResponse {
  status: 'success' | 'error';
  S_KEY: string;
}

export interface PostResponse {
  ID: string;
  AuthorID: string;
  Username: string;
  Name: string;
  Avatar: string | 'None';
  UserIcons: string | null;
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

export interface CommentResponse {
  Name: string;
  Username: string;
  Avatar: string | 'None';
  UserIcons: string | null;
  Text: string;
  Date: string;
}

export interface ApiResponse {
  Type: 'Error' | 'Verify';
  Content: string;
}

export interface ProfileData {
  type: 'user';
  id: number;
  name: string;
  username: string;
  cover: string | 'None';
  avatar: string | 'None';
  description: string | null;
  posts: number;
  subscribers: number;
  subscribed: boolean;
  create_date: string;
  icons: string[];
  subscriptions: number;
  links_count: number;
  links: any[] | null;
  my_profile: boolean;
  permissions: {
    posts: boolean;
    comments: boolean;
    new_chats: boolean;
    music_upload: boolean;
  };
}

// Helper functions
export const getImageUrl = async (path: string | null | undefined): Promise<string> => {
  if (!path || path === 'None') {
    return '';
  }
  return `https://elemsocial.com/Content/Avatars/${path}`;
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const response = await authApi.post<LoginResponse>('/auth/login', formData);
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  async getMyProfile(): Promise<ProfileData> {
    try {
      const response = await systemApi.get('/Connect.php');
      const data = response.data;
      
      return {
        type: 'user',
        id: parseInt(data.ID || '0'),
        name: data.Name || '',
        username: data.Username || '',
        cover: data.Cover || 'None',
        avatar: data.Avatar || 'None',
        description: data.Description || null,
        posts: parseInt(data.Posts || '0'),
        subscribers: parseInt(data.Subscribers || '0'),
        subscribed: data.Subscribed === 'true',
        create_date: data.CreateDate || '',
        icons: data.Icons ? data.Icons.split(',') : [],
        subscriptions: parseInt(data.Subscriptions || '0'),
        links_count: parseInt(data.LinksCount || '0'),
        links: data.Links || null,
        my_profile: true,
        permissions: {
          posts: data.Posts_Permission === 'true',
          comments: data.Comments_Permission === 'true',
          new_chats: data.NewChats_Permission === 'true',
          music_upload: data.MusicUpload_Permission === 'true'
        }
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  },

  async getProfile(username: string): Promise<ProfileData> {
    try {
      const formData = new FormData();
      formData.append('username', username);
      
      const response = await authApi.post('/profile/get', formData, {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'api': 'true',
          'content-type': 'multipart/form-data',
          'priority': 'u=1, i'
        }
      });
      
      if (response.data.status === 'success') {
        return response.data.data;
      }
      throw new Error('Failed to fetch profile data');
    } catch (error) {
      console.error('getProfile error:', error);
      throw error;
    }
  },

  updateProfile: async (data: Partial<ProfileData>): Promise<ApiResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    const response = await postsApi.post<ApiResponse>('/System/API/Connect.php', formData);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await postsApi.post<ApiResponse>('/System/API/Connect.php', formData);
    return response.data;
  },

  uploadCover: async (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('cover', file);
    const response = await postsApi.post<ApiResponse>('/System/API/Connect.php', formData);
    return response.data;
  },
};

// Posts API
export const postsAPI = {
  // Load single post
  loadPost: async (postId: string): Promise<PostResponse> => {
    const formData = new FormData();
    formData.append('PostID', postId);

    const response = await postsApi.post('/System/API/LoadPost.php', formData);
    return response.data;
  },

  // Create post
  createPost: async (
    text: string,
    files: File[] = [],
    clearMetadata = false,
    censoring = false
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('Text', text);
    
    // Добавляем файлы в Files[]
    files.forEach(file => {
      formData.append('Files[]', file);
    });

    if (clearMetadata) {
      formData.append('ClearMetadataIMG', 'true');
    }
    if (censoring) {
      formData.append('CensoringIMG', 'true');
    }

    const response = await postsApi.post<ApiResponse>('/System/API/AddPost.php', formData);
    return response.data;
  },

  // Get single post
  getPost: async (postId: string): Promise<PostResponse> => {
    const formData = new FormData();
    formData.append('PostID', postId);

    const response = await postsApi.post<PostResponse>('/System/API/LoadPost.php', formData);
    return response.data;
  },

  getPosts: async (type: 'LATEST' | 'REC' | 'SUBSCRIPTIONS', startIndex?: number): Promise<PostResponse[]> => {
    try {
      const formData = new FormData();
      formData.append('StartIndex', startIndex?.toString() || '0');

      const url = `/System/API/LoadPosts.php?F=${type}`;
      console.log('Making request to:', url);
      console.log('With FormData:', {
        StartIndex: startIndex?.toString() || '0'
      });

      const response = await postsApi.post(url, formData);
      console.log(`${type} posts raw response:`, response.data);

      // Ensure we have an array of posts
      const postsArray = Array.isArray(response.data) ? response.data : [];
      console.log('Posts array length:', postsArray.length);

      // Map and validate each post
      const posts = postsArray.map(post => ({
        ID: String(post.ID || ''),
        AuthorID: String(post.AuthorID || ''),
        Username: String(post.Username || ''),
        Name: String(post.Name || ''),
        Avatar: post.Avatar || 'None',
        UserIcons: post.UserIcons || null,
        Text: String(post.Text || ''),
        Content: post.Content || null,
        Date: String(post.Date || ''),
        Likes: Number(post.Likes) || 0,
        Dislikes: Number(post.Dislikes) || 0,
        Liked: post.Liked || null,
        Disliked: post.Disliked || null,
        Comments: Number(post.Comments) || 0,
        MyPost: Boolean(post.MyPost)
      }));
      
      return posts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
      }
      return [];
    }
  },

  getUserPosts: async (userId: string, startIndex?: number): Promise<PostResponse[]> => {
    try {
      const formData = new FormData();
      formData.append('UserID', userId);
      if (startIndex !== undefined) {
        formData.append('StartIndex', startIndex.toString());
      }

      const url = '/System/API/LoadPosts.php?F=USER';
      console.log('Fetching user posts, UserID:', userId, 'StartIndex:', startIndex);
      
      const response = await postsApi.post<any>(url, formData);
      console.log('User posts raw response:', response.data);

      // Ensure we have an array of posts
      const postsArray = Array.isArray(response.data) ? response.data : [];

      // Map and validate each post
      const posts = postsArray.map(post => ({
        ID: String(post.ID || ''),
        AuthorID: String(post.AuthorID || ''),
        Username: String(post.Username || ''),
        Name: String(post.Name || ''),
        Avatar: post.Avatar || 'None',
        UserIcons: post.UserIcons || null,
        Text: String(post.Text || ''),
        Content: post.Content || null,
        Date: String(post.Date || ''),
        Likes: Number(post.Likes) || 0,
        Dislikes: Number(post.Dislikes) || 0,
        Liked: post.Liked || null,
        Disliked: post.Disliked || null,
        Comments: Number(post.Comments) || 0,
        MyPost: Boolean(post.MyPost)
      }));
      
      console.log('User posts processed:', posts);
      return posts;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  },

  // Post interactions (like, dislike, delete)
  interactWithPost: async (
    action: 'LIKE' | 'DISLIKE' | 'DELETE',
    postId: string
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('PostID', postId);

    const response = await postsApi.post<ApiResponse>(`/System/API/PostInteraction.php?F=${action}`, formData);
    return response.data;
  },

  // Add comment to post
  addComment: async (postId: string, text: string): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('PostID', postId);
    formData.append('Text', text);

    const response = await postsApi.post<ApiResponse>('/System/API/PostInteraction.php?F=POST_COMMENT', formData);
    return response.data;
  },

  // Get post comments
  getComments: async (postId: string): Promise<CommentResponse[]> => {
    const formData = new FormData();
    formData.append('PostID', postId);

    const response = await postsApi.post<CommentResponse[]>('/System/API/PostInteraction.php?F=LOAD_COMMENT', formData);
    return response.data;
  },
};
