import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ScheduleView } from '../features/schedule/ScheduleView';
import {
  fetchSchedule,
  NextSlot,
  nextSlotLabel,
  saveSchedule,
  Slot,
  WEEKDAYS_LONG,
} from '../services/gamificationApi';

const overlaps = (a: Slot, b: Slot) => a.day === b.day && a.start < b.end && b.start < a.end;
const bySlot = (a: Slot, b: Slot) => a.day - b.day || a.start - b.start;

export default function ScheduleScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [next, setNext] = useState<NextSlot>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchSchedule()
      .then(({ schedule, next: upcoming }) => {
        setEnabled(schedule.enabled);
        setSlots(schedule.slots);
        setNext(upcoming);
      })
      .catch(() => Alert.alert('Nicht geladen', 'Dein Zeitplan konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(
    async (nextEnabled: boolean, nextSlots: Slot[]) => {
      setSaving(true);
      try {
        const result = await saveSchedule({ enabled: nextEnabled, slots: nextSlots });
        setNext(result.next);
        setDirty(false);
        return true;
      } catch {
        Alert.alert('Nicht gespeichert', 'Dein Zeitplan konnte nicht gespeichert werden. Bitte versuche es erneut.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const toggle = async (value: boolean) => {
    setEnabled(value);
    if (!(await save(value, slots))) setEnabled(!value);
  };

  const add = (days: number[], start: number, end: number) => {
    const added: Slot[] = [];
    const clashes: number[] = [];
    for (const day of days) {
      const slot = { day, start, end };
      if (slots.some((s) => overlaps(s, slot))) clashes.push(day);
      else added.push(slot);
    }
    if (clashes.length) {
      Alert.alert(
        'Überschneidung',
        `Am ${clashes.map((d) => WEEKDAYS_LONG[d]).join(', ')} gibt es schon ein Zeitfenster zu dieser Zeit.`
      );
    }
    if (added.length) {
      setSlots((current) => [...current, ...added].sort(bySlot));
      setDirty(true);
    }
  };

  const remove = (slot: Slot) => {
    setSlots((current) => current.filter((s) => !(s.day === slot.day && s.start === slot.start)));
    setDirty(true);
  };

  const back = () => {
    if (!dirty) return router.back();
    Alert.alert('Änderungen speichern?', undefined, [
      { text: 'Verwerfen', style: 'destructive', onPress: () => router.back() },
      {
        text: 'Speichern',
        onPress: async () => {
          if (await save(enabled, slots)) router.back();
        },
      },
    ]);
  };

  return (
    <ScheduleView
      enabled={enabled}
      slots={slots}
      loading={loading}
      saving={saving}
      dirty={dirty}
      nextLabel={nextSlotLabel(next)}
      onBack={back}
      onToggle={toggle}
      onAdd={add}
      onRemove={remove}
      onSave={() => save(enabled, slots)}
    />
  );
}
