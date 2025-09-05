import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  category: string;
  isPinned?: boolean;
}

const categories = [
  'All',
  'General Discussion',
  'Car Reviews',
  'Technical Help',
  'Modifications',
  'Maintenance',
  'Off-Topic',
];

export default function ForumScreen() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample forum data - this would come from API
  const samplePosts: ForumPost[] = [
    {
      id: '1',
      title: 'Best brake pads for BMW M3?',
      content: 'Looking for recommendations on brake pads for daily driving and occasional track use...',
      author: 'M3Owner',
      replies: 15,
      views: 234,
      lastActivity: '2 hours ago',
      category: 'Technical Help',
      isPinned: true,
    },
    {
      id: '2',
      title: 'Car meet this weekend - Los Angeles',
      content: 'Hey everyone! Organizing a car meet this Saturday at...',
      author: 'LACarGuy',
      replies: 8,
      views: 156,
      lastActivity: '4 hours ago',
      category: 'General Discussion',
    },
    {
      id: '3',
      title: 'Ferrari 488 vs McLaren 720S comparison',
      content: 'Had the chance to drive both cars recently. Here are my thoughts...',
      author: 'SupercarFan',
      replies: 23,
      views: 445,
      lastActivity: '6 hours ago',
      category: 'Car Reviews',
    },
    {
      id: '4',
      title: 'Cold air intake installation guide',
      content: 'Step by step guide for installing a cold air intake on most vehicles...',
      author: 'ModExpert',
      replies: 12,
      views: 189,
      lastActivity: '1 day ago',
      category: 'Modifications',
    },
    {
      id: '5',
      title: 'Oil change intervals - synthetic vs conventional',
      content: 'What are your thoughts on oil change intervals? I\'ve been using synthetic...',
      author: 'MaintenancePro',
      replies: 31,
      views: 567,
      lastActivity: '2 days ago',
      category: 'Maintenance',
    },
  ];

  useEffect(() => {
    setPosts(samplePosts);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderPost = ({ item }: { item: ForumPost }) => (
    <TouchableOpacity style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postTitleRow}>
          {item.isPinned && (
            <Ionicons name="pin" size={16} color="#F59E0B" style={styles.pinIcon} />
          )}
          <Text style={[styles.postTitle, item.isPinned && styles.pinnedPostTitle]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.postFooter}>
        <View style={styles.postAuthor}>
          <Ionicons name="person-circle" size={20} color="#6B7280" />
          <Text style={styles.authorText}>{item.author}</Text>
        </View>
        
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{item.replies}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <Text style={styles.lastActivity}>{item.lastActivity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryButton = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category && styles.selectedCategoryButtonText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']} // Dark gradient to match garage
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Community Forum</Text>
        <TouchableOpacity style={styles.newPostButton}>
          <Ionicons name="add" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={({ item }) => renderCategoryButton(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Forum Posts */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.postsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newPostButton: {
    backgroundColor: '#FFD700', // Gold button
    borderRadius: 20,
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E', // Dark background
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Dark border
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D', // Dark input background
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  categoriesContainer: {
    backgroundColor: '#1E1E1E', // Dark background
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Dark border
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    backgroundColor: '#2D2D2D', // Dark button background
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#FFD700', // Gold for selected
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC', // Light gray text
  },
  selectedCategoryButtonText: {
    color: '#000000', // Black text on gold background
  },
  postsList: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#1E1E1E', // Dark card background
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#333333', // Dark border
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pinIcon: {
    marginRight: 6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700', // Gold for post titles
    flex: 1,
  },
  pinnedPostTitle: {
    color: '#F59E0B', // Slightly different gold for pinned posts
  },
  categoryBadge: {
    backgroundColor: '#2D2D2D', // Dark badge background
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD700', // Gold text
  },
  postContent: {
    fontSize: 14,
    color: '#CCCCCC', // Light gray for content
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White for author names
    marginLeft: 6,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#999999', // Gray for stats
    marginLeft: 4,
  },
  lastActivity: {
    fontSize: 12,
    color: '#666666', // Darker gray for timestamps
  },
});