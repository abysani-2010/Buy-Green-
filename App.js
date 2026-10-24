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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import productsData from './products.json';

const { width } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, home, detail, forum, scanner
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  
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

  // Helper to calculate top 4 sustainable products sorted by ecoscore_score descending
  const loadCategoryTopProducts = (categoryKey) => {
    const items = productsData[categoryKey] || [];
    const sorted = [...items].sort((a, b) => b.ecoscore_score - a.ecoscore_score);
    return sorted.slice(0, 4);
  };

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const top4 = loadCategoryTopProducts(catKey);
    setTopProducts(top4);
    setActiveProduct(top4[0]); // default to the best one
    setCurrentScreen('detail');
  };

  const handleBarCodeScanned = ({ data }) => {
    // Search across all categories for barcode match
    for (const catKey of Object.keys(productsData)) {
      const found = productsData[catKey].find(p => p.barcode === data);
      if (found) {
        setSelectedCategory(catKey);
        setTopProducts(loadCategoryTopProducts(catKey));
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

  // --- RENDER SCREENS ---

  if (currentScreen === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <View style={styles.monkeyHeaderBox}>
            <View style={styles.monkeyHeaderBox}>
                <Image source={require('./assets/monkey.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
                <View style={styles.sproutBadge}><Text style={{fontSize: 10}}>🌱</Text></View>
            </View>
            <View style={styles.sproutBadge}><Text style={{fontSize: 10}}>🌱</Text></View>
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
            <Text style={{ color: '#8D5B4C', fontFamily: 'System' }}>Choose the product category</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.categoryGrid}>
            {/* Bread Category */}
            <TouchableOpacity style={styles.catCardBread} onPress={() => handleSelectCategory('multigrain_sliced_breads')}>
            <Image source={require('./assets/bread.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Bread</Text></View>
            </TouchableOpacity>

            {/* Jam Category */}
            <TouchableOpacity style={styles.catCardJam} onPress={() => handleSelectCategory('fruit_jam')}>
            <Image source={require('./assets/jam.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Jam</Text></View>
            </TouchableOpacity>

            {/* Peanut Butter Category */}
            <TouchableOpacity style={styles.catCardPb} onPress={() => handleSelectCategory('peanut_butter')}>
            <Image source={require('./assets/peanut_butter.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
            <View style={styles.catLabel}><Text style={styles.catLabelText}>Peanut butter</Text></View>
            </TouchableOpacity>

          <View style={styles.catCardMore}>
            <Text style={styles.moreText}>more{'\n'}soon!</Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topNavBack}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Ionicons name="arrow-back" size={24} color="#8D5B4C" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Sustainability Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContainer}>
          <View style={styles.productImageBox}>
            {activeProduct?.image_url ? (
              <Image source={{ uri: activeProduct.image_url }} style={styles.productImageStyle} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 40 }}>📦</Text>
            )}
          </View>

          <Text style={styles.productNameText}>~ {activeProduct?.product_name || 'PRODUCT NAME'} ~</Text>
          <Text style={styles.brandSubtitle}>Brand: {activeProduct?.brands}</Text>

          <View style={styles.scoreInfoBox}>
            <Text style={styles.scoreTextLabel}>Eco score grade: <Text style={styles.highlightGrade}>{activeProduct?.ecoscore_grade?.toUpperCase()}</Text></Text>
            <Text style={styles.scoreTextLabel}>Eco score score: <Text style={styles.highlightGrade}>{activeProduct?.ecoscore_score}/100</Text></Text>
          </View>

          <Text style={styles.compareTitle}>Compare with top products</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.circlesRow}>
            {topProducts.map((prod, index) => (
              <TouchableOpacity 
                key={prod.barcode} 
                style={[styles.circleItem, activeProduct?.barcode === prod.barcode && styles.activeCircle]}
                onPress={() => setActiveProduct(prod)}
              >
                <Image source={{ uri: prod.image_url }} style={styles.miniCircleImage} />
                <Text style={styles.circleNumber}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

        {/* Add Post Modal */}
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
    backgroundColor: '#F5F0EB', // Soft beige mockup background
  },
  centerText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#8D5B4C',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  monkeyHeaderBox: {
    width: 120,
    height: 120,
    backgroundColor: '#E6DCD0',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'System',
  },
  primaryButton: {
    backgroundColor: '#769E71', // Sage Green
    width: '70%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: '#E8A857', // Warm Ochre
    width: '70%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    justifyContent: 'space-around',
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
    justifyContent: 'center',
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
    justifyContent: 'center',
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
    justifyContent: 'center',
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
    justifyContent: 'center',
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
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E6DCD0',
    backgroundColor: '#F5F0EB',
  },
  topNavBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 200,
    height: 200,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8D5B4C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  productImageStyle: {
    width: '80%',
    height: '80%',
  },
  productNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8D5B4C',
    textAlign: 'center',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A88374',
    marginBottom: 16,
  },
  scoreInfoBox: {
    alignSelf: 'stretch',
    backgroundColor: '#EFECE6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4C4B5',
  },
  scoreTextLabel: {
    color: '#8D5B4C',
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 2,
  },
  highlightGrade: {
    color: '#5B8A59',
    fontWeight: 'bold',
  },
  compareTitle: {
    color: '#8D5B4C',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  circlesRow: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  circleItem: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: '#8D5B4C',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    position: 'relative',
  },
  activeCircle: {
    borderColor: '#5B8A59',
    borderWidth: 3,
    backgroundColor: '#E8F0E7',
  },
  miniCircleImage: {
    width: '70%',
    height: '70%',
    resizeMode: 'contain',
  },
  circleNumber: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#8D5B4C',
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    borderRadius: 6,
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
