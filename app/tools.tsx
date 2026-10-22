import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { OptionRow } from '@/components/ui/OptionRow';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { TOOL_CATEGORIES, useSponsoredTools, useVoteSponsoredTool } from '@/data/repo/tools';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const SORTS = [
  { id: 'rated', label: 'Highest rated' },
  { id: 'newest', label: 'Newest' },
] as const;

const UPVOTE = '#46D160';

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const remote = useSponsoredTools();
  const vote = useVoteSponsoredTool();
  const [mine, setMine] = useState<Record<string, -1 | 1 | 0>>({});
  const [sort, setSort] = useState<'rated' | 'newest'>('rated');
  const [sortOpen, setSortOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void AsyncStorage.getItem(`hey100.votes.${userId}`).then((raw) => {
      if (raw) setMine(JSON.parse(raw) as Record<string, -1 | 1 | 0>);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || !Object.keys(mine).length) return;
    void AsyncStorage.setItem(`hey100.votes.${userId}`, JSON.stringify(mine));
  }, [mine, userId]);

  const tools = useMemo(
    () =>
      remote
        .map((tool) => {
          const myVote = mine[tool.id] ?? mine[tool.name] ?? tool.myVote;
          if (myVote === tool.myVote) return tool;
          let score = tool.score;
          if (tool.myVote === 1) score -= 1;
          if (tool.myVote === -1) score += 1;
          if (myVote === 1) score += 1;
          if (myVote === -1) score -= 1;
          return { ...tool, myVote, score };
        })
        .filter((tool) => !category || tool.category === category)
        .sort((a, b) =>
          sort === 'newest'
            ? (b.createdAt || '').localeCompare(a.createdAt || '')
            : b.score - a.score || a.name.localeCompare(b.name),
        ),
    [category, mine, remote, sort],
  );

  const cast = (tool: (typeof tools)[number], direction: -1 | 1) => {
    const next: -1 | 1 | 0 = (mine[tool.id] ?? mine[tool.name] ?? tool.myVote) === direction ? 0 : direction;
    setMine((prev) => ({ ...prev, [tool.id]: next, [tool.name]: next }));
    if (!userId) {
      toast('Sign in to vote');
      return;
    }
    vote.mutate(
      { toolId: tool.id, vote: direction, name: tool.name },
      { onError: (error) => toast(error instanceof Error ? error.message : 'Vote did not save') },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={16} weight={500} style={{ flex: 1 }} numberOfLines={1}>
          Discover top tools
        </Txt>
        <Chip
          size="sm"
          label={SORTS.find((item) => item.id === sort)?.label ?? 'Highest rated'}
          onPress={() => setSortOpen(true)}
          right={<Ionicons name="chevron-down" size={12} color={c.muted} />}
        />
      </View>

      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)}>
        <View style={{ gap: 10 }}>
          <Txt font="mono" size={18} weight={500} style={{ marginBottom: 4 }}>
            Sort by
          </Txt>
          {SORTS.map((item) => (
            <OptionRow
              key={item.id}
              label={item.label}
              single
              selected={sort === item.id}
              onPress={() => {
                setSort(item.id);
                setSortOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable
            onPress={() => setCategory(null)}
            style={{
              height: 34,
              paddingHorizontal: 12,
              borderRadius: radii.pill,
              borderWidth: 1.5,
              borderColor: !category ? c.ink : c.line,
              backgroundColor: !category ? c.raised : c.surface,
              justifyContent: 'center',
            }}
          >
            <Txt size={12.5} weight={600}>
              All
            </Txt>
          </Pressable>
          {TOOL_CATEGORIES.map((value) => (
            <Pressable
              key={value}
              onPress={() => setCategory((prev) => (prev === value ? null : value))}
              style={{
                height: 34,
                paddingHorizontal: 12,
                borderRadius: radii.pill,
                borderWidth: 1.5,
                borderColor: category === value ? c.ink : c.line,
                backgroundColor: category === value ? c.raised : c.surface,
                justifyContent: 'center',
              }}
            >
              <Txt size={12.5} weight={600}>
                {value}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ gap: 10 }}>
          {tools.map((tool) => (
            <Card key={tool.id} padding={14} radius={radii.cardLg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'center', width: 44 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Upvote ${tool.name}`}
                    onPress={() => cast(tool, 1)}
                    hitSlop={8}
                    style={{ height: 36, width: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons
                      name={tool.myVote === 1 ? 'caret-up' : 'chevron-up'}
                      size={26}
                      color={tool.myVote === 1 ? UPVOTE : c.muted}
                    />
                  </Pressable>
                  <Txt
                    font="mono"
                    size={14}
                    weight={700}
                    color={
                      tool.myVote === 1 ? UPVOTE : tool.myVote === -1 ? c.danger : c.ink
                    }
                  >
                    {tool.score}
                  </Txt>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Downvote ${tool.name}`}
                    onPress={() => cast(tool, -1)}
                    hitSlop={8}
                    style={{ height: 36, width: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons
                      name={tool.myVote === -1 ? 'caret-down' : 'chevron-down'}
                      size={26}
                      color={tool.myVote === -1 ? c.danger : c.muted}
                    />
                  </Pressable>
                </View>

                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: c.raised,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tool.logoUrl ? (
                    <Image
                      source={{ uri: tool.logoUrl }}
                      style={{ width: 44, height: 44 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Txt size={16} weight={600}>
                      {tool.name.slice(0, 1)}
                    </Txt>
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={15} weight={600}>
                    {tool.name}
                  </Txt>
                  <Txt size={12.5} muted numberOfLines={2}>
                    {tool.subtitle}
                  </Txt>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/browser',
                      params: { kind: 'Web', value: tool.url },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${tool.name}`}
                  style={({ pressed }) => ({
                    height: 34,
                    paddingHorizontal: 12,
                    borderRadius: radii.pill,
                    borderWidth: 1.5,
                    borderColor: c.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Label size={11}>Open</Label>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
