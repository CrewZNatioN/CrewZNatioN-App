import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import Constants from 'expo-constants';
import { formatDistanceToNow } from 'date-fns';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  threads_count: number;
  created_at: string;
}

interface ForumThread {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  replies_count: number;
  views_count: number;
  last_reply_at?: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    profile_image?: string;
  };
}

export default function ForumsScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadThreads(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forums/categories`);
      const categoriesData = response.data;
      setCategories(categoriesData);
      
      // Auto-select first category if none selected
      if (categoriesData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Create default categories if none exist
      await createDefaultCategories();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'General Discussion', description: 'General automotive discussion', color: Colors.primary },
      { name: 'Car Builds', description: 'Share your build projects', color: Colors.secondary },
      { name: 'Technical Help', description: 'Get help with repairs and modifications', color: '#10B981' },
      { name: 'Events & Meets', description: 'Organize and discuss automotive events', color: '#F59E0B' },
      { name: 'Buy & Sell', description: 'Marketplace for parts and vehicles', color: '#8B5CF6' }
    ];

    try {
      for (const category of defaultCategories) {
        await axios.post(`${API_BASE_URL}/api/forums/categories`, category);
      }
      loadCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const loadThreads = async (categoryId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forums/categories/${categoryId}/threads`);
      setThreads(response.data);
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCategories();
    if (selectedCategory) {
      loadThreads(selectedCategory);
    }
  };

  const renderCategoryTab = (category: ForumCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryTab,
        selectedCategory === category.id && styles.activeCategoryTab
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <View style={[styles.categoryIndicator, { backgroundColor: category.color }]} />
      <Text style={[
        styles.categoryName,
        selectedCategory === category.id && styles.activeCategoryName
      ]}>
        {category.name}
      </Text>
      <Text style={styles.threadCount}>{category.threads_count}</Text>
    </TouchableOpacity>
  );

  const renderThreadCard = (thread: ForumThread) => (
    <TouchableOpacity key={thread.id} style={styles.threadCard}>
      <View style={styles.threadHeader}>
        {thread.is_pinned && (
          <Ionicons name="pin" size={16} color={Colors.primary} style={styles.pinnedIcon} />
        )}
        <Text style={styles.threadTitle} numberOfLines={2}>
          {thread.title}
        </Text>
        {thread.is_locked && (
          <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
        )}
      </View>

      <Text style={styles.threadContent} numberOfLines={2}>
        {thread.content}
      </Text>

      <View style={styles.threadFooter}>
        <View style={styles.threadStats}>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={14} color={Colors.textMuted} />
            <Text style={styles.statText}>{thread.replies_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={14} color={Colors.textMuted} />
            <Text style={styles.statText}>{thread.views_count}</Text>
          </View>
        </View>

        <View style={styles.threadMeta}>
          <Text style={styles.authorName}>
            {thread.user?.username}
          </Text>
          <Text style={styles.timeStamp}>
            {thread.last_reply_at 
              ? formatDistanceToNow(new Date(thread.last_reply_at), { addSuffix: true })
              : formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading forums...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Forums</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategoryTab)}
      </ScrollView>

      {/* Threads List */}
      <ScrollView
        style={styles.threadsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {threads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Discussions Yet</Text>
            <Text style={styles.emptyDescription}>
              Start the conversation! Be the first to post in this category.
            </Text>
          </View>
        ) : (
          <View style={styles.threadsList}>
            {threads.map(renderThreadCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCategoryTab: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  activeCategoryName: {
    color: Colors.text,
  },
  threadCount: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.divider,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  threadsContainer: {
    flex: 1,
  },
  threadsList: {
    padding: 16,
  },
  threadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pinnedIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  threadTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  threadContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  threadMeta: {
    alignItems: 'flex-end',
  },
  authorName: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  timeStamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
