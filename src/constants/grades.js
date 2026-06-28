// Stany wizualne telefonów w skupie – Grade A do D
// Używane w TradeAddScreen jako dropdown i w TradeDetailScreen jako badge

const grades = [
  {
    value: 'A',
    label: 'Grade A – Idealny',
    description: 'Brak śladów użytkowania, jak nowy',
    color: '#1DB954',   // zielony
    emoji: '🟢',
  },
  {
    value: 'B',
    label: 'Grade B – Dobry',
    description: 'Drobne ryski niewidoczne z odległości 30cm',
    color: '#3B82F6',   // niebieski
    emoji: '🔵',
  },
  {
    value: 'C',
    label: 'Grade C – Przeciętny',
    description: 'Widoczne ryski, ślady użytkowania, brak pęknięć',
    color: '#F59E0B',   // żółty
    emoji: '🟡',
  },
  {
    value: 'D',
    label: 'Grade D – Uszkodzony',
    description: 'Pęknięcia, głębokie ryski, uszkodzenia mechaniczne',
    color: '#FF4C4C',   // czerwony
    emoji: '🔴',
  },
];

export const gradeColors = grades.reduce((acc, g) => {
  acc[g.value] = g.color;
  return acc;
}, {});

export const gradeEmojis = grades.reduce((acc, g) => {
  acc[g.value] = g.emoji;
  return acc;
}, {});

export default grades;
