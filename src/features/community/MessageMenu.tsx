import React from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

import { REACTION_SET, REPORT_REASONS } from './seed';

export function MessageMenu({
  visible,
  onClose,
  onReply,
  onReact,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  onReply?: () => void;
  onReact: (emoji: string) => void;
  onReport: (reason: string) => void;
}) {
  const { c } = useTheme();
  const [reporting, setReporting] = React.useState(false);

  React.useEffect(() => {
    if (!visible) setReporting(false);
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 10 }}>
        {reporting ? (
          <>
            <Txt font="mono" size={20} weight={500}>
              Report
            </Txt>
            <Txt size={14} muted>
              The Hey100 team reviews every report. The admin isn't told who sent it.
            </Txt>
            {REPORT_REASONS.map((reason) => (
              <Row key={reason} label={reason} onPress={() => onReport(reason)} />
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {REACTION_SET.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => onReact(emoji)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c.raised,
                  }}
                >
                  <Txt size={20}>{emoji}</Txt>
                </Pressable>
              ))}
            </View>
            {onReply ? <Row label="Reply" onPress={onReply} /> : null}
            <Row label="Report" onPress={() => setReporting(true)} danger />
          </>
        )}
      </View>
    </Sheet>
  );
}

function Row({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: c.raised,
        paddingHorizontal: 16,
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Txt size={16} weight={500} color={danger ? c.danger : undefined}>
        {label}
      </Txt>
    </Pressable>
  );
}
