import React, { useState } from 'react';
import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import type { PickedShot, ShotLayout } from '@/data/types';
import { MAX_SHOTS, pickShots } from '@/features/apps/pickShots';
import { ShotGrid } from '@/features/apps/ShotGrid';

export type MediaStepProps = {
  shots: PickedShot[];
  onChange: (shots: PickedShot[]) => void;
  /** Carousel orientation for every screenshot in this listing. */
  shotLayout: ShotLayout;
  onChangeShotLayout: (layout: ShotLayout) => void;
  onError: (message: string) => void;
};

/**
 * What the listing is carrying so far, which the bottom bar offers to continue
 * with: "4 screenshots, and 1 video". Videos are counted apart because a demo
 * video is the piece worth noticing.
 */
export function shotTally(shots: PickedShot[]): string {
  const videos = shots.filter((shot) => shot.kind === 'video').length;

  return (
    [
      [shots.length - videos, 'screenshot'],
      [videos, 'video'],
    ] as const
  )
    .filter(([count]) => count)
    .map(([count, noun]) => `${count} ${noun}${count === 1 ? '' : 's'}`)
    .join(', and ');
}

/** Up to ten shots in the orientation the owner picks. The first is the cover. */
export function MediaStep({
  shots,
  onChange,
  shotLayout,
  onChangeShotLayout,
  onError,
}: MediaStepProps) {
  const [picking, setPicking] = useState(false);

  const pick = async () => {
    if (picking || shots.length >= MAX_SHOTS) return;
    setPicking(true);

    const result = await pickShots(MAX_SHOTS - shots.length);
    setPicking(false);

    if ('error' in result) {
      onError(result.error);
      return;
    }
    if (result.shots.length) onChange([...shots, ...result.shots]);
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(
          [
            ['vertical', 'Vertical · phone'],
            ['horizontal', 'Horizontal · web'],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={shotLayout === value}
            onPress={() => onChangeShotLayout(value)}
          />
        ))}
      </View>

      <ShotGrid
        shots={shots}
        layout={shotLayout}
        max={MAX_SHOTS}
        busy={picking}
        onReorder={onChange}
        onRemove={(index) => onChange(shots.filter((_, at) => at !== index))}
        onAdd={() => void pick()}
      />
    </View>
  );
}
