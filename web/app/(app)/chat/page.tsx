import { Suspense } from 'react';

import { Chat } from '@/components/app/Chat';

export const metadata = { title: 'Chat' };

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <Chat />
    </Suspense>
  );
}
