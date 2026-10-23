import React from 'react';
import { View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { FigmaIcon } from './FigmaIcon';
import type { WhatsappRingSpec } from './whatsappRing';

/** The `Yu` instance: a navy ring with the WhatsApp glyph scaled inside it. */
export function WhatsappRingGlyph({ spec }: { spec: WhatsappRingSpec }) {
  return (
    <View
      style={{
        width: spec.ring,
        height: spec.ring,
        borderRadius: spec.ring / 2,
        borderWidth: spec.border,
        borderColor: KhazainColors.navy800,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FigmaIcon name="MoreWhatsapp" size={spec.glyph} color={KhazainColors.navy800} />
    </View>
  );
}
