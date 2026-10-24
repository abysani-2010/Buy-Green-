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
import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import productsData from './products.json';
import initialForumPosts from './forumData.json';

const { width, height } = Dimensions.get('window');
const FORUM_STORAGE_KEY = '@forum_posts_key_v1';

const ECO_COLORS = {
  a: '#6B8E4E',
  b: '#94B379',
  c: '#DEAA50',
  d: '#B87233',
  e: '#983A20',
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Gaegu_400Regular,
    Gaegu_700Bold,
  });

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  
  // Sorting & Weighting State
  const [sortBy, setSortBy] = useState('green_value'); // 'green_value', 'ecoscore', 'affordability', 'alphabetical'
  const [ecoWeight, setEcoWeight] = useState(0.5);

  // Forum state
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizText, setNewBizText] = useState('');

  // Expo SDK 58 Camera Permission Hook
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Load saved forum posts on startup or fallback to initial JSON
  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    try {
      const storedPosts = await AsyncStorage.getItem(FORUM_STORAGE_KEY);
      const parsed = storedPosts ? JSON.parse(storedPosts) : null;
      
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        setPosts(parsed);
      } else {
        // Fallback to initial forumData.json if empty or not found
        const defaults = initialForumPosts || [];
        setPosts(defaults);
        await AsyncStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch (e) {
      console.log('Error loading saved forum posts:', e);
      setPosts(initialForumPosts || []);
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

  if (!fontsLoaded) {
    return null;
  }

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
        return item._aff > (activeProduct._aff ?? activeProduct.affordability_score ?? 0);
      }
      return item._gv > (activeProduct._gv ?? calculateScores(activeProduct, ecoWeight).greenValue);
    });

    return filtered.slice(0, 5);
  };

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    setActiveProduct(null);
    const sorted = getSortedProducts(catKey, sortBy, ecoWeight);
    setDisplayedProducts(sorted);
    setCurrentScreen('detail');
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const scannedClean = data.trim();

    for (const catKey of Object.keys(productsData)) {
      const found = productsData[catKey].find(p => {
        if (!p.barcode) return false;
        const itemBarcode = p.barcode.toString().trim();

        // 1. Direct match
        if (itemBarcode === scannedClean) return true;

        // 2. Contains match
        if (scannedClean.includes(itemBarcode) || itemBarcode.includes(scannedClean)) return true;

        // 3. Match ignoring all leading zeros
        if (scannedClean.replace(/^0+/, '') === itemBarcode.replace(/^0+/, '')) return true;

        return false;
      });

      if (found) {
        setSelectedCategory(catKey);
        setActiveProduct(found);
        setCurrentScreen('detail');
        setScanned(false);
        return;
      }
    }
    
    Alert.alert("Product Not Found", `Product with barcode ${data} not found in database.`, [
      { text: "OK", onPress: () => setScanned(false) }
    ]);
  };

  const addPost = async () => {
    if (!newBizName.trim() || !newBizText.trim()) return;
    const updated = [{ id: Date.now().toString(), name: newBizName, text: newBizText }, ...posts];
    setPosts(updated);
    await savePostsToStorage(updated);
    setNewBizName('');
    setNewBizText('');
    setModalVisible(false);
  };

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
            <Image 
              source={require('./assets/monkey.png')} 
              style={styles.monkeyImage} 
              resizeMode="contain" 
            />
          </View>
          
          <Text style={styles.welcomeTitle}>~ buy green ~</Text>

          <View style={styles.welcomeButtonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentScreen('home')}>
              <Text style={styles.buttonText}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentScreen('home')}>
              <Text style={styles.buttonText}>Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <View style={styles.searchBarMock}>
            <Ionicons name="search" size={20} color="#983A20" style={{ marginRight: 8 }} />
            <Text style={styles.searchBarText}>Choose the product category</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.categoryGrid}>
          <TouchableOpacity style={styles.catCardBread} onPress={() => handleSelectCategory('multigrain_sliced_breads')}>
            <Image source={require('./assets/bread.png')} style={styles.catImage} resizeMode="contain" />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Bread</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.catCardJam} onPress={() => handleSelectCategory('fruit_jam')}>
            <Image source={require('./assets/jam.png')} style={styles.catImage} resizeMode="contain" />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Jam</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.catCardPb} onPress={() => handleSelectCategory('peanut_butter')}>
            <Image source={require('./assets/peanut_butter.png')} style={styles.catImage} resizeMode="contain" />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Peanut butter</Text></View>
          </TouchableOpacity>

          <View style={styles.catCardMore}>
            <View style={styles.catLabelMore}>
              <Text style={styles.moreLabelText}>More soon!</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => setCurrentScreen('forum')} style={styles.navTouchArea}>
            <Ionicons name="chatbubbles-outline" size={32} color="#983A20" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setScanned(false); setCurrentScreen('scanner'); }} style={styles.navTouchArea}>
            <Ionicons name="camera-outline" size={32} color="#983A20" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'detail') {
    const activeGrade = activeProduct?.ecoscore_grade?.toLowerCase() || 'a';
    const gradeColor = ECO_COLORS[activeGrade] || '#94B379';
    const betterProducts = activeProduct ? getBetterProducts() : [];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topNavBack}>
          <TouchableOpacity 
            style={styles.backButtonTouch} 
            onPress={() => {
              if (activeProduct) {
                setActiveProduct(null);
              } else {
                setCurrentScreen('home');
              }
            }}
          >
            <Ionicons name="arrow-back" size={28} color="#983A20" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>
            {activeProduct ? 'Product Details' : 'All Category Products'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContainer}>
          {activeProduct && (
            <View style={styles.activeProductSection}>
              <View style={styles.productImageBox}>
                {activeProduct?.image_url ? (
                  <Image source={{ uri: activeProduct.image_url }} style={styles.productImageStyle} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 40, fontFamily: 'Gaegu_400Regular' }}>📦</Text>
                )}
              </View>

              <Text style={styles.productNameText}>~ {activeProduct?.product_name || 'PRODUCT NAME'} ~</Text>
              <Text style={styles.brandSubtitle}>Brand: {activeProduct?.brands || 'Unknown'}</Text>

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

              <Text style={styles.compareTitle}>Higher Rated Alternatives ({sortBy.replace('_', ' ')})</Text>
              {betterProducts.length === 0 ? (
                <View style={styles.noBetterBox}>
                  <Text style={styles.noBetterText}>🌟 No higher scoring products in this category for this metric!</Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {betterProducts.map((prod, index) => {
                    const itemGrade = prod.ecoscore_grade?.toLowerCase() || 'a';
                    const itemGradeColor = ECO_COLORS[itemGrade] || '#94B379';

                    return (
                      <TouchableOpacity
                        key={prod.barcode || index.toString()}
                        style={styles.gridCard}
                        onPress={() => setActiveProduct(prod)}
                      >
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                        </View>

                        <Image source={{ uri: prod.image_url }} style={styles.gridCardImage} resizeMode="contain" />
                        <Text style={styles.gridProductName} numberOfLines={2}>{prod.product_name}</Text>
                        <Text style={styles.gridBrandName} numberOfLines={1}>{prod.brands}</Text>

                        <View style={styles.cardFooterRow}>
                          <View style={[styles.miniGradeBadge, { backgroundColor: itemGradeColor }]}>
                            <Text style={styles.miniGradeText}>{itemGrade.toUpperCase()}</Text>
                          </View>
                          {sortBy === 'green_value' && <Text style={styles.greenValueScore}>GV: {prod._gv}</Text>}
                          {sortBy === 'ecoscore' && <Text style={styles.greenValueScore}>Eco: {prod._eco}</Text>}
                          {sortBy === 'affordability' && <Text style={styles.greenValueScore}>Aff: {prod._aff}</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {sortBy === 'green_value' && (
            <View style={styles.sliderCard}>
              <Text style={styles.sliderTitle}>Preference Balance Weight</Text>
              <View style={styles.sliderLabelsRow}>
                <Text style={[styles.sliderLabel, { color: '#DEAA50' }]}>💰 Affordability ({(100 - ecoWeight * 100).toFixed(0)}%)</Text>
                <Text style={[styles.sliderLabel, { color: '#94B379' }]}>🌱 Eco Score ({(ecoWeight * 100).toFixed(0)}%)</Text>
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
          )}

          <Text style={styles.compareTitle}>
            {activeProduct ? 'Sort Alternatives By:' : 'Sort Category Products By:'}
          </Text>
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

            {!activeProduct && (
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'alphabetical' && styles.sortButtonActive]}
                onPress={() => setSortBy('alphabetical')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'alphabetical' && styles.sortButtonTextActive]}>A-Z</Text>
              </TouchableOpacity>
            )}
          </View>

          {!activeProduct && (
            <View style={styles.productsGrid}>
              {displayedProducts.map((prod, index) => {
                const itemGrade = prod.ecoscore_grade?.toLowerCase() || 'a';
                const itemGradeColor = ECO_COLORS[itemGrade] || '#94B379';

                return (
                  <TouchableOpacity
                    key={prod.barcode || index.toString()}
                    style={styles.gridCard}
                    onPress={() => setActiveProduct(prod)}
                  >
                    <Image source={{ uri: prod.image_url }} style={styles.gridCardImage} resizeMode="contain" />

                    <Text style={styles.gridProductName} numberOfLines={2}>{prod.product_name}</Text>
                    <Text style={styles.gridBrandName} numberOfLines={1}>{prod.brands}</Text>

                    <View style={styles.cardFooterRow}>
                      <View style={[styles.miniGradeBadge, { backgroundColor: itemGradeColor }]}>
                        <Text style={styles.miniGradeText}>{itemGrade.toUpperCase()}</Text>
                      </View>

                      {sortBy === 'green_value' && <Text style={styles.greenValueScore}>GV: {prod._gv}</Text>}
                      {sortBy === 'ecoscore' && <Text style={styles.greenValueScore}>Eco: {prod._eco}</Text>}
                      {sortBy === 'affordability' && <Text style={styles.greenValueScore}>Aff: {prod._aff}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'forum') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topNavBackForum}>
          <TouchableOpacity style={styles.backButtonTouch} onPress={() => setCurrentScreen('home')}>
            <Ionicons name="arrow-back" size={28} color="#983A20" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Local Sustainable Businesses</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={32} color="#94B379" />
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
                placeholderTextColor="#983A20"
                value={newBizName}
                onChangeText={setNewBizName}
              />
              <TextInput
                style={[styles.inputBox, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Why is it sustainable?"
                placeholderTextColor="#983A20"
                multiline
                value={newBizText}
                onChangeText={setNewBizText}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={addPost}>
                  <Text style={styles.modalBtnPostText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'scanner') {
    if (!permission) {
      return (
        <View style={styles.container}>
          <Text style={styles.centerText}>Requesting camera permission...</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.centerText}>Camera permission required</Text>
          <TouchableOpacity 
            style={[styles.primaryButton, { alignSelf: 'center', marginTop: 20 }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryButton, { alignSelf: 'center', marginTop: 12 }]}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerWrapper}>
        <CameraView
          style={styles.cameraViewStyle}
          facing="back"
          animateShutter={false}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"],
          }}
        />
        <SafeAreaView style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.scannerBackBtn} onPress={() => setCurrentScreen('home')}>
            <Ionicons name="close" size={32} color="#F1EBE2" />
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

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EBE2',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scannerWrapper: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000000',
    position: 'relative',
  },
  cameraViewStyle: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerText: {
    fontFamily: 'Gaegu_400Regular',
    textAlign: 'center',
    marginTop: 60,
    color: '#983A20',
    fontSize: 20,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justify: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  monkeyHeaderBox: {
    width: 240,
    height: 240,
    backgroundColor: '#F1EBE2',
    borderRadius: 120,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 24,
    marginTop: 40,
    paddingTop: 35,
    borderWidth: 3,
    borderColor: '#983A20',
  },
  monkeyImage: {
    width: 180,
    height: 180,
  },
  welcomeTitle: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 34,
    color: '#983A20',
    marginBottom: 40,
  },
  welcomeButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#94B379',
    width: '75%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: '#DEAA50',
    width: '75%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 22,
  },
  headerBar: {
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  searchBarMock: {
    flexDirection: 'row',
    backgroundColor: '#F1EBE2',
    borderWidth: 2,
    borderColor: '#983A20',
    borderRadius: 20,
    width: '90%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  searchBarText: {
    fontFamily: 'Gaegu_400Regular',
    color: '#983A20',
    fontSize: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  catCardBread: {
    width: (width - 32 - 10) / 2,
    height: 165,
    backgroundColor: '#DEAA50',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8,
  },
  catCardJam: {
    width: (width - 32 - 10) / 2,
    height: 165,
    backgroundColor: '#94B379',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8,
  },
  catCardPb: {
    width: (width - 32 - 10) / 2,
    height: 165,
    backgroundColor: '#94B379',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8,
  },
  catCardMore: {
    width: (width - 32 - 10) / 2,
    height: 165,
    backgroundColor: '#DEAA50',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'center',
  },
  catImage: {
    width: 115,
    height: 115,
    marginBottom: 2,
  },
  catLabel: {
    backgroundColor: '#F1EBE2',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'center',
  },
  catLabelMore: {
    backgroundColor: '#F1EBE2',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#983A20',
    alignItems: 'center',
    justify: 'center',
    marginTop: 60,
  },
  catLabelText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 18,
  },
  moreLabelText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 18,
    textAlign: 'center',
  },
  moreText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    textAlign: 'center',
    fontSize: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justify: 'center',
    alignItems: 'center',
    gap: 60,
    paddingTop: 12,
    paddingBottom: 48,
    borderTopWidth: 2,
    borderColor: '#983A20',
    backgroundColor: '#F1EBE2',
  },
  navTouchArea: {
    padding: 10,
  },
  topNavBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 12,
  },
  topNavBackForum: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 12,
  },
  backButtonTouch: {
    padding: 8,
  },
  headerTitleText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 22,
  },
  detailContainer: {
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  activeProductSection: {
    width: '100%',
    alignItems: 'center',
  },
  productImageBox: {
    width: 180,
    height: 180,
    backgroundColor: '#F1EBE2',
    borderWidth: 2,
    borderColor: '#983A20',
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
    fontFamily: 'Gaegu_700Bold',
    fontSize: 22,
    color: '#983A20',
    textAlign: 'center',
    marginBottom: 2,
  },
  brandSubtitle: {
    fontFamily: 'Gaegu_400Regular',
    fontSize: 16,
    color: '#983A20',
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
    backgroundColor: '#F1EBE2',
    borderWidth: 1,
    borderColor: '#983A20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontFamily: 'Gaegu_400Regular',
    color: '#983A20',
    fontSize: 16,
  },
  priceBadgeHighlight: {
    backgroundColor: '#94B379',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeTextHighlight: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 16,
  },
  scoreInfoBox: {
    alignSelf: 'stretch',
    backgroundColor: '#F1EBE2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#983A20',
  },
  scoreRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  scoreTextLabel: {
    fontFamily: 'Gaegu_400Regular',
    color: '#983A20',
    fontSize: 18,
    marginVertical: 2,
  },
  highlightGrade: {
    fontFamily: 'Gaegu_700Bold',
    color: '#94B379',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 16,
  },
  noBetterBox: {
    padding: 16,
    backgroundColor: '#F1EBE2',
    borderWidth: 1.5,
    borderColor: '#983A20',
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  noBetterText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    textAlign: 'center',
    fontSize: 16,
  },
  sliderCard: {
    alignSelf: 'stretch',
    backgroundColor: '#F1EBE2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#983A20',
    marginBottom: 16,
  },
  sliderTitle: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 18,
    marginBottom: 6,
    textAlign: 'center',
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justify: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 15,
  },
  sliderTrack: {
    height: 14,
    backgroundColor: '#F1EBE2',
    borderColor: '#983A20',
    borderWidth: 1,
    borderRadius: 7,
    justify: 'center',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#94B379',
    borderRadius: 7,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#983A20',
    top: -5,
    marginLeft: -11,
  },
  compareTitle: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 20,
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
    backgroundColor: '#F1EBE2',
    borderColor: '#983A20',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#983A20',
  },
  sortButtonText: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 14,
    color: '#983A20',
  },
  sortButtonTextActive: {
    color: '#F1EBE2',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justify: 'space-between',
    alignSelf: 'stretch',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F1EBE2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#983A20',
    padding: 10,
    marginBottom: 12,
    position: 'relative',
    alignItems: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#983A20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 14,
  },
  gridCardImage: {
    width: 75,
    height: 75,
    marginTop: 12,
    marginBottom: 8,
  },
  gridProductName: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 16,
    color: '#983A20',
    textAlign: 'center',
    height: 36,
  },
  gridBrandName: {
    fontFamily: 'Gaegu_400Regular',
    fontSize: 14,
    color: '#983A20',
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
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 14,
  },
  greenValueScore: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 15,
    color: '#94B379',
  },
  forumContainer: {
    padding: 16,
  },
  forumCard: {
    backgroundColor: '#F1EBE2',
    borderWidth: 2,
    borderColor: '#983A20',
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
    backgroundColor: '#DEAA50',
    marginRight: 8,
  },
  forumName: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 18,
  },
  forumText: {
    fontFamily: 'Gaegu_400Regular',
    color: '#983A20',
    fontSize: 16,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justify: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#F1EBE2',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#983A20',
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Gaegu_700Bold',
    color: '#983A20',
    fontSize: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  inputBox: {
    fontFamily: 'Gaegu_400Regular',
    fontSize: 16,
    backgroundColor: '#F1EBE2',
    borderWidth: 1,
    borderColor: '#983A20',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    color: '#983A20',
  },
  modalButtons: {
    flexDirection: 'row',
    justify: 'space-between',
    marginTop: 10,
  },
  cancelModalBtn: {
    padding: 10,
  },
  modalBtnCancelText: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 18,
    color: '#983A20',
  },
  modalBtnPostText: {
    fontFamily: 'Gaegu_700Bold',
    fontSize: 18,
    color: '#F1EBE2',
  },
  saveModalBtn: {
    backgroundColor: '#94B379',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  scannerOverlay: {
    flex: 1,
    justify: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },
  scannerBackBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 25,
  },
  scanTargetBox: {
    alignSelf: 'center',
    marginBottom: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
  },
  scanInstruction: {
    fontFamily: 'Gaegu_700Bold',
    color: '#F1EBE2',
    fontSize: 18,
  },
});
