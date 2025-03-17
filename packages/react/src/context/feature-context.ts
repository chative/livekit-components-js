import { Participant } from 'livekit-client';
import * as React from 'react';

/** @internal */
export interface FeatureFlags {
  autoSubscription?: boolean;
  nameFormatter?: (participant: Participant) => string;
  renderParticipantPlaceholder?: (
    participant: Participant | undefined,
    extraProps: Record<string, any>,
  ) => any;
  type?: '1on1' | 'instant' | 'group';
  onHangup?: () => void;
  contactMap?: {
    [key: string]: any;
  };
  onSendMessage?: (message: string) => void;
}

type FeatureContext<T extends boolean = false> = T extends true
  ? FeatureFlags
  : FeatureFlags | undefined;

/** @internal */
export const LKFeatureContext = React.createContext<FeatureFlags | undefined>(undefined);

/**
 * @internal
 */
export function useFeatureContext<T extends boolean>(require?: T): FeatureContext<T> {
  const ctx = React.useContext(LKFeatureContext) as FeatureContext<T>;
  if (require === true) {
    if (ctx) {
      return ctx;
    } else {
      throw Error('tried to access feature context, but none is present');
    }
  }
  return ctx;
}
