import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PostResponse, postsAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { AuthContext } from '../navigation';

type FeedType = 'LATEST' | 'REC' | 'SUBSCRIPTIONS';
type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const POSTS_PER_PAGE = 25;
const RETRY_INTERVAL = 5000;

const FeedScreen = () => {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const [feedType, setFeedType] = useState<FeedType>('LATEST');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const pageRef = useRef(0);
  
  // переменние анимок
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const { logout } = React.useContext(AuthContext);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const animateLoading = useCallback((show: boolean) => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: show ? 0.3 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleLogin = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    try {
      // виход с акка
      await logout();
      
      // удаляем все данние при виходе с акка
      setPosts([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [logout]);

  const fetchPosts = useCallback(async (refresh = false) => {
    try {
      if (!refresh && loadingMore) return;

      const startIndex = refresh ? 0 : pageRef.current * POSTS_PER_PAGE;
      console.log('Fetching posts:', { feedType, startIndex, refresh });

      if (refresh) {
        setLoading(true);
        pageRef.current = 0;
        // анимация загрузки
        if (!error && !refreshing) {
          animateLoading(true);
        }
      } else {
        setLoadingMore(true);
      }

      const newPosts = await postsAPI.getPosts(feedType, startIndex);
      console.log('Received posts:', newPosts.length);
      
      // Если в LATEST нет постов - это ошибка
      if (feedType === 'LATEST' && newPosts.length === 0 && startIndex === 0) {
        throw new Error('Не удалось загрузить ленту');
      }
      
      if (refresh) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMorePosts(newPosts.length === POSTS_PER_PAGE);
      if (newPosts.length === POSTS_PER_PAGE) {
        pageRef.current += 1;
      }
      setError(null);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Ошибка загрузки постов\n\nПопробуйте войти еще раз, перезагрузить страницу или использовать VPN');
      
      // Продолжат попытки загрузки только для LATEST с заддержкой
      if (feedType === 'LATEST') {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        const delay = RETRY_INTERVAL + Math.random() * 1000;
        retryTimeoutRef.current = setTimeout(() => {
          fetchPosts(true);
        }, delay);
      }
    } finally {
      // Убираем анимацию загрузки только если нет ошибки и не идет pull-to-refresh
      if (!error && !refreshing) {
        animateLoading(false);
      }
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [feedType, loadingMore, error, refreshing]);

  const updateSinglePost = useCallback(async (postId: string) => {
    try {
      const updatedPost = await postsAPI.loadPost(postId);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.ID === postId ? updatedPost : post
        )
      );
    } catch (error) {
      console.error('Error updating post:', error);
    }
  }, []);

  // загрузк постов
  useEffect(() => {
    fetchPosts(true);
  }, [feedType]);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing posts...');
    setRefreshing(true);
    fetchPosts(true);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    console.log('Loading more posts...');
    if (hasMorePosts && !loadingMore && !refreshing) {
      fetchPosts(false);
    }
  }, [hasMorePosts, loadingMore, refreshing, fetchPosts]);

  const handleChangeFeedType = useCallback((type: FeedType) => {
    if (type === feedType) return;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    console.log('Changing feed type to:', type);
    setPosts([]);
    setHasMorePosts(true);
    pageRef.current = 0;
    setFeedType(type);
  }, [feedType]);

  const renderPost = useCallback(({ item }: { item: PostResponse }) => {
    return (
      <PostCard
        post={item}
        onUpdate={() => updateSinglePost(item.ID)}
      />
    );
  }, [updateSinglePost]);

  const renderHeader = useCallback(() => (
    <View style={styles.feedTypeContainer}>
      <TouchableOpacity
        style={[styles.feedTypeButton, feedType === 'LATEST' && styles.activeFeedType]}
        onPress={() => handleChangeFeedType('LATEST')}
      >
        <Text style={[styles.feedTypeText, feedType === 'LATEST' && styles.activeFeedTypeText]}>
          Новые
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.feedTypeButton, feedType === 'REC' && styles.activeFeedType]}
        onPress={() => handleChangeFeedType('REC')}
      >
        <Text style={[styles.feedTypeText, feedType === 'REC' && styles.activeFeedTypeText]}>
          Рекомендации
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.feedTypeButton, feedType === 'SUBSCRIPTIONS' && styles.activeFeedType]}
        onPress={() => handleChangeFeedType('SUBSCRIPTIONS')}
      >
        <Text style={[styles.feedTypeText, feedType === 'SUBSCRIPTIONS' && styles.activeFeedTypeText]}>
          Подписки
        </Text>
      </TouchableOpacity>
    </View>
  ), [feedType, handleChangeFeedType]);

  const renderError = useCallback(() => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts(true)}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Войти заново</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, handleLogin]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {error ? '' : 'Нет постов'}
        </Text>
      </View>
    );
  }, [loading, error]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }, [loadingMore]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <View style={styles.contentContainer}>
        <Animated.View style={[
          styles.loadingOverlay, 
          { 
            opacity: loadingOpacity,
          },
          loading ? styles.pointerEventsAuto : styles.pointerEventsNone
        ]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </Animated.View>

        <Animated.View style={[
          styles.content, 
          { 
            opacity: contentOpacity,
          },
          loading ? styles.pointerEventsNone : styles.pointerEventsAuto
        ]}>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => `${feedType}_${item.ID}`}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      </View>

      {renderError()}
    </View>
  );
};

// все стили ну тут и так понятно
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  feedTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeFeedType: {
    backgroundColor: '#E3F2FD',
  },
  feedTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFeedTypeText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerEventsAuto: {
    pointerEvents: 'auto',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default FeedScreen;
