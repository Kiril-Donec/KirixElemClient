import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
  FlatList,
  Linking,
  Dimensions,
} from 'react-native';
import { profileAPI, getImageUrl, postsAPI, ProfileData } from '../services/api';
import LetterAvatar from '../components/LetterAvatar';
import { AuthContext } from '../navigation';
import PostCard from '../components/PostCard';
import { PostResponse } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const POSTS_PER_PAGE = 10;
const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  username?: string; // Опциональный, если не передан - показываем свой профиль
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ username }) => {
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [iconUrls, setIconUrls] = useState<string[]>([]);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const loadIcons = async (icons: string[]) => {
    const loadedUrls: string[] = [];
    for (const icon of icons) {
      try {
        const url = await getImageUrl(icon);
        loadedUrls.push(url);
      } catch (error) {
        console.error('Error loading icon:', error);
      }
    }
    setIconUrls(loadedUrls);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = username ? 
        await profileAPI.getProfile(username) : 
        await profileAPI.getMyProfile();
      setProfile(data);
      
      if (data.avatar && data.avatar !== 'None') {
        try {
          const url = await getImageUrl(data.avatar);
          setAvatarUrl(url);
        } catch (error) {
          console.error('Error loading avatar:', error);
        }
      }

      if (data.cover && data.cover !== 'None') {
        try {
          const url = await getImageUrl(data.cover);
          setCoverUrl(url);
        } catch (error) {
          console.error('Error loading cover:', error);
        }
      }

      if (data.icons && data.icons.length > 0) {
        loadIcons(data.icons);
      }
      
      if (data.id) {
        fetchUserPosts(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось загрузить профиль. Проверьте подключение к интернету или попробуйте войти заново.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async (refresh = false) => {
    if (!profile?.id || (!refresh && loadingPosts)) return;

    try {
      setLoadingPosts(true);
      const startIndex = refresh ? 0 : posts.length;
      const newPosts = await postsAPI.getUserPosts(profile.id.toString(), startIndex);
      
      if (refresh) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMorePosts(newPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить посты');
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLoadMore = () => {
    if (hasMorePosts && !loadingPosts) {
      fetchUserPosts();
    }
  };

  const handlePostUpdate = () => {
    fetchUserPosts(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>Не удалось загрузить профиль</Text>
      </View>
    );
  }

  const renderPost = ({ item }: { item: PostResponse }) => (
    <PostCard post={item} onUpdate={handlePostUpdate} />
  );

  const renderFooter = () => {
    if (!loadingPosts) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const renderStats = () => {
    const stats = [
      { label: 'Посты', value: profile.posts },
      { label: 'Подписчики', value: profile.subscribers },
      { label: 'Подписки', value: profile.subscriptions }
    ];

    return (
      <View style={styles.stats}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statNumber}>
              {stat.value?.toLocaleString() || '0'}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image 
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverImage, styles.defaultCover]} />
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <LetterAvatar 
              name={profile?.name || profile?.username || 'Пользователь'} 
              size={100}
            />
          )}
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.name}>{profile?.name || 'Без имени'}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.description && (
            <Text style={styles.description}>{profile.description}</Text>
          )}
        </View>

        {renderStats()}

        {profile?.icons && profile.icons.length > 0 && (
          <View style={styles.iconsContainer}>
            {iconUrls.map((iconUrl, index) => (
              <Image 
                key={index}
                source={{ uri: iconUrl }}
                style={styles.icon}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.ID}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
  },
  coverContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  defaultCover: {
    backgroundColor: '#e1e1e1',
  },
  profileInfo: {
    padding: 15,
    marginTop: -50,
  },
  avatarWrapper: {
    marginBottom: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginVertical: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;
