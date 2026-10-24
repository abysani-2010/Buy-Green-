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
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import productsData from './products.json';

const { width } = Dimensions.get('window');

// Color map for Eco Score grades
const ECO_COLORS = {
  a: '#2E7D32', // Deep green
  b: '#94B379', // App green
  c: '#DEAA50', // App yellow
  d: '#FFA726', // Orange
  e: '#E53935', // Red
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  
  // Sorting & Weighting State
  const [sortBy, setSortBy] = useState('green_value'); // 'green_value', 'ecoscore', 'affordability'
  const [ecoWeight, setEcoWeight] = useState(0.5); // Slider ratio 0.0 to 1.0

  // Forum state
  const [posts, setPosts] = useState([
    { id: '1', name: 'EcoCafe Downtown', text: 'Reusing coffee grounds for community gardens and offering 10% off if you bring your own mug!' },
    { id: '2', name: 'GreenLeaf Market', text: 'Zero-waste grocery store with bulk organic grains and local produce refill stations.' }
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizText, setNewBizText] = useState('');

  // Camera permissions
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Recalculate top 5 products whenever category, sort metric, or weight slider changes
  useEffect(() => {
    if (selectedCategory && productsData[selectedCategory]) {
      const sorted = getTopProducts(selectedCategory, sortBy, ecoWeight);
      setDisplayedProducts(sorted);
      if (sorted.length > 0 && !activeProduct) {
        setActiveProduct(sorted[0]);
      }
    }
  }, [selectedCategory, sortBy, ecoWeight]);

  // Helper calculation for scores
  const calculateScores = (item, weight) => {
    const eco = item.ecoscore_score || 0;
    const aff = item.affordability_score || 50; // Fallback if missing
    const greenValue = Math.round(eco * weight + aff * (1 - weight));
    return { eco, aff, greenValue };
  };

  const getTopProducts = (categoryKey, metric, weight) => {
    const items = productsData[categoryKey] || [];
    const scoredItems = items.map(p => {
      const { eco, aff, greenValue } = calculateScores(p, weight);
      return { ...p, _eco: eco, _aff: aff, _gv: greenValue };
    });

    scoredItems.sort((a, b) => {
      if (metric === 'ecoscore') return b._eco - a._eco;
      if (metric === 'affordability') return b._aff - a._aff;
      return b._gv - a._gv; // Default: green_value
    });

    return scoredItems.slice(0, 5); // Return Top 5
  };

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const top5 = getTopProducts(catKey, sortBy, ecoWeight);
    setDisplayedProducts(top5);
    setActiveProduct(top5[0] || null);
    setCurrentScreen('detail');
  };

  const handleBarCodeScanned = ({ data }) => {
    for (const catKey of Object.keys(productsData)) {
      const found = productsData[catKey].find(p => p.barcode === data);
      if (found) {
        setSelectedCategory(catKey);
        const top5 = getTopProducts(catKey, sortBy, ecoWeight);
        setDisplayedProducts(top5);
        setActiveProduct(found);
        setCurrentScreen('detail');
