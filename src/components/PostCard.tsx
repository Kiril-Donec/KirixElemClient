import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  PostResponse, postsAPI, getImageUrl
} from '../services/api';
import LetterAvatar from './LetterAvatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Video, ResizeMode } from 'expo-av';

interface PostCardProps {
  post: PostResponse;
  onUpdate: () => void;
}

interface MediaContent {
  Image?: {
    simple_image?: string;
    file_name: string;
    width: number;
    height: number;
    orig_name?: string;
  };
  Video?: {
    file_name: string;
    width: number;
    height: number;
    orig_name?: string;
  };
}

interface MediaViewerProps {
  url: string;
  type: 'image' | 'video';
  onClose: () => void;
  onDownload: (url: string, filename: string) => void;
  filename: string;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const [loadingAction, setLoadingAction] = useState<'LIKE' | 'DISLIKE' | null>(null);
  const [localLikes, setLocalLikes] = useState(post.Likes);
  const [localDislikes, setLocalDislikes] = useState(post.Dislikes);
  const [localLiked, setLocalLiked] = useState(post.Liked);
  const [localDisliked, setLocalDisliked] = useState(post.Disliked);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mediaViewerProps, setMediaViewerProps] = useState<MediaViewerProps | null>(null);
  const videoRef = useRef(null);

  const handleDownload = (url: string, filename: string) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Ошибка', 'Не удалось скачать файл');
    }
  };

  const openModal = (props: MediaViewerProps) => {
    setMediaViewerProps(props);
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setMediaViewerProps(null);
    });
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMMM, HH:mm', { locale: ru });
  }, []);

  const handleInteraction = async (action: 'LIKE' | 'DISLIKE') => {
    if (loadingAction) return;
    
    try {
      setLoadingAction(action);
      
      // Оптимистично обновляем UI
      if (action === 'LIKE') {
        if (!localLiked) {
          setLocalLikes(prev => prev + 1);
          setLocalLiked('Liked');
          if (localDisliked) {
            setLocalDislikes(prev => prev - 1);
            setLocalDisliked(null);
          }
        } else {
          setLocalLikes(prev => prev - 1);
          setLocalLiked(null);
        }
      } else {
        if (!localDisliked) {
          setLocalDislikes(prev => prev + 1);
          setLocalDisliked('Liked');
          if (localLiked) {
            setLocalLikes(prev => prev - 1);
            setLocalLiked(null);
          }
        } else {
          setLocalDislikes(prev => prev - 1);
          setLocalDisliked(null);
        }
      }

      await postsAPI.interactWithPost(action, post.ID);
      onUpdate();
    } catch (error) {
      console.error('Error interacting with post:', error);
      setLocalLikes(post.Likes);
      setLocalDislikes(post.Dislikes);
      setLocalLiked(post.Liked);
      setLocalDisliked(post.Disliked);
      Alert.alert('Ошибка', 'Не удалось выполнить действие');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReactionPress = useCallback((type: 'like' | 'dislike') => {
    // Анимация нажатия
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: false,
      }),
    ]).start();

    if (type === 'like') {
      handleInteraction('LIKE');
    } else {
      handleInteraction('DISLIKE');
    }
  }, [scaleAnim, handleInteraction]);

  const renderMediaContent = () => {
    if (!post.Content) return null;

    try {
      const content: MediaContent = JSON.parse(post.Content);
      const screenWidth = Dimensions.get('window').width - 30;

      if (content.Image) {
        const aspectRatio = content.Image.width / content.Image.height;
        const imageHeight = screenWidth / aspectRatio;
        const maxHeight = screenWidth * 0.8;

        const imageUrl = content.Image.simple_image
          ? `https://elemsocial.com/Content/Simple/${content.Image.simple_image}`
          : `https://elemsocial.com/Content/Posts/Images/${content.Image.file_name}`;
        
        const filename = content.Image.orig_name || content.Image.file_name;

        return (
          <TouchableOpacity
            onPress={() => openModal({
              url: imageUrl,
              type: 'image',
              filename,
              onClose: closeModal,
              onDownload: handleDownload
            })}
            style={[styles.mediaContainer, { height: Math.min(imageHeight, maxHeight) }]}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.mediaContent}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      }

      if (content.Video) {
        const aspectRatio = content.Video.width / content.Video.height;
        const videoHeight = screenWidth / aspectRatio;
        const maxHeight = screenWidth * 0.8;
        const videoUrl = `https://elemsocial.com/Content/Posts/Video/${content.Video.file_name}`;
        const filename = content.Video.orig_name ?? content.Video.file_name;

        return (
          <TouchableOpacity
            onPress={() => {
              if (content.Video) {
                openModal({
                  url: videoUrl,
                  type: 'video',
                  filename,
                  onClose: closeModal,
                  onDownload: handleDownload
                });
              }
            }}
            style={[styles.mediaContainer, { height: Math.min(videoHeight, maxHeight) }]}
          >
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.mediaContent}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay={false}
              isLooping
            />
          </TouchableOpacity>
        );
      }
    } catch (error) {
      console.error('Error parsing content:', error);
      return null;
    }

    return null;
  };

  const renderMediaViewer = () => {
    if (!mediaViewerProps) return null;

    return (
      <Modal
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={closeModal}
          >
            {mediaViewerProps.type === 'image' ? (
              <Image
                source={{ uri: mediaViewerProps.url }}
                style={styles.fullScreenMedia}
                resizeMode="contain"
              />
            ) : (
              <Video
                ref={videoRef}
                source={{ uri: mediaViewerProps.url }}
                style={styles.fullScreenMedia}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay={true}
                isLooping
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeModal}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => mediaViewerProps.onDownload(mediaViewerProps.url, mediaViewerProps.filename)}
          >
            <Image
              source={require('../assets/download.png')}
              style={styles.downloadIcon}
            />
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    );
  };

  useEffect(() => {
    if (post.Avatar && post.Avatar !== 'None') {
      loadAvatar();
    }
  }, [post.Avatar]);

  const loadAvatar = async () => {
    try {
      if (post.Avatar && post.Avatar !== 'None') {
        const url = await getImageUrl(post.Avatar);
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <LetterAvatar name={post.Name || post.Username} size={40} />
            )}
          </View>
          <View style={styles.userTextInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{post.Name}</Text>
              {post.UserIcons && post.UserIcons.includes('VERIFY') && (
                <Image
                  source={require('../assets/verify.png')}
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <Text style={styles.username}>@{post.Username}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.date}>{formatDate(post.Date)}</Text>
      </View>

      <Text style={styles.text}>{post.Text}</Text>

      {renderMediaContent()}
      {renderMediaViewer()}

      <View style={styles.footer}>
        <Animated.View style={[
          styles.reactions, 
          { transform: [{ scale: scaleAnim }] },
          loadingAction ? styles.pointerEventsNone : styles.pointerEventsAuto
        ]}>
          <TouchableOpacity
            style={[styles.reactionButton, localLiked && styles.reactionButtonActive]}
            onPress={() => handleReactionPress('like')}
          >
            <Image
              source={require('../assets/like.png')}
              style={styles.reactionIcon}
              tintColor={localLiked ? '#007AFF' : '#666'}
              resizeMode="contain"
            />
            <Text style={[styles.reactionCount, localLiked && styles.reactionCountActive]}>
              {localLikes}
            </Text>
            {loadingAction === 'LIKE' && (
              <Animated.View style={styles.reactionLoader}>
                <ActivityIndicator
                  size="small"
                  color={localLiked ? '#007AFF' : '#666'}
                />
              </Animated.View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reactionButton, localDisliked && styles.dislikeButtonActive]}
            onPress={() => handleReactionPress('dislike')}
          >
            <Image
              source={require('../assets/dislike.png')}
              style={styles.reactionIcon}
              tintColor={localDisliked ? '#FF3B30' : '#666'}
              resizeMode="contain"
            />
            <Text style={[styles.reactionCount, localDisliked && styles.dislikeCountActive]}>
              {localDislikes}
            </Text>
            {loadingAction === 'DISLIKE' && (
              <Animated.View style={styles.reactionLoader}>
                <ActivityIndicator
                  size="small"
                  color={localDisliked ? '#FF3B30' : '#666'}
                />
              </Animated.View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionButton}
          >
            <Image
              source={require('../assets/comment.png')}
              style={styles.reactionIcon}
              tintColor="#666"
              resizeMode="contain"
            />
            <Text style={styles.reactionCount}>
              {post.Comments}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {post.MyPost && (
          <View style={styles.myPostBadge}>
            <Text style={styles.myPostText}>Мой пост</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userTextInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    marginLeft: 1,
  },
  username: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  mediaContainer: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 5,
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  downloadButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
    zIndex: 1,
  },
  downloadIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  reactionButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  dislikeButtonActive: {
    backgroundColor: '#FFE5E5',
  },
  reactionIcon: {
    width: 24,
    height: 24,
  },
  reactionIconActive: {
    tintColor: '#007AFF',
  },
  dislikeIconActive: {
    tintColor: '#FF3B30',
  },
  reactionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  reactionCountActive: {
    color: '#007AFF',
  },
  dislikeCountActive: {
    color: '#FF3B30',
  },
  reactionLoader: {
    marginLeft: 4,
  },
  pointerEventsAuto: {
    pointerEvents: 'auto',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  myPostBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myPostText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
});

export default PostCard;
