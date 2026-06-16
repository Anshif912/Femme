import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { api } from '../../utils/api';
import { Users, UserPlus, Trash2, ShieldAlert, Check, Edit2 } from 'lucide-react-native';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleEditSelect = (contact: any) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setPriority(contact.priority);
    setError('');
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPriority(1);
    setError('');
    setMessage('');
  };

  const handleSaveContact = async () => {
    setError('');
    setMessage('');

    if (!name.trim() || !phone.trim()) {
      setError('Name and Phone fields are required.');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.updateContact(editingId, {
          name: name.trim(),
          phone: phone.trim(),
          priority,
        });
        setMessage('Contact details updated successfully.');
        setEditingId(null);
      } else {
        await api.addContact({
          name: name.trim(),
          phone: phone.trim(),
          priority,
        });
        setMessage('Contact successfully registered as priority guardian.');
      }
      setName('');
      setPhone('');
      setPriority(1);
      fetchContacts();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (contactId: string) => {
    Alert.alert(
      'Remove Guardian',
      'Remove this contact from emergency guardian list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteContact(contactId);
              fetchContacts();
            } catch (err) {
              console.log(err);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Trusted Contacts</Text>
          <Text style={styles.subtitle}>
            Configure priority guardian details. These contacts receive live maps and emergency alert notifications.
          </Text>
        </View>

        {message ? (
          <View style={styles.successAlert}>
            <Check size={16} color="#10b881" style={styles.alertIcon} />
            <Text style={styles.successAlertText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorAlert}>
            <ShieldAlert size={16} color="#ef4444" style={styles.alertIcon} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* Add Contact Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={18} color="#f43f5e" />
            <Text style={styles.cardTitle}>Add New Guardian</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Guardian Name</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Mom"
                placeholderTextColor="#4b5563"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., +919999988888"
                placeholderTextColor="#4b5563"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alert Priority</Text>
              <View style={styles.prioritySelector}>
                {[1, 2, 3].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.priorityOption,
                      priority === num && styles.priorityOptionActive,
                    ]}
                    onPress={() => setPriority(num)}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        priority === num && styles.priorityTextActive,
                      ]}
                    >
                      P{num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.priorityHelpText}>
                {priority === 1 && 'Priority 1: Receives direct SMS & automated call triggers.'}
                {priority === 2 && 'Priority 2: Receives direct emergency SMS.'}
                {priority === 3 && 'Priority 3: Receives secondary emergency SMS fallback.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSaveContact}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>{editingId ? 'Update Guardian Details' : 'Register Priority Guardian'}</Text>
              )}
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={handleCancelEdit}
                disabled={loading}
              >
                <Text style={styles.cancelEditBtnText}>Cancel Editing</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Configured Contacts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color="#f43f5e" />
            <Text style={styles.cardTitle}>Configured Guardians ({contacts.length})</Text>
          </View>

          <View style={styles.listContainer}>
            {contacts.map((contact, index) => (
              <View key={contact.id || index} style={styles.contactItem}>
                <View style={styles.contactLeft}>
                  <View style={styles.priorityTag}>
                    <Text style={styles.priorityTagText}>P{contact.priority}</Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>

                <View style={styles.actionRowList}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEditSelect(contact)}
                  >
                    <Edit2 size={14} color="#fb7185" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(contact.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {contacts.length === 0 ? (
              <Text style={styles.emptyText}>
                No trusted contacts configured. Make sure to add at least one priority contact before traveling.
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f12',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  header: {
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 18,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successAlertText: {
    color: '#34d399',
    fontSize: 12,
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  alertIcon: {
    marginRight: 8,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 13,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    height: 40,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityOptionActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#f43f5e',
  },
  priorityText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityTextActive: {
    color: '#fb7185',
  },
  priorityHelpText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  button: {
    height: 48,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#1e1e24',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContainer: {
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f0f12',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityTag: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    borderColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityTagText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: 'black',
  },
  contactName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  contactPhone: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e1e24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    fontWeight: '300',
  },
  cancelEditBtn: {
    height: 48,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelEditBtnText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionRowList: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
