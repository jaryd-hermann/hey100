import React from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { n: string; text: string }[] };

export function CoachMarkdown({ text, size = 16 }: { text: string; size?: number }) {
  const blocks = toBlocks(text);
  if (!blocks.length) return null;

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} size={size} />
      ))}
    </View>
  );
}

function BlockView({ block, size }: { block: Block; size: number }) {
  const { c } = useTheme();

  if (block.type === 'h') {
    return (
      <Txt size={size + 1} weight={700} lh={1.3} style={{ marginTop: 4 }}>
        {block.text}
      </Txt>
    );
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return (
      <View style={{ gap: 7 }}>
        {block.type === 'ul'
          ? block.items.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 10, paddingLeft: 2 }}>
                <Txt size={size} style={{ width: 14, color: c.ink }}>
                  •
                </Txt>
                <View style={{ flex: 1 }}>
                  <Inline text={item} size={size} />
                </View>
              </View>
            ))
          : block.items.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 10, paddingLeft: 2 }}>
                <Txt font="mono" size={size - 1} weight={600} style={{ width: 22, marginTop: 1 }}>
                  {item.n}.
                </Txt>
                <View style={{ flex: 1 }}>
                  <Inline text={item.text} size={size} />
                </View>
              </View>
            ))}
      </View>
    );
  }

  return <Inline text={block.text} size={size} />;
}

function Inline({ text, size }: { text: string; size: number }) {
  return (
    <Txt size={size} lh={1.45}>
      {splitInline(text).map((part, index) => {
        if (part.kind === 'bold') {
          return (
            <Txt key={index} size={size} weight={700}>
              {part.value}
            </Txt>
          );
        }
        if (part.kind === 'italic') {
          return (
            <Txt key={index} size={size} style={{ fontStyle: 'italic' }}>
              {part.value}
            </Txt>
          );
        }
        if (part.kind === 'code') {
          return (
            <Txt key={index} size={size - 1} font="mono">
              {part.value}
            </Txt>
          );
        }
        return part.value;
      })}
    </Txt>
  );
}

function toBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'h', text: unwrap(heading[2]) });
      i += 1;
      continue;
    }

    if (isBoldHeading(line)) {
      blocks.push({ type: 'h', text: unwrap(line.trim()) });
      i += 1;
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: { n: string; text: string }[] = [];
      while (i < lines.length) {
        const match = /^\s*(\d+)\.\s+(.+)$/.exec(lines[i]);
        if (!match) break;
        items.push({ n: match[1], text: match[2] });
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const para = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }

  return blocks;
}

function startsBlock(line: string): boolean {
  return (
    /^(#{1,3})\s+/.test(line) ||
    isBoldHeading(line) ||
    /^\s*[-*•]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line)
  );
}

function isBoldHeading(line: string): boolean {
  const trimmed = line.trim();
  return /^\*\*[^*].*\*\*$/.test(trimmed) && (trimmed.match(/\*\*/g) ?? []).length === 2;
}

function unwrap(value: string): string {
  return value.replace(/^\*\*(.+)\*\*$/, '$1').replace(/^#+\s+/, '').trim();
}

function splitInline(text: string): { kind: 'text' | 'bold' | 'italic' | 'code'; value: string }[] {
  const parts: { kind: 'text' | 'bold' | 'italic' | 'code'; value: string }[] = [];
  const token = /\*\*([^*]+)\*\*|\*(?!\s)([^*]+?)\*(?!\*)|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text))) {
    if (match.index > last) parts.push({ kind: 'text', value: text.slice(last, match.index) });
    if (match[1] != null) parts.push({ kind: 'bold', value: match[1] });
    else if (match[2] != null) parts.push({ kind: 'italic', value: match[2] });
    else parts.push({ kind: 'code', value: match[3] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ kind: 'text', value: text }];
}
