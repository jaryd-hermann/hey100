import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { Match, TradeStatus } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type TradeCardProps = {
  match: Match;
  theirAppName: string;
  myAppName: string;
  theirFirstName: string;
  /** Code they set for you, if any. */
  theirCode: string;
  /** Code you set for them, if any — shown so both sides see it. */
  myCode: string;
  /** Default URL for the share sheet, your listing link. */
  myDefaultUrl: string;
  onOpenLink: () => void;
  onSendFeedback: () => void;
  /** Opens the builder's private group for this listing, when they have one. */
  onJoinGroup?: () => void;
  joinedGroup?: boolean;
  onCopyCode: () => void;
  onTryingChange: (trying: boolean) => void;
  onSaveShare: (url: string, code: string) => void;
};

export function tryingLabel(status: TradeStatus): string {
  if (status === 'Feedback sent') return 'Feedback sent';
  if (status === 'Using') return 'Trying it';
  return "Haven't tried it yet";
}

function theirTryingLabel(status: TradeStatus): string {
  if (status === 'Feedback sent') return 'Feedback sent';
  if (status === 'Using') return 'Trying it';
  return "Hasn't tried it";
}

/**
 * Pinned at the top of a match but not sticky: it scrolls away with the
 * messages so the conversation gets the room.
 */
export function TradeCard({
  match,
  theirAppName,
  myAppName,
  theirFirstName,
  theirCode,
  myCode,
  myDefaultUrl,
  onOpenLink,
  onSendFeedback,
  onJoinGroup,
  joinedGroup,
  onCopyCode,
  onTryingChange,
  onSaveShare,
}: TradeCardProps) {
  const { c } = useTheme();
  const [mineOpen, setMineOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(match.myShareUrl || myDefaultUrl);
  const [shareCode, setShareCode] = useState(match.myShareCode ?? '');
  const mineLocked = match.mine === 'Feedback sent';

  useEffect(() => {
    if (shareOpen) {
      setShareUrl(match.myShareUrl || myDefaultUrl);
      setShareCode(match.myShareCode ?? '');
    }
  }, [match.myShareCode, match.myShareUrl, myDefaultUrl, shareOpen]);

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14, marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Label size={10}>{shortName(theirAppName)}</Label>
          {mineLocked ? (
            <View
              style={{
                minHeight: 44,
                borderRadius: radii.input,
                borderWidth: 1.5,
                borderColor: c.line,
                backgroundColor: c.surface,
                paddingHorizontal: 12,
                justifyContent: 'center',
              }}
            >
              <Txt size={13.5} weight={600}>
                {tryingLabel(match.mine)}
              </Txt>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Your status, ${tryingLabel(match.mine)}`}
              onPress={() => setMineOpen(true)}
              style={{
                minHeight: 44,
                borderRadius: radii.input,
                borderWidth: 1.5,
                borderColor: c.line,
                backgroundColor: c.surface,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Txt size={13.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>
                {tryingLabel(match.mine)}
              </Txt>
              <Ionicons name="chevron-down" size={16} color={c.muted} />
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Label size={10}>They use {shortName(myAppName)}</Label>
          <View
            style={{
              minHeight: 44,
              borderRadius: radii.input,
              borderWidth: 1.5,
              borderColor: c.line,
              backgroundColor: c.surface,
              paddingHorizontal: 12,
              justifyContent: 'center',
            }}
          >
            <Txt size={13.5} weight={600} numberOfLines={1}>
              {theirTryingLabel(match.theirs)}
            </Txt>
          </View>
        </View>
      </View>

      {theirCode ? (
        <CodeRow
          label={`${theirFirstName} gave you this code:`}
          code={theirCode}
          onCopy={onCopyCode}
        />
      ) : null}
      {myCode ? <CodeRow label="Your code:" code={myCode} onCopy={onCopyCode} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Give links and codes to ${theirFirstName}`}
        onPress={() => setShareOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="link-outline" size={15} color={c.accentText} />
        <Txt size={13.5} weight={600} color={c.accentText}>
          Give links/codes to {theirFirstName}
        </Txt>
      </Pressable>

      <Btn
        label={`Check out ${shortName(theirAppName)}`}
        variant="accent"
        full
        onPress={onOpenLink}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Btn
            label="Send feedback"
            variant="surface"
            full
            dim={match.mine === 'Feedback sent'}
            onPress={onSendFeedback}
          />
        </View>
        {onJoinGroup ? (
          <View style={{ flex: 1 }}>
            <Btn
              label={joinedGroup ? 'Open group' : 'Join app group'}
              variant="surface"
              full
              onPress={onJoinGroup}
            />
          </View>
        ) : null}
      </View>

      <Sheet visible={mineOpen && !mineLocked} onClose={() => setMineOpen(false)}>
        <View style={{ gap: 10, paddingBottom: 8 }}>
          <Txt size={18} weight={600}>
            Your try
          </Txt>
          {(["Haven't tried it yet", 'Trying it'] as const).map((option) => {
            const selected =
              (option === 'Trying it' && match.mine !== 'Not started') ||
              (option === "Haven't tried it yet" && match.mine === 'Not started');
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setMineOpen(false);
                  onTryingChange(option === 'Trying it');
                }}
                style={{
                  minHeight: 52,
                  paddingHorizontal: 15,
                  borderRadius: radii.option,
                  borderWidth: 1.5,
                  borderColor: selected ? c.accentText : c.line,
                  backgroundColor: c.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Txt size={15} weight={selected ? 600 : 500} style={{ flex: 1 }}>
                  {option}
                </Txt>
                {selected ? <Ionicons name="checkmark" size={18} color={c.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={shareOpen} onClose={() => setShareOpen(false)}>
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <Txt size={18} weight={600}>
            Give links/codes to {theirFirstName}
          </Txt>
          <Txt size={14} muted lh={1.45}>
            The URL and code they see in this chat. Defaults to your product link.
          </Txt>
          <Field
            label="URL"
            value={shareUrl}
            onChangeText={setShareUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={myDefaultUrl || 'https://'}
          />
          <Field
            label="Code"
            value={shareCode}
            onChangeText={setShareCode}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Optional"
            max={80}
          />
          <Btn
            label="Save"
            variant="accent"
            full
            onPress={() => {
              onSaveShare(shareUrl, shareCode);
              setShareOpen(false);
            }}
          />
        </View>
      </Sheet>
    </Card>
  );
}

function CodeRow({ label, code, onCopy }: { label: string; code: string; onCopy: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        void Clipboard.setStringAsync(code);
        onCopy();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
      }}
    >
      <Txt size={13.5} style={{ flex: 1 }} numberOfLines={2}>
        {label}{' '}
        <Txt font="mono" size={13} weight={600}>
          {code}
        </Txt>
      </Txt>
      <Ionicons name="copy-outline" size={16} color={c.muted} />
    </Pressable>
  );
}
