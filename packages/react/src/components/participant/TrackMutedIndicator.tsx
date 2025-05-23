import * as React from 'react';
import { mergeProps } from '../../utils';
import { getSourceIcon } from '../../assets/icons/util';
import { useIsSpeaking, useTrackMutedIndicator } from '../../hooks';
import type { TrackReferenceOrPlaceholder } from '@cc-livekit/components-core';
import {
  MicDisabledMiniIcon,
  MicDisabledSingleColorIcon,
  SpeakingDotIcon,
} from '../../assets/icons';
import { Track } from 'livekit-client';

/** @public */
export interface TrackMutedIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  trackRef: TrackReferenceOrPlaceholder;
  show?: 'always' | 'muted' | 'unmuted';
  singleColor?: boolean;
  onShowChange?: (show: boolean) => void;
}

/**
 * The `TrackMutedIndicator` shows whether the participant's camera or microphone is muted or not.
 * By default, a muted/unmuted icon is displayed for a camera, microphone, and screen sharing track.
 *
 * @example
 * ```tsx
 * <TrackMutedIndicator trackRef={trackRef} />
 * ```
 * @public
 */
export const TrackMutedIndicator: (
  props: TrackMutedIndicatorProps & React.RefAttributes<HTMLDivElement>,
) => any = /* @__PURE__ */ React.forwardRef<HTMLDivElement, TrackMutedIndicatorProps>(
  function TrackMutedIndicator(
    { trackRef, show = 'always', singleColor, onShowChange, ...props }: TrackMutedIndicatorProps,
    ref,
  ) {
    const { className, isMuted } = useTrackMutedIndicator(trackRef);
    const isSpeaking = useIsSpeaking(trackRef.participant);

    const showIndicator =
      show === 'always' || (show === 'muted' && isMuted) || (show === 'unmuted' && !isMuted);

    const htmlProps = React.useMemo(
      () =>
        mergeProps(props, {
          className,
        }),
      [className, props],
    );

    React.useEffect(() => {
      onShowChange?.(showIndicator);
    }, [showIndicator]);

    if (!showIndicator) {
      return null;
    }

    return (
      <div ref={ref} {...htmlProps} data-lk-muted={isMuted} data-lk-speaking={isSpeaking}>
        {/* {props.children ?? getSourceIcon(trackRef.source, !isMuted)} */}
        {trackRef.source === Track.Source.Microphone ? (
          <ParticipantStatus isMuted={isMuted} isSpeaking={isSpeaking} singleColor={singleColor} />
        ) : (
          getSourceIcon(trackRef.source, !isMuted, singleColor)
        )}
      </div>
    );
  },
);

interface IParticipantStatusProps {
  isMuted: boolean;
  isSpeaking: boolean;
  singleColor?: boolean;
}

function ParticipantStatus(props: IParticipantStatusProps) {
  const { isSpeaking, isMuted, singleColor } = props;

  if (isMuted) {
    return singleColor ? <MicDisabledSingleColorIcon /> : <MicDisabledMiniIcon />;
  }
  if (isSpeaking) {
    return (
      <div className="lk-speaking-bars">
        <div className="lk-bar-item"></div>
        <div className="lk-bar-item"></div>
        <div className="lk-bar-item"></div>
      </div>
    );
  }
  return <SpeakingDotIcon height={14} width={14} />;
}
