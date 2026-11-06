import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Label, Txt } from '@/components/ui/Txt';
import {
  COMPANY_SIZES,
  DEPARTMENTS,
  INDUSTRIES,
  YEARS_EXPERIENCE,
} from '@/features/onboarding/steps';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type WorkCard = {
  label: string;
  hint: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
};

function GrowingField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const { c } = useTheme();
  const [height, setHeight] = useState(44);

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      multiline
      scrollEnabled={false}
      onContentSizeChange={(event) =>
        setHeight(Math.max(44, Math.ceil(event.nativeEvent.contentSize.height)))
      }
      style={{
        minHeight: 44,
        height,
        color: c.ink,
        fontFamily: fonts.body,
        fontSize: 17,
        lineHeight: 24,
        textAlignVertical: 'top',
      }}
    />
  );
}

/** Industry plus employer: one structured pick, one free line that grows as it wraps. */
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
    <View style={{ gap: 14 }}>
      <Select
        label="Industry"
        value={industry}
        placeholder="The market you work in"
        options={INDUSTRIES}
        onChange={onChangeIndustry}
      />

      <Card padding={16} style={{ gap: 10 }}>
        <Label>{workplace.label}</Label>
        <GrowingField
          value={workplace.value}
          onChange={workplace.onChange}
          placeholder={workplace.hint}
        />
      </Card>

      <Select
        label="Company size"
        value={companySize}
        placeholder="How big is the team"
        options={COMPANY_SIZES}
        optional
        onChange={onChangeCompanySize}
      />
    </View>
  );
}

/** Department plus title: classification first, then the words on their business card. */
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
    <View style={{ gap: 14 }}>
      <Select
        label="Department"
        value={department}
        placeholder="Engineering, design, marketing…"
        options={DEPARTMENTS}
        onChange={onChangeDepartment}
      />

      <Card padding={16} style={{ gap: 10 }}>
        <Label>{job.label}</Label>
        <GrowingField value={job.value} onChange={job.onChange} placeholder={job.hint} />
      </Card>

      <Select
        label="Years of experience"
        value={years}
        placeholder="How long you've been at it"
        options={YEARS_EXPERIENCE}
        optional
        onChange={onChangeYears}
      />
    </View>
  );
}
