import * as React from 'react';
import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';
import type {
  GridLayoutDefinition,
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from '@cc-livekit/components-core';
import {
  isTrackReference,
  isTrackReferencePinned,
  selectGridLayout,
} from '@cc-livekit/components-core';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { ParticipantName } from './ParticipantName';
import { TrackMutedIndicator } from './TrackMutedIndicator';
import {
  ParticipantContext,
  TrackRefContext,
  useEnsureTrackRef,
  useFeatureContext,
  useMaybeLayoutContext,
  useMaybeParticipantContext,
  useMaybeTrackRefContext,
} from '../../context';
import { FocusToggle } from '../controls/FocusToggle';
import { ParticipantPlaceholder } from '../../assets/images';
import { LockLockedIcon, ScreenShareIcon } from '../../assets/icons';
import { VideoTrack } from './VideoTrack';
import { AudioTrack } from './AudioTrack';
import { useParticipantTile } from '../../hooks';
import { PinchableBlock, PinchableBlockInstance } from '../layout/FocusLayout';
import { ZoomIn } from './ZoomIn';
import { ZoomReset } from './ZoomReset';
import { ZoomOut } from './ZoomOut';
import { useMemoizedFn } from 'ahooks';
// import { useIsEncrypted } from '../../hooks/useIsEncrypted';

/**
 * The `ParticipantContextIfNeeded` component only creates a `ParticipantContext`
 * if there is no `ParticipantContext` already.
 * @example
 * ```tsx
 * <ParticipantContextIfNeeded participant={trackReference.participant}>
 *  ...
 * </ParticipantContextIfNeeded>
 * ```
 * @public
 */
export function ParticipantContextIfNeeded(
  props: React.PropsWithChildren<{
    participant?: Participant;
  }>,
) {
  const hasContext = !!useMaybeParticipantContext();
  return props.participant && !hasContext ? (
    <ParticipantContext.Provider value={props.participant}>
      {props.children}
    </ParticipantContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/**
 * Only create a `TrackRefContext` if there is no `TrackRefContext` already.
 * @internal
 */
export function TrackRefContextIfNeeded(
  props: React.PropsWithChildren<{
    trackRef?: TrackReferenceOrPlaceholder;
  }>,
) {
  const hasContext = !!useMaybeTrackRefContext();
  return props.trackRef && !hasContext ? (
    <TrackRefContext.Provider value={props.trackRef}>{props.children}</TrackRefContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/** @public */
export interface ParticipantTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The track reference to display. */
  trackRef?: TrackReferenceOrPlaceholder;
  disableSpeakingIndicator?: boolean;

  onParticipantClick?: (event: ParticipantClickEvent) => void;
  participantCount?: number;
  index?: number;
  isFocus?: boolean;
}

/**
 * The `ParticipantTile` component is the base utility wrapper for displaying a visual representation of a participant.
 * This component can be used as a child of the `TrackLoop` component or by passing a track reference as property.
 *
 * @example Using the `ParticipantTile` component with a track reference:
 * ```tsx
 * <ParticipantTile trackRef={trackRef} />
 * ```
 * @example Using the `ParticipantTile` component as a child of the `TrackLoop` component:
 * ```tsx
 * <TrackLoop>
 *  <ParticipantTile />
 * </TrackLoop>
 * ```
 * @public
 */
export const ParticipantTile: (
  props: ParticipantTileProps & React.RefAttributes<HTMLDivElement>,
) => any = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ParticipantTileProps>(
  function ParticipantTile(
    {
      trackRef,
      children,
      onParticipantClick,
      disableSpeakingIndicator,
      participantCount,
      index,
      isFocus,
      ...htmlProps
    }: ParticipantTileProps,
    ref,
  ) {
    const trackReference = useEnsureTrackRef(trackRef);
    const featureFlags = useFeatureContext();

    const containerRef = React.useRef<HTMLDivElement>(null);
    const pinchableRef = React.useRef<PinchableBlockInstance>(null);

    React.useEffect(() => {
      if (trackReference.source === Track.Source.ScreenShare) {
        setTimeout(() => {
          const rect = containerRef.current?.getBoundingClientRect();
          console.warn('set screen share rect', rect, containerRef.current);
          pinchableRef.current?.initSize({ height: rect?.height, width: rect?.width });
        });
      }
    }, [trackReference.source]);

    const shouldShowScaleControl = React.useMemo(() => {
      return trackReference.source === Track.Source.ScreenShare && isFocus;
    }, [trackReference.source, isFocus]);

    const onZoomReset = useMemoizedFn(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      pinchableRef.current?.initSize({ height: rect?.height, width: rect?.width });
      pinchableRef.current?.zoomReset();
    });

    const { elementProps } = useParticipantTile<HTMLDivElement>({
      htmlProps,
      disableSpeakingIndicator,
      onParticipantClick,
      trackRef: trackReference,
    });
    // const isEncrypted = useIsEncrypted(trackReference.participant);
    const layoutContext = useMaybeLayoutContext();

    const autoManageSubscription = useFeatureContext()?.autoSubscription;

    const handleSubscribe = React.useCallback(
      (subscribed: boolean) => {
        if (
          trackReference.source &&
          !subscribed &&
          layoutContext &&
          layoutContext.pin.dispatch &&
          isTrackReferencePinned(trackReference, layoutContext.pin.state)
        ) {
          if (featureFlags?.type !== '1on1') {
            layoutContext.pin.dispatch({ msg: 'clear_pin' });
          }
        }
      },
      [trackReference, layoutContext, featureFlags?.type],
    );

    const layout = selectGridLayout([{} as GridLayoutDefinition], participantCount ?? 0);
    const gridColumn = layout?.gridColumns?.[index as number];
    const extraCount = React.useMemo(() => {
      if (!participantCount) return 0;
      return participantCount - 16 + 1;
    }, [participantCount]);

    const setRefs = React.useCallback(
      (node) => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(node);
          } else {
            ref.current = node;
          }
        }
        containerRef.current = node;
      },
      [ref],
    );

    if (index === 15 && participantCount && participantCount > 16) {
      return (
        <div
          style={{
            position: 'relative',
            gridColumn,
            background: 'var(--lk-bg2)',
            borderRadius: 'var(--lk-border-radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              height: 80,
              width: 80,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '50%',
              backgroundColor: '#494d56',
            }}
          >
            +{extraCount}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={setRefs}
        style={{
          position: 'relative',
          gridColumn,
          ...(trackReference.source === Track.Source.ScreenShare ? { overflow: 'auto' } : {}),
        }}
        {...elementProps}
        className={`${elementProps.className} ${isFocus && trackReference.source === Track.Source.ScreenShare ? 'is-focus-screen-share' : ''}`}
      >
        <TrackRefContextIfNeeded trackRef={trackReference}>
          <ParticipantContextIfNeeded participant={trackReference.participant}>
            {children ?? (
              <>
                {isTrackReference(trackReference) &&
                (trackReference.publication?.kind === 'video' ||
                  trackReference.source === Track.Source.Camera ||
                  trackReference.source === Track.Source.ScreenShare) ? (
                  trackReference.source === Track.Source.ScreenShare ? (
                    <PinchableBlock getContainer={() => containerRef.current} ref={pinchableRef}>
                      <VideoTrack
                        trackRef={trackReference}
                        onSubscriptionStatusChanged={handleSubscribe}
                        manageSubscription={autoManageSubscription}
                      />
                    </PinchableBlock>
                  ) : (
                    <VideoTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                      manageSubscription={autoManageSubscription}
                    />
                  )
                ) : (
                  isTrackReference(trackReference) && (
                    <AudioTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                    />
                  )
                )}
                <div className="lk-participant-placeholder">
                  {featureFlags?.renderParticipantPlaceholder?.(trackReference.participant) ?? (
                    <ParticipantPlaceholder />
                  )}
                </div>
                <div className="lk-participant-metadata">
                  <div className="lk-participant-metadata-item">
                    {trackReference.source === Track.Source.Camera ? (
                      <>
                        {/* {isEncrypted && <LockLockedIcon style={{ marginRight: '0.25rem' }} />} */}
                        <TrackMutedIndicator
                          trackRef={{
                            participant: trackReference.participant,
                            source: Track.Source.Microphone,
                          }}
                          show={'always'}
                        ></TrackMutedIndicator>
                        <ParticipantName />
                      </>
                    ) : (
                      <>
                        <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
                        <ParticipantName>&apos;s screen</ParticipantName>
                      </>
                    )}
                  </div>
                  {/* <ConnectionQualityIndicator className="lk-participant-metadata-item" /> */}
                </div>
              </>
            )}
            {/* <FocusToggle trackRef={trackReference} /> */}
          </ParticipantContextIfNeeded>
        </TrackRefContextIfNeeded>
        {shouldShowScaleControl && (
          <div
            style={{
              position: 'fixed',
              bottom: 111,
              left: 'calc(17% + 12px)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 4,
              borderRadius: 'calc(var(--lk-border-radius)/2)',
              backgroundColor: 'rgba(0,0,0,.5)',
            }}
          >
            <ZoomOut
              style={{ cursor: 'pointer' }}
              onClick={() => pinchableRef.current?.zoomOut()}
            />
            <ZoomReset style={{ cursor: 'pointer' }} onClick={onZoomReset} />
            <ZoomIn style={{ cursor: 'pointer' }} onClick={() => pinchableRef.current?.zoomIn()} />
          </div>
        )}
      </div>
    );
  },
);
