import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import productsData from './products.json';

const { width, height } = Dimensions.get('window');
const FORUM_STORAGE_KEY = '@forum_posts_key_v1';

// Extended grade color palette strictly within your warm earthy aesthetic
const ECO_COLORS = {
  a: '#6B8E4E',
  b: '#94B379',
  c: '#DEAA50',
  d: '#B87233',
  e: '#983A20',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  
  // Sorting & Weighting State
  const [sortBy, setSortBy] = useState('green_value'); // 'green_value', 'ecoscore', 'affordability', 'alphabetical'
  const [ecoWeight, setEcoWeight] = useState(0.5);

  // Forum state with persistent storage
  const [posts, setPosts] = useState([
    { id: '1', name: 'EcoCafe Downtown', text: 'Reusing coffee grounds for community gardens and offering 10% off if you bring your own mug!' },
    { id: '2', name: 'GreenLeaf Market', text: 'Zero-waste grocery store with bulk organic grains and local produce refill stations.' }
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizText, setNewBizText] = useState('');

  // Expo SDK 58 Camera Permission Hook & scanning throttle
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Load saved forum posts on startup
  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    try {
      const storedPosts = await AsyncStorage.getItem(FORUM_STORAGE_KEY);
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      }
    } catch (e) {
      console.log('Error loading saved forum posts:', e);
    }
  };

  const savePostsToStorage = async (newPosts) => {
    try {
      await AsyncStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(newPosts));
    } catch (e) {
      console.log('Error saving forum posts:', e);
    }
  };

  // Recalculate and sort all products whenever category, sort metric, or weight slider changes
  useEffect(() => {
    if (selectedCategory && productsData[selectedCategory]) {
      const sorted = getSortedProducts(selectedCategory, sortBy, ecoWeight);
      setDisplayedProducts(sorted);
    }
  }, [selectedCategory, sortBy, ecoWeight]);

  const calculateScores = (item, weight) => {
    const eco = item.ecoscore_score || 0;
    const aff = item.affordability_score || 50;
    const greenValue = Math.round(eco * weight + aff * (1 - weight));
    return { eco, aff, greenValue };
  };

  const getSortedProducts = (categoryKey, metric, weight) => {
    const items = productsData[categoryKey] || [];
    const scoredItems = items.map(p => {
      const { eco, aff, greenValue } = calculateScores(p, weight);
      return { ...p, _eco: eco, _aff: aff, _gv: greenValue };
    });

    return scoredItems.sort((a, b) => {
      if (metric === 'ecoscore') return b._eco - a._eco;
      if (metric === 'affordability') return b._aff - a._aff;
      if (metric === 'alphabetical') {
        const nameA = (a.product_name || '').toLowerCase();
        const nameB = (b.product_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return b._gv - a._gv;
    });
  };

  const getBetterProducts = () => {
    if (!activeProduct || !selectedCategory) return [];
    
    const allSorted = getSortedProducts(selectedCategory, sortBy, ecoWeight);
    
    const filtered = allSorted.filter(item => {
      if (item.barcode === activeProduct.barcode) return false;
      
      if (sortBy === 'ecoscore') {
        return item._eco > (activeProduct._eco ?? activeProduct.ecoscore_score ?? 0);
      }
      if (sortBy === 'affordability') {
        return item._aff > (activeProduct
