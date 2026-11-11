import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import {
  COMPANY_SIZES,
  DEPARTMENTS,
  INDUSTRIES,
  JOB_TITLES,
  canonicalJobTitle,
  matchJobTitles,
  YEARS_EXPERIENCE,
} from '@/features/onboarding/steps';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const INK = '#111111';
const MUTED = 'rgba(17,17,17,0.78)';

type WorkCard = {
  label: string;
  hint: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
};

function FieldHead({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Txt size={14} weight={700} color={INK}>
        {label}
      </Txt>
      {optional ? (
        <Txt font="mono" size={11} weight={600} color={INK} tracking={0.66}>
          OPTIONAL
        </Txt>
      ) : null}
    </View>
  );
}

function Offset({ children, radius }: { children: React.ReactNode; radius: number }) {
  return (
    <View style={{ marginBottom: 3 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 3,
          bottom: -3,
          borderRadius: radius,
          backgroundColor: INK,
        }}
      />
      {children}
    </View>
  );
}

function LineField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Offset radius={16}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(17,17,17,0.4)"
        style={{
          height: 54,
          paddingHorizontal: 16,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: INK,
          backgroundColor: '#FFFFFF',
          color: INK,
          fontFamily: fonts.bodyMedium,
          fontSize: 16,
        }}
      />
    </Offset>
  );
}

function includesMatch(options: string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  return options.filter((option) => option.toLowerCase().includes(needle));
}

function SelectField({
  value,
  placeholder,
  options,
  onChange,
  search,
  allowCustom,
  rank,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  /** Typing filters the list. An empty field shows `placeholder`. */
  search?: boolean;
  /** A typed title that is not already in the list can be saved as itself. */
  allowCustom?: boolean;
  rank?: (options: string[], query: string) => string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const typed = query.trim();
  const shown = search && typed ? (rank ?? includesMatch)(options, typed) : options;
  const known = allowCustom ? canonicalJobTitle(typed) : null;
  const custom = allowCustom && typed && !known ? typed : '';

  const choose = (option: string) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  const field = {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  };

  return (
    <View style={{ gap: 8 }}>
      <Offset radius={16}>
        {search ? (
          <View style={field}>
            <TextInput
              ref={inputRef}
              value={open ? query : value}
              onChangeText={(text) => {
                setQuery(text);
                setOpen(true);
              }}
              onFocus={() => {
                setQuery('');
                setOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setOpen(false);
                  setQuery('');
                }, 150);
              }}
              placeholder={placeholder}
              placeholderTextColor="rgba(17,17,17,0.4)"
              autoCorrect={false}
              style={{
                flex: 1,
                height: 50,
                color: INK,
                fontFamily: fonts.bodySemi,
                fontSize: 16,
              }}
            />
            <Pressable
              accessibilityLabel={open ? 'Close list' : 'Open list'}
              hitSlop={8}
              onPress={() => {
                setOpen((current) => !current);
                if (!open) inputRef.current?.focus();
              }}
            >
              <Txt size={13} color={INK}>
                {open ? '▲' : '▼'}
              </Txt>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={field}>
            <Txt size={16} weight={600} color={value ? INK : 'rgba(17,17,17,0.4)'} style={{ flex: 1 }} numberOfLines={1}>
              {value || placeholder}
            </Txt>
            <Txt size={13} color={INK}>
              {open ? '▲' : '▼'}
            </Txt>
          </Pressable>
        )}
      </Offset>
      {open ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 220, borderRadius: 16, borderWidth: 2, borderColor: INK, backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10 }}
        >
          {custom ? (
            <Pressable
              onPress={() => choose(custom)}
              style={{
                width: '100%',
                minHeight: 34,
                paddingHorizontal: 12,
                borderRadius: 17,
                borderWidth: 1.5,
                borderColor: INK,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight={700} color={INK}>
                Add “{custom}”
              </Txt>
            </Pressable>
          ) : null}
          {shown.length ? (
            shown.map((option) => {
              const selected = option === value;
              return (
                <Pressable
                  key={option}
                  onPress={() => choose(option)}
                  style={{
                    height: 34,
                    paddingHorizontal: 12,
                    borderRadius: 17,
                    borderWidth: 1.5,
                    borderColor: INK,
                    backgroundColor: selected ? INK : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={13} weight={600} color={selected ? '#FFFFFF' : INK}>
                    {option}
                  </Txt>
                </Pressable>
              );
            })
          ) : custom ? null : (
            <Txt size={14} color="rgba(17,17,17,0.55)" style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
              Nothing matches “{query.trim()}”.
            </Txt>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ChoiceChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { c } = useTheme();
  const dark = c.ink === '#FFFFFF';

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {options.map((option) => {
        const selected = option === value;
        const bg = selected ? (dark ? '#C6F24E' : INK) : '#FFFFFF';
        const fg = selected ? (dark ? INK : '#FFFFFF') : INK;
        return (
          <Pressable
            key={option}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(selected ? '' : option);
            }}
          >
            <View style={{ marginBottom: selected ? 0 : 3 }}>
              {selected ? null : (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 3,
                    bottom: -3,
                    borderRadius: 19,
                    backgroundColor: dark ? '#000000' : INK,
                  }}
                />
              )}
              <View
                style={{
                  height: 38,
                  paddingHorizontal: 14,
                  borderRadius: 19,
                  borderWidth: 2,
                  borderColor: INK,
                  backgroundColor: bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt size={13.5} weight={600} color={fg}>
                  {selected ? '✓ ' : ''}
                  {option}
                </Txt>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Industry, employer, and company size. */
export function WorkStep({
  industry,
  onChangeIndustry,
  companySize,
  onChangeCompanySize,
  workplace,
}: {
  industry: string;
  onChangeIndustry: (value: string) => void;
  companySize: string;
  onChangeCompanySize: (value: string) => void;
  workplace: WorkCard;
}) {
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <FieldHead label="Industry" />
        <Txt size={13} color={MUTED} style={{ marginTop: -4 }}>
          The market you work in
        </Txt>
        <SelectField
          value={industry}
          placeholder="Search industries"
          search
          options={INDUSTRIES}
          onChange={onChangeIndustry}
        />
      </View>

      <View style={{ gap: 8 }}>
        <FieldHead label={workplace.label} />
        <LineField value={workplace.value} onChange={workplace.onChange} placeholder={workplace.hint} />
      </View>

      <View style={{ gap: 8 }}>
        <FieldHead label="Company size" optional />
        <ChoiceChips options={COMPANY_SIZES} value={companySize} onChange={onChangeCompanySize} />
      </View>
    </View>
  );
}

/** Department, title, and years. */
export function RoleStep({
  department,
  onChangeDepartment,
  years,
  onChangeYears,
  job,
}: {
  department: string;
  onChangeDepartment: (value: string) => void;
  years: string;
  onChangeYears: (value: string) => void;
  job: WorkCard;
}) {
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <FieldHead label="Department" />
        <SelectField
          value={department}
          placeholder="Search departments"
          search
          options={DEPARTMENTS}
          onChange={onChangeDepartment}
        />
      </View>

      <View style={{ gap: 8 }}>
        <FieldHead label={job.label} />
        <Txt size={13} color={MUTED} style={{ marginTop: -4 }}>
          {job.hint}
        </Txt>
        <SelectField
          value={job.value}
          placeholder="Search roles"
          search
          allowCustom
          rank={matchJobTitles}
          options={JOB_TITLES}
          onChange={job.onChange}
        />
      </View>

      <View style={{ gap: 8 }}>
        <FieldHead label="Years of experience" optional />
        <ChoiceChips options={YEARS_EXPERIENCE} value={years} onChange={onChangeYears} />
      </View>
    </View>
  );
}
