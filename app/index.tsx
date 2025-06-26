import React, { useEffect, useState, useRef } from 'react';
import { Modal, ActivityIndicator, StatusBar } from 'react-native';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  TouchableOpacity, Alert, Image
} from 'react-native';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import storiesData from '../assets/stories.json';

export default function App() {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [nfcMessage, setNfcMessage] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const listRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    NfcManager.start();
    setFiltered(storiesData);
  }, []);

  useEffect(() => {
    if (nfcStatus) {
      NfcManager.unregisterTagEvent().catch(() => {});
      return;
    }

    NfcManager.registerTagEvent(async tag => {
      try {
        const record = tag.ndefMessage?.[0];
        if (!record) return;
        const text = Ndef.text.decodePayload(record.payload);
        const match = text.match(/^02190530(.*)00$/);
        const id = match?.[1];
        if (!id) return;
        const index = storiesData.findIndex(item => item.id === id);
        if (index !== -1) {
          setHighlightedId(id);
          listRef.current?.scrollToIndex({ index, animated: true });
          setTimeout(() => setHighlightedId(null), 2000);
        }
      } catch {}
    }).catch(() => {});

    return () => {
      NfcManager.unregisterTagEvent().catch(() => {});
    };
  }, [nfcStatus]);

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

  const languageFlags = {
    Italian: '🇮🇹',
    English: '🇬🇧',
    French: '🇫🇷',
    German: '🇩🇪',
    Spanish: '🇪🇸',
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => writeTag(item.id)}
      style={[
        styles.item,
        highlightedId === item.id && styles.highlight,
      ]}
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
      <TextInput
        placeholder="Search..."
        placeholderTextColor="#444"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <FlatList
        ref={listRef}
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
  highlight: {
    backgroundColor: '#fffa8b',
  },
  title: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  flag: {
    fontSize: 20,
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
  input: {
    height: 40,
    backgroundColor: '#f5eafc',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 12,
    color: '#000',
  },

});
