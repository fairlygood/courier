import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { COUNTRIES, Country, countryName } from '../countries';
import { theme } from '../theme';

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

export default function CountryPicker({ selected, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  function open() {
    setSearch('');
    setVisible(true);
  }

  function close() {
    setVisible(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  const displayName = selected ? countryName(selected) : 'Not set';

  return (
    <>
      <Pressable style={styles.trigger} onPress={open}>
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {displayName}
        </Text>
        <Text style={styles.arrow}>{visible ? '▲' : '▼'}</Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable onPress={close}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search countries..."
              placeholderTextColor="#999"
              autoFocus
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }: { item: Country }) => (
                <Pressable
                  style={[
                    styles.row,
                    item.code === selected && styles.rowSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.code);
                    close();
                  }}
                >
                  <Text
                    style={[
                      styles.rowText,
                      item.code === selected && styles.rowTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.rowCode}>{item.code}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No countries found.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.inputPadding,
    height: theme.inputHeight,
  },
  triggerText: {
    flex: 1,
    fontSize: theme.fontSize.input,
    color: '#000',
  },
  triggerPlaceholder: {
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: '#000',
  },
  closeBtn: {
    fontSize: 22,
    color: '#999',
    padding: 4,
  },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.inputPadding,
    paddingVertical: 12,
    fontSize: theme.fontSize.input,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowSelected: {
    backgroundColor: '#f0f7ff',
  },
  rowText: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: '#333',
  },
  rowTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  rowCode: {
    fontSize: theme.fontSize.small,
    color: '#999',
    marginLeft: 8,
  },
  empty: {
    padding: 32,
    textAlign: 'center',
    color: '#999',
    fontSize: theme.fontSize.body,
  },
});
