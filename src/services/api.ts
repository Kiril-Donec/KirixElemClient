import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_API_URL = 'https://api.elemsocial.com';
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
    try {
      const response = await systemApi.get(`/GetPost.php?ID=${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error loading post:', error);
      throw error;
    }
  },

  // Create post
  createPost: async (
    text: string,
    files: File[] = [],
    clearMetadata = false,
    censoring = false
  ): Promise<ApiResponse> => {
    try {
      const formData = new FormData();
      formData.append('Text', text);
      files.forEach((file) => {
        formData.append('Files[]', file);
      });
      if (clearMetadata) {
        formData.append('ClearMetadata', 'true');
      }
      if (censoring) {
        formData.append('Censoring', 'true');
      }

      const response = await systemApi.post('/CreatePost.php', formData);
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  // Get single post
  getPost: async (postId: string): Promise<PostResponse> => {
    try {
      const response = await systemApi.get(`/GetPost.php?ID=${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  },

  // Get posts
  getPosts: async (type: 'LATEST' | 'REC' | 'SUBSCRIPTIONS', startIndex?: number): Promise<PostResponse[]> => {
    try {
      let url = '/LoadPosts.php?';
      switch (type) {
        case 'LATEST':
          url += 'F=LATEST';
          break;
        case 'REC':
          url += 'F=REC';
          break;
        case 'SUBSCRIPTIONS':
          url += 'F=SUBSCRIPTIONS';
          break;
      }
      if (startIndex !== undefined) {
        url += `&StartIndex=${startIndex}`;
      }

      const response = await systemApi.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  },

  // Get user posts
  getUserPosts: async (userId: string, startIndex?: number): Promise<PostResponse[]> => {
    try {
      const formData = new FormData();
      formData.append('UserID', userId);
      if (startIndex !== undefined) {
        formData.append('StartIndex', startIndex.toString());
      }

      const response = await systemApi.post('/LoadPosts.php?F=USER', formData);
      return response.data;
    } catch (error) {
      console.error('Error getting user posts:', error);
      throw error;
    }
  },

  // Post interactions (like, dislike, delete)
  interactWithPost: async (
    action: 'LIKE' | 'DISLIKE' | 'DELETE',
    postId: string
  ): Promise<ApiResponse> => {
    try {
      const response = await systemApi.post(`/${action}Post.php`, { ID: postId });
      return response.data;
    } catch (error) {
      console.error('Error interacting with post:', error);
      throw error;
    }
  },

  // Add comment to post
  addComment: async (postId: string, text: string): Promise<ApiResponse> => {
    try {
      const response = await systemApi.post('/AddComment.php', {
        ID: postId,
        Text: text
      });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  // Get post comments
  getComments: async (postId: string): Promise<CommentResponse[]> => {
    try {
      const response = await systemApi.get(`/GetComments.php?ID=${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }
};
