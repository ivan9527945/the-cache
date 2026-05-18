import type { JSX } from 'react';
import ChatClient from './ChatClient';

export const metadata = {
  title: 'Posthumous',
};

export default function ChatPage(): JSX.Element {
  return <ChatClient />;
}
