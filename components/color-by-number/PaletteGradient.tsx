import { LinearGradient, Stop } from 'react-native-svg';

import type { ArtGradient } from '@/lib/number-art';

export default function PaletteGradient({ id, color, gradient }: {
  id: string;
  color: string;
  gradient: ArtGradient;
}) {
  return (
    <LinearGradient id={id} x1="8%" y1="0%" x2="90%" y2="100%">
      <Stop offset="0" stopColor={gradient[0]} />
      <Stop offset="0.48" stopColor={color} />
      <Stop offset="1" stopColor={gradient[1]} />
    </LinearGradient>
  );
}
