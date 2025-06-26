import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  ActivityIndicator,
  StatusBar,
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import storiesData from '../assets/stories.json';

export default function App() {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [nfcMessage, setNfcMessage] = useState('');
  const [readVisible, setReadVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const flatListRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    NfcManager.start();
    setFiltered(storiesData);
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      storiesData.filter(item =>
        item.title.toLowerCase().includes(term)
      )
    );
  }, [search]);

  const handleClose = () => {
    cancelRef.current = true;
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setNfcStatus(null);
    setReadVisible(false);
  };

  const writeTag = async (id) => {
    const code = `02190530${id}00`;

    cancelRef.current = false;

    setNfcStatus('waiting');
    setNfcMessage('Hold an NFC tag near your device');

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);

      setNfcStatus('writing');
      setNfcMessage('Writing to tag...');

      const bytes = Ndef.encodeMessage([Ndef.textRecord(code)]);
      if (!bytes) throw new Error('Invalid NDEF message');

      await NfcManager.writeNdefMessage(bytes, {reconnectAfterWrite: false})

      setNfcStatus('success');
      setNfcMessage('✅ Tag written successfully!');
    } catch (e) {
      if (!cancelRef.current) {
        setNfcStatus('error');
        setNfcMessage('❌ Error writing to tag: ' + (e.message ?? 'Unknown error'));
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      if (!cancelRef.current) {
        setTimeout(() => setNfcStatus(null), 2000);
      } else {
        cancelRef.current = false;
      }
    }
  };

  const readTag = async () => {
    cancelRef.current = false;
    setReadVisible(true);

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const ndef = tag?.ndefMessage?.[0];
      if (!ndef) throw new Error('No NDEF message');
      const text = Ndef.text.decodePayload(ndef.payload);
      const match = /02190530(\d{4})00/.exec(text);
      const readId = match?.[1];
      if (!readId) throw new Error('Invalid tag');
      const index = storiesData.findIndex(s => s.id === readId);
      if (index === -1) {
        throw new Error('notfound');
      }

      setReadVisible(false);
      setSelectedId(readId);
      setSearch('');
      setFiltered(storiesData);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      }, 100);
    } catch (e) {
      if (!cancelRef.current) {
        setReadVisible(false);
        if (e.message === 'notfound') {
          setErrorMessage('❌ Tag not found');
        } else {
          setErrorMessage('❌ Error reading tag: ' + (e.message ?? 'Unknown error'));
        }
        setErrorVisible(true);
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      cancelRef.current = false;
    }
  };

  const languageFlags = {
    Italian: '🇮🇹',
    English: '🇬🇧',
    French: '🇫🇷',
    German: '🇩🇪',
    Spanish: '🇪🇸',
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => writeTag(item.id)}
      style={[styles.item, item.id === selectedId && styles.selectedItem]}
    >
      <Text
        style={styles.title}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>
      <Text style={styles.flag}>{languageFlags[item.language] ?? '🏳️'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f0e4f7" barStyle="dark-content" />
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search..."
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
        <TouchableOpacity onPress={readTag} style={styles.iconButton}>
          <MaterialCommunityIcons name="nfc" size={28} color="#7c4dff" />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
      <Modal
        visible={!!nfcStatus}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {nfcStatus === 'writing' && <ActivityIndicator size="large" />}
            <Text style={styles.modalText}>{nfcMessage}</Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={readVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" />
            <Text style={styles.modalText}>Hold an NFC tag near your device</Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={errorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#f0e4f7',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
    resizeMode: 'contain',
  },
  item: {
    padding: 16,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  flag: {
    fontSize: 20,
  },
  selectedItem: {
    backgroundColor: '#d0f0ff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: 250,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  iconButton: {
    marginLeft: 8,
  },
  cancelButton: {
    marginTop: 20,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5eafc',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 12,
    color: '#000',
  },

});
