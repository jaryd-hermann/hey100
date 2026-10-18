import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { IncomingHey } from '@/data/types';
import { FollowUpSheet } from '@/features/heys/FollowUpSheet';
import { HeysSwitcher, type HeysTab } from '@/features/heys/HeysSwitcher';
import { PassReasonSheet } from '@/features/heys/PassReasonSheet';
import { ReceivedHeyCard } from '@/features/heys/ReceivedHeyCard';
import { SentHeyCard } from '@/features/heys/SentHeyCard';
import { useTick } from '@/features/heys/time';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';

export default function HeysScreen() {
  const router = useRouter();
  const toast = useToast();
  const store = useStore();

  const [tab, setTab] = useState<HeysTab>('received');
  const [passing, setPassing] = useState<IncomingHey | null>(null);
  const [followUpId, setFollowUpId] = useState<string | null>(null);

  // Keeps the "unlocks in 19h" countdowns honest while the screen is open.
  useTick();

  const heyBack = async (heyId: string) => {
    const hey = store.heys.find((item) => item.id === heyId);
    const result = await store.heyBack(heyId);
    captureEvent('hey_back', { matched: result.matched });

    if (result.blocked) {
      if (result.blocked === 'match_limit') router.push('/paywall?reason=match5');
      else toast("That didn't go through. Try again.");
      return;
    }

    if (result.matched) {
      router.push({
        pathname: '/match',
        params: {
          appId: hey?.appId ?? '',
          viaAppId: hey?.viaAppId ?? store.primaryApp.id,
          matchId: result.matchId ?? '',
          paywall: result.hitPaywall ? '1' : '',
        },
      });
    }
  };

  const commitPass = (hey: IncomingHey, reason?: string) => {
    void store.passHey(hey.id, reason);
    captureEvent('hey_passed', { source: 'heys', reason: reason ?? null });
    toast(reason ? 'Passed. That tunes Discover.' : 'Passed, silently');
  };

  const startPass = (hey: IncomingHey) => {
    if (store.passFeedbackDismissed) {
      commitPass(hey);
      return;
    }
    setPassing(hey);
  };

  /** Dismissing the sheet must still pass, or the tap is silently lost. */
  const closePassSheet = (stopAsking: boolean, reason?: string) => {
    if (stopAsking) store.dismissPassFeedback();
    if (passing) commitPass(passing, reason);
    setPassing(null);
  };

  const followUpTarget = store.sentHeys.find((sent) => sent.id === followUpId);
  const followUpListing = followUpTarget ? store.listing(followUpTarget.appId) : undefined;
  const passingListing = passing ? store.listing(passing.appId) : undefined;

  return (
    <Screen title="Heys" headerRight={<HeysSwitcher value={tab} onChange={setTab} />}>
      {tab === 'received' ? (
        store.heys.length === 0 ? (
          <EmptyState
            title="No heys waiting."
            body="Say hey to a few apps in Discover. A note doubles your reply rate."
          />
        ) : (
          <View style={{ gap: 14 }}>
            {store.heys.map((hey) => {
              const listing = store.listing(hey.appId);
              if (!listing) return null;

              return (
                <ReceivedHeyCard
                  key={hey.id}
                  hey={hey}
                  listing={listing}
                  viaApp={store.apps[hey.viaAppId]}
                  onOpen={() =>
                    router.push({
                      pathname: '/hey/[id]',
                      params: { id: hey.id },
                    })
                  }
                  onPass={() => startPass(hey)}
                  onHeyBack={() => void heyBack(hey.id)}
                />
              );
            })}
          </View>
        )
      ) : store.sentHeys.length === 0 ? (
        <EmptyState
          title="No heys sent yet."
          body="Every hey you send from Discover shows up here, with where it got to."
        />
      ) : (
        <View style={{ gap: 14 }}>
          {store.sentHeys.map((sent) => {
            const listing = store.listing(sent.appId);
            if (!listing) return null;

            return (
              <SentHeyCard
                key={sent.id}
                sent={sent}
                listing={listing}
                viaApp={store.apps[sent.viaAppId]}
                onFollowUp={() => setFollowUpId(sent.id)}
                onOpenChat={() => {
                  const match = store.matches.find((item) => item.appId === sent.appId);
                  if (match) {
                    router.push({
                      pathname: '/chat/[id]',
                      params: { id: match.id },
                    });
                  } else {
                    router.push('/chat');
                  }
                }}
              />
            );
          })}
        </View>
      )}

      <PassReasonSheet
        visible={!!passing}
        appName={passingListing ? shortName(passingListing.name) : 'The builder'}
        onClose={(stopAsking) => closePassSheet(stopAsking)}
        onSubmit={(reason, stopAsking) => closePassSheet(stopAsking, reason)}
      />

      <FollowUpSheet
        visible={!!followUpTarget}
        appName={followUpListing ? shortName(followUpListing.name) : 'them'}
        originalNote={followUpTarget?.note ?? ''}
        onClose={() => setFollowUpId(null)}
        onSend={(note) => {
          if (followUpTarget) {
            void store.sendFollowUp(followUpTarget.id, note);
            captureEvent('hey_follow_up_sent', { appId: followUpTarget.appId });
            toast(
              `Follow-up sent to ${followUpListing ? shortName(followUpListing.name) : 'them'}`,
            );
          }
          setFollowUpId(null);
        }}
      />
    </Screen>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingTop: 80, alignItems: 'center', gap: 12 }}>
      <Txt font="mono" size={18} weight={500} center>
        {title}
      </Txt>
      <Txt size={15} lh={1.5} muted center style={{ maxWidth: 270 }}>
        {body}
      </Txt>
    </View>
  );
}
