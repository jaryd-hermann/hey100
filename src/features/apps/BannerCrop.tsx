import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { Image, PanResponder, useWindowDimensions, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

import { BANNER_HEIGHT, BANNER_RATIO, BANNER_WIDTH } from './pickBanner';

export function BannerCrop({
  uri,
  onDone,
  onCancel,
}: {
  uri: string;
  onDone: (cropped: string) => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const { width: windowW } = useWindowDimensions();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const fallbackW = Math.max(1, windowW - layout.gutter * 2);
  const [box, setBox] = useState({ w: fallbackW, h: fallbackW / BANNER_RATIO });
  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [busy, setBusy] = useState(false);
  const live = useRef({
    zoom: 1,
    tx: 0,
    ty: 0,
    cover: 1,
    box: { w: 0, h: 0 },
    natural: null as { w: number; h: number } | null,
  });
  const drag = useRef({ x: 0, y: 0, tx: 0, ty: 0, dist: 0, zoom: 1 });

  useEffect(() => {
    Image.getSize(uri, (w, h) => setNatural({ w, h }), () => setNatural({ w: 1, h: 1 }));
  }, [uri]);

  const cover = natural && box.w ? Math.max(box.w / natural.w, box.h / natural.h) : 1;
  const scale = cover * zoom;
  const drawW = (natural?.w ?? 1) * scale;
  const drawH = (natural?.h ?? 1) * scale;

  live.current = { zoom, tx, ty, cover, box, natural };

  const clamp = (nextX: number, nextY: number, nextZoom: number) => {
    const state = live.current;
    if (!state.natural || !state.box.w) return { x: nextX, y: nextY, zoom: nextZoom };
    const nextScale = state.cover * nextZoom;
    const maxX = Math.max(0, (state.natural.w * nextScale - state.box.w) / 2);
    const maxY = Math.max(0, (state.natural.h * nextScale - state.box.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
      zoom: nextZoom,
    };
  };

  const apply = (nextX: number, nextY: number, nextZoom: number) => {
    const next = clamp(nextX, nextY, nextZoom);
    live.current.tx = next.x;
    live.current.ty = next.y;
    live.current.zoom = next.zoom;
    setTx(next.x);
    setTy(next.y);
    setZoom(next.zoom);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;
        drag.current.tx = live.current.tx;
        drag.current.ty = live.current.ty;
        drag.current.zoom = live.current.zoom;
        if (touches.length > 1) {
          const [a, b] = touches;
          drag.current.dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        } else {
          drag.current.x = event.nativeEvent.pageX;
          drag.current.y = event.nativeEvent.pageY;
        }
      },
      onPanResponderMove: (event) => {
        const touches = event.nativeEvent.touches;
        if (touches.length > 1) {
          const [a, b] = touches;
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const nextZoom = Math.min(4, Math.max(1, drag.current.zoom * (dist / (drag.current.dist || dist))));
          apply(live.current.tx, live.current.ty, nextZoom);
          return;
        }
        apply(
          drag.current.tx + event.nativeEvent.pageX - drag.current.x,
          drag.current.ty + event.nativeEvent.pageY - drag.current.y,
          live.current.zoom,
        );
      },
    }),
  ).current;

  const crop = async () => {
    const state = live.current;
    if (!state.natural || !state.box.w || busy) return;
    const region = visibleCrop(state);
    if (!region) {
      toast('Could not read that crop. Try again.');
      return;
    }

    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: region }, { resize: { width: BANNER_WIDTH, height: BANNER_HEIGHT } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone(result.uri);
    } catch {
      try {
        const fallback = await ImageManipulator.manipulateAsync(uri, [{ crop: region }], {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        onDone(fallback.uri);
      } catch {
        toast('Could not crop that photo. Try another one.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt size={13.5} lh={1.45} color="rgba(255,255,255,0.7)">
        Drag to reposition, pinch to zoom. The frame is the 3:1 banner on your listing.
      </Txt>

      <View
        onLayout={(event) => {
          const w = event.nativeEvent.layout.width;
          setBox({ w, h: w / BANNER_RATIO });
        }}
        style={{
          width: '100%',
          aspectRatio: BANNER_RATIO,
          borderRadius: radii.cardLg,
          overflow: 'hidden',
          backgroundColor: c.raised,
        }}
        {...responder.panHandlers}
      >
        {natural ? (
          <Image
            source={{ uri }}
            style={{
              position: 'absolute',
              width: drawW,
              height: drawH,
              left: (box.w - drawW) / 2 + tx,
              top: (box.h - drawH) / 2 + ty,
            }}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Cancel" variant="surface" size="md" onPress={onCancel} style={{ flex: 1 }} />
        <Btn
          label={busy ? 'Cropping…' : 'Use this crop'}
          variant="accent"
          size="md"
          onPress={() => void crop()}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

/** The pixels inside the 3:1 window, from the live pan/zoom — not the last render. */
function visibleCrop(state: {
  zoom: number;
  tx: number;
  ty: number;
  cover: number;
  box: { w: number; h: number };
  natural: { w: number; h: number } | null;
}): { originX: number; originY: number; width: number; height: number } | null {
  const { natural, box, cover, zoom, tx, ty } = state;
  if (!natural || !box.w) return null;

  const scale = cover * zoom;
  if (scale <= 0) return null;

  const left = (box.w - natural.w * scale) / 2 + tx;
  const top = (box.h - natural.h * scale) / 2 + ty;
  let originX = Math.round(-left / scale);
  let originY = Math.round(-top / scale);
  let width = Math.round(box.w / scale);
  let height = Math.round(box.h / scale);

  if (originX < 0) {
    width += originX;
    originX = 0;
  }
  if (originY < 0) {
    height += originY;
    originY = 0;
  }
  width = Math.min(width, natural.w - originX);
  height = Math.min(height, natural.h - originY);

  if (width < 2 || height < 2) return null;
  return { originX, originY, width, height };
}
