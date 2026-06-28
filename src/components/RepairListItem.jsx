// RepairListItem – pojedynczy wiersz na liście zleceń
// Hierarchia wizualna: urządzenie (duże) → klient + opis → status + kwota

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useColors } from '../constants/ThemeContext';
import { formatDateShort } from '../utils/formatDate';
import STATUS, { statusColors } from '../constants/statuses';

// Mapowanie statusu na krótki emoji-skrót widoczny w karcie
const STATUS_EMOJI = {
  [STATUS.ACCEPTED]:  '🔵',
  [STATUS.DIAGNOSIS]: '🟡',
  [STATUS.REPAIR]:    '🔧',
  [STATUS.PARTS]:     '📦',
  [STATUS.READY]:     '✅',
  [STATUS.DELIVERED]: '🏁',
  [STATUS.CANCELLED]: '❌',
};

const RepairListItem = ({ repair, customerName, onPress }) => {
  const colors = useColors();
  const s      = makeStyles(colors);

  const total   = (repair.partsCost || 0) + (repair.serviceCost || 0);
  const statusColor = statusColors?.[repair.status] || colors.textSecondary;
  const statusEmoji = STATUS_EMOJI[repair.status] || '•';
  const isReady     = repair.status === STATUS.READY;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
      <View style={[s.card, isReady && s.cardReady]}>

        {/* Kolorowy pasek statusu po lewej stronie karty */}
        <View style={[s.statusStripe, { backgroundColor: statusColor }]} />

        <View style={s.content}>
          {/* WIERSZ 1: urządzenie (dominujące) + data */}
          <View style={s.row}>
            <Text style={s.device} numberOfLines={1}>
              {repair.brand} {repair.model}
            </Text>
            <Text style={s.date}>{formatDateShort(repair.createdAt)}</Text>
          </View>

          {/* WIERSZ 2: numer + klient */}
          <View style={s.row}>
            <Text style={s.number}>#{repair.displayNumber || repair.id}</Text>
            {customerName && (
              <Text style={s.customer} numberOfLines={1}>👤 {customerName}</Text>
            )}
          </View>

          {/* WIERSZ 3: opis usterki */}
          {repair.description ? (
            <Text style={s.desc} numberOfLines={1}>{repair.description}</Text>
          ) : null}

          {/* WIERSZ 4: status + kwota */}
          <View style={[s.row, s.bottom]}>
            <View style={[s.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
              <Text style={[s.statusText, { color: statusColor }]}>
                {statusEmoji} {repair.status}
              </Text>
            </View>
            <Text style={[s.amount, total > 0 && s.amountFilled]}>
              {total > 0 ? `${total} zł` : '—'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Subtelne zielone tło dla zleceń gotowych do odbioru – natychmiast widoczne
  cardReady: {
    borderWidth: 1.5,
    borderColor: colors.success + '50',
  },
  statusStripe: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottom: {
    marginTop: 6,
  },
  device: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  number: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  customer: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountFilled: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
});

export default RepairListItem;
