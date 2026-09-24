import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useContacts } from '../contexts/ContactsContext';
import { CircleDraft, CircleEditor, CirclesView } from '../features/circles/CirclesView';
import { PeoplePicker } from '../features/stats/PeoplePicker';
import { Audience, Circle, fetchCircles, saveAudience, saveCircles } from '../services/socialApi';

export default function CirclesScreen() {
  const router = useRouter();
  const { contacts, find } = useContacts();
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [audience, setAudience] = useState<Audience>({ mode: 'all', circles: [] });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CircleDraft | null>(null);
  const [picking, setPicking] = useState<CircleDraft | null>(null);

  useEffect(() => {
    fetchCircles()
      .then((data) => {
        setCircles(data.circles);
        setAudience(data.audience);
      })
      .catch(() => {
        setCircles([]);
        Alert.alert('Nicht geladen', 'Deine Kreise konnten nicht geladen werden.');
      });
  }, []);

  const registered = useMemo(
    () => contacts.filter((c) => c.registered).map(({ phone, name, avatarUrl }) => ({ phone, name, avatarUrl })),
    [contacts]
  );
  const person = useCallback(
    (phone: string) => {
      const c = find(phone);
      return { phone, name: c?.name || phone, avatarUrl: c?.avatarUrl ?? null };
    },
    [find]
  );

  const persist = async (next: CircleDraft[]) => {
    setSaving(true);
    try {
      const saved = await saveCircles(next);
      setCircles(saved.circles);
      setAudience(saved.audience);
    } catch {
      Alert.alert('Nicht gespeichert', 'Deine Kreise konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = (draft: CircleDraft) => {
    const list = circles ?? [];
    const next = draft.id ? list.map((c) => (c.id === draft.id ? { ...c, ...draft } : c)) : [...list, draft];
    setEditing(null);
    persist(next);
  };

  const remove = (draft: CircleDraft) =>
    Alert.alert(`„${draft.name}“ löschen?`, 'Die Personen bleiben natürlich deine Kontakte.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          setEditing(null);
          persist((circles ?? []).filter((c) => c.id !== draft.id));
        },
      },
    ]);

  const changeAudience = async (next: Audience) => {
    const previous = audience;
    setAudience(next);
    try {
      setAudience(await saveAudience(next));
    } catch {
      setAudience(previous);
      Alert.alert('Nicht gespeichert', 'Die Sichtbarkeit konnte nicht geändert werden.');
    }
  };

  return (
    <>
      <CirclesView
        circles={circles}
        audience={audience}
        saving={saving}
        person={person}
        onBack={() => router.back()}
        onChangeAudience={changeAudience}
        onEdit={setEditing}
      />
      {editing && (
        <CircleEditor
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={saveDraft}
          onDelete={editing.id ? () => remove(editing) : undefined}
          onPickMembers={(current) => {
            // One modal at a time: the picker replaces the editor, then back
            setEditing(null);
            setPicking(current);
          }}
        />
      )}
      {picking && (
        <PeoplePicker
          title={`Wer gehört zu ${picking.emoji} ${picking.name || 'diesem Kreis'}?`}
          people={registered}
          initial={picking.members}
          onCancel={() => {
            setEditing(picking);
            setPicking(null);
          }}
          onDone={(members) => {
            setEditing({ ...picking, members });
            setPicking(null);
          }}
        />
      )}
    </>
  );
}
