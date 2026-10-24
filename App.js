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
  b: '#66BB6A', // Light green
  c: '#FBC02D', // Yellow/Gold
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
        return;
      }
    }
    alert(`Product with barcode ${data} not found in sustainable database.`);
  };

  const addPost = () => {
    if (!newBizName.trim() || !newBizText.trim()) return;
    setPosts([{ id: Date.now().toString(), name: newBizName, text: newBizText }, ...posts]);
    setNewBizName('');
    setNewBizText('');
    setModalVisible(false);
  };

  // Calculate Price Per Ounce helper
  const getPricePerOunce = (product) => {
    if (!product?.price || !product?.quantity_oz) return 'N/A';
    const ppo = product.price / product.quantity_oz;
    return `$${ppo.toFixed(2)}/oz`;
  };

  // --- RENDER SCREENS ---

  if (currentScreen === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <View style={styles.monkeyHeaderBox}>
            <Image source={require('./assets/monkey.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
            <View style={styles.sproutBadge}><Text style={{ fontSize: 10 }}>🌱</Text></View>
          </View>
          <Text style={styles.welcomeTitle}>~ buy green ~</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentScreen('home')}>
            <Text style={styles.buttonText}>Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentScreen('home')}>
            <Text style={styles.buttonTextOrange}>Guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <View style={styles.searchBarMock}>
            <Ionicons name="search" size={16} color="#8D5B4C" style={{ marginRight: 6 }} />
            <Text style={{ color: '#8D5B4C' }}>Choose the product category</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.categoryGrid}>
          <TouchableOpacity style={styles.catCardBread} onPress={() => handleSelectCategory('multigrain_sliced_breads')}>
            <Image source={require('./assets/bread.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Bread</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.catCardJam} onPress={() => handleSelectCategory('fruit_jam')}>
            <Image source={require('./assets/jam.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Jam</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.catCardPb} onPress={() => handleSelectCategory('peanut_butter')}>
            <Image source={require('./assets/peanut_butter.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Peanut butter</Text></View>
          </TouchableOpacity>

          <View style={styles.catCardMore}>
            <Text style={styles.moreText}>more{'\n'}soon!</Text>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => setCurrentScreen('forum')}>
            <Ionicons name="chatbubbles-outline" size={26} color="#8D5B4C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentScreen('scanner')}>
            <Ionicons name="camera-outline" size={26} color="#8D5B4C" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'detail') {
    const activeGrade = activeProduct?.ecoscore_grade?.toLowerCase() || 'a';
    const gradeColor = ECO_COLORS[activeGrade] || '#769E71';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topNavBack}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Ionicons name="arrow-back" size={24} color="#8D5B4C" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Category & Product Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContainer}>
          {/* Active Product Focused View */}
          <View style={styles.productImageBox}>
            {activeProduct?.image_url ? (
              <Image source={{ uri: activeProduct.image_url }} style={styles.productImageStyle} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 40 }}>📦</Text>
            )}
          </View>

          <Text style={styles.productNameText}>~ {activeProduct?.product_name || 'PRODUCT NAME'} ~</Text>
          <Text style={styles.brandSubtitle}>Brand: {activeProduct?.brands || 'Unknown'}</Text>

          {/* Pricing & Quantity Section */}
          <View style={styles.priceRow}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>Price: ${activeProduct?.price?.toFixed(2) || 'N/A'}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>Size: {activeProduct?.quantity_oz || 'N/A'} oz</Text>
            </View>
            <View style={styles.priceBadgeHighlight}>
              <Text style={styles.priceBadgeTextHighlight}>{getPricePerOunce(activeProduct)}</Text>
            </View>
          </View>

          {/* Product Score Box */}
          <View style={styles.scoreInfoBox}>
            <View style={styles.scoreRowItem}>
              <Text style={styles.scoreTextLabel}>Eco Score Grade: </Text>
              <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
                <Text style={styles.gradeBadgeText}>{activeGrade.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.scoreTextLabel}>Eco Score: <Text style={styles.highlightGrade}>{activeProduct?.ecoscore_score || 0}/100</Text></Text>
            <Text style={styles.scoreTextLabel}>Affordability Rating: <Text style={styles.highlightGrade}>{activeProduct?.affordability_score || 'N/A'}/100</Text></Text>
          </View>

          {/* Interactive Eco/Affordability Weight Slider */}
          <View style={styles.sliderCard}>
            <Text style={styles.sliderTitle}>Preference Balance Weight</Text>
            <View style={styles.sliderLabelsRow}>
              <Text style={[styles.sliderLabel, { color: '#E8A857' }]}>💰 Affordability ({(100 - ecoWeight * 100).toFixed(0)}%)</Text>
              <Text style={[styles.sliderLabel, { color: '#769E71' }]}>🌱 Eco Score ({(ecoWeight * 100).toFixed(0)}%)</Text>
            </View>
            <View 
              style={styles.sliderTrack}
              onStartShouldSetResponder={() => true}
              onResponderRelease={(evt) => {
                const touchX = evt.nativeEvent.locationX;
                const newRatio = Math.max(0, Math.min(1, touchX / (width - 70)));
                setEcoWeight(parseFloat(newRatio.toFixed(2)));
              }}
            >
              <View style={[styles.sliderFill, { width: `${ecoWeight * 100}%` }]} />
              <View style={[styles.sliderThumb, { left: `${ecoWeight * 100}%` }]} />
            </View>
          </View>

          {/* Sort Controls */}
          <Text style={styles.compareTitle}>Top 5 Products Sorted By:</Text>
          <View style={styles.sortToggleRow}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'green_value' && styles.sortButtonActive]}
              onPress={() => setSortBy('green_value')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'green_value' && styles.sortButtonTextActive]}>Green Value</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'ecoscore' && styles.sortButtonActive]}
              onPress={() => setSortBy('ecoscore')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'ecoscore' && styles.sortButtonTextActive]}>Eco Score</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'affordability' && styles.sortButtonActive]}
              onPress={() => setSortBy('affordability')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'affordability' && styles.sortButtonTextActive]}>Affordability</Text>
            </TouchableOpacity>
          </View>

          {/* 2-Column Grid Layout for Top 5 Products */}
          <View style={styles.productsGrid}>
            {displayedProducts.map((prod, index) => {
              const itemGrade = prod.ecoscore_grade?.toLowerCase() || 'a';
              const itemGradeColor = ECO_COLORS[itemGrade] || '#769E71';
              const isSelected = activeProduct?.barcode === prod.barcode;

              return (
                <TouchableOpacity
                  key={prod.barcode || index.toString()}
                  style={[styles.gridCard, isSelected && styles.activeGridCard]}
                  onPress={() => setActiveProduct(prod)}
                >
                  {/* Tiny Affordability Badge in Top Right Corner */}
                  <View style={styles.tinyAffordabilityBadge}>
                    <Text style={styles.tinyAffordabilityText}>💰 {prod.affordability_score || 'N/A'}</Text>
                  </View>

                  {/* Rank Badge */}
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                  </View>

                  <Image source={{ uri: prod.image_url }} style={styles.gridCardImage} resizeMode="contain" />

                  <Text style={styles.gridProductName} numberOfLines={2}>{prod.product_name}</Text>
                  <Text style={styles.gridBrandName} numberOfLines={1}>{prod.brands}</Text>

                  {/* Eco Grade Badge + Green Value Display */}
                  <View style={styles.cardFooterRow}>
                    <View style={[styles.miniGradeBadge, { backgroundColor: itemGradeColor }]}>
                      <Text style={styles.miniGradeText}>{itemGrade.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.greenValueScore}>GV: {prod._gv}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'forum') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topNavBack}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Ionicons name="arrow-back" size={24} color="#8D5B4C" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Local Sustainable Businesses</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={28} color="#5B8A59" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.forumContainer}>
          {posts.map((item) => (
            <View key={item.id} style={styles.forumCard}>
              <View style={styles.forumCardHeader}>
                <View style={styles.orangeDot} />
                <Text style={styles.forumName}>{item.name}</Text>
              </View>
              <Text style={styles.forumText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Recommend Local Business</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Business Name"
                placeholderTextColor="#A88374"
                value={newBizName}
                onChangeText={setNewBizName}
              />
              <TextInput
                style={[styles.inputBox, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Why is it sustainable?"
                placeholderTextColor="#A88374"
                multiline
                value={newBizText}
                onChangeText={setNewBizText}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: '#8D5B4C', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={addPost}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'scanner') {
    if (hasPermission === null) {
      return <View style={styles.container}><Text style={styles.centerText}>Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
      return <View style={styles.container}><Text style={styles.centerText}>No access to camera</Text></View>;
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
        />
        <SafeAreaView style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.scannerBackBtn} onPress={() => setCurrentScreen('home')}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.scanTargetBox}>
            <Text style={styles.scanInstruction}>Align product barcode within frame</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

// --- STYLESHEET (Cozy Earthy Theme) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  centerText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#8D5B4C',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justify: 'center',
    paddingHorizontal: 20,
  },
  monkeyHeaderBox: {
    width: 120,
    height: 120,
    backgroundColor: '#E6DCD0',
    borderRadius: 60,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  sproutBadge: {
    position: 'absolute',
    top: 15,
    right: 30,
  },
  welcomeTitle: {
    fontSize: 22,
    color: '#8D5B4C',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#769E71',
    width: '70%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: '#E8A857',
    width: '70%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextOrange: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerBar: {
    padding: 16,
    alignItems: 'center',
  },
  searchBarMock: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#D4C4B5',
    borderRadius: 20,
    width: '90%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justify: 'space-around',
    padding: 16,
  },
  catCardBread: {
    width: '44%',
    height: 140,
    backgroundColor: '#E8A857',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    alignItems: 'center',
    justify: 'center',
    marginBottom: 20,
  },
  catCardJam: {
    width: '44%',
    height: 140,
    backgroundColor: '#769E71',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    alignItems: 'center',
    justify: 'center',
    marginBottom: 20,
  },
  catCardPb: {
    width: '44%',
    height: 140,
    backgroundColor: '#769E71',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    alignItems: 'center',
    justify: 'center',
    marginBottom: 20,
  },
  catCardMore: {
    width: '44%',
    height: 140,
    backgroundColor: '#E8A857',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    alignItems: 'center',
    justify: 'center',
    marginBottom: 20,
  },
  catLabel: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#8D5B4C',
  },
  catLabelText: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 12,
  },
  moreText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justify: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E6DCD0',
    backgroundColor: '#F5F0EB',
  },
  topNavBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleText: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailContainer: {
    alignItems: 'center',
    padding: 20,
  },
  productImageBox: {
    width: 180,
    height: 180,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8D5B4C',
    borderRadius: 12,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 12,
  },
  productImageStyle: {
    width: '85%',
    height: '85%',
  },
  productNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8D5B4C',
    textAlign: 'center',
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A88374',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justify: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  priceBadge: {
    backgroundColor: '#E6DCD0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    color: '#8D5B4C',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadgeHighlight: {
    backgroundColor: '#769E71',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeTextHighlight: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreInfoBox: {
    alignSelf: 'stretch',
    backgroundColor: '#EFECE6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4C4B5',
  },
  scoreRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  scoreTextLabel: {
    color: '#8D5B4C',
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 2,
  },
  highlightGrade: {
    color: '#5B8A59',
    fontWeight: 'bold',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sliderCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#8D5B4C',
    marginBottom: 16,
  },
  sliderTitle: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justify: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sliderTrack: {
    height: 14,
    backgroundColor: '#E6DCD0',
    borderRadius: 7,
    justify: 'center',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#769E71',
    borderRadius: 7,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8D5B4C',
    top: -4,
    marginLeft: -11,
  },
  compareTitle: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sortToggleRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#E6DCD0',
    borderRadius: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#8D5B4C',
  },
  sortButtonText: {
    fontSize: 11,
    color: '#8D5B4C',
    fontWeight: 'bold',
  },
  sortButtonTextActive: {
    color: '#FFF',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justify: 'space-between',
    alignSelf: 'stretch',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4C4B5',
    padding: 10,
    marginBottom: 12,
    position: 'relative',
    alignItems: 'center',
  },
  activeGridCard: {
    borderColor: '#769E71',
    borderWidth: 2.5,
    backgroundColor: '#F3F8F3',
  },
  tinyAffordabilityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E8A857',
  },
  tinyAffordabilityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#8D5B4C',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#8D5B4C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridCardImage: {
    width: 70,
    height: 70,
    marginTop: 18,
    marginBottom: 8,
  },
  gridProductName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8D5B4C',
    textAlign: 'center',
    height: 32,
  },
  gridBrandName: {
    fontSize: 10,
    color: '#A88374',
    marginBottom: 6,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  miniGradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniGradeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  greenValueScore: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#769E71',
  },
  forumContainer: {
    padding: 20,
  },
  forumCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8D5B4C',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  forumCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8A857',
    marginRight: 8,
  },
  forumName: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 15,
  },
  forumText: {
    color: '#6E4E42',
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#F5F0EB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    padding: 20,
  },
  modalTitle: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 14,
    textAlign: 'center',
  },
  inputBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D4C4B5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    color: '#8D5B4C',
  },
  modalButtons: {
    flexDirection: 'row',
    justify: 'space-between',
    marginTop: 10,
  },
  cancelModalBtn: {
    padding: 10,
  },
  saveModalBtn: {
    backgroundColor: '#769E71',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  scannerOverlay: {
    flex: 1,
    justify: 'space-between',
    padding: 20,
  },
  scannerBackBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  scanTargetBox: {
    alignSelf: 'center',
    marginBottom: 40,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  scanInstruction: {
    color: '#FFF',
    fontSize: 14,
  },
});
