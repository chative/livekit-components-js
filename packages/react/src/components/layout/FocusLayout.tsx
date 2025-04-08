import * as React from 'react';
import { mergeProps } from '../../utils';
import type { TrackReferenceOrPlaceholder } from '@cc-livekit/components-core';
import { ParticipantTile } from '../participant/ParticipantTile';
import type { ParticipantClickEvent } from '@cc-livekit/components-core';
import { useFeatureContext } from '../../context';
import { RoomEvent, Track } from 'livekit-client';
import { useSpeakingParticipants, useTracks } from '../../hooks';

import { animated } from '@react-spring/web';
import { createUseGesture, pinchAction } from '@use-gesture/react';
import { useMemoizedFn } from 'ahooks';
import { AsideControlOff, AsideControlOn } from '../../assets/icons';
import { createPortal } from 'react-dom';
import { TrackMutedIndicator } from '../participant/TrackMutedIndicator';
import { ParticipantName } from '../participant/ParticipantName';

/** @public */
export interface FocusLayoutContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * The `FocusLayoutContainer` is a layout component that expects two children:
 * A small side component: In a video conference, this is usually a carousel of participants
 * who are not in focus. And a larger main component to display the focused participant.
 * For example, with the `FocusLayout` component.
 *  @public
 */
export function FocusLayoutContainer(props: FocusLayoutContainerProps) {
  const featureFlags = useFeatureContext();
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
    updateOnlyOn: [RoomEvent.ActiveSpeakersChanged],
    onlySubscribed: false,
  });
  const isSharingScreen = tracks.some((track) => track.source === Track.Source.ScreenShare);
  const [showCarouselList, setShowCarouselList] = React.useState(false);
  const [currentSpeaker] = useSpeakingParticipants() ?? [];
  const [showParticipantName, setShowParticipantName] = React.useState(false);

  const elementProps = mergeProps(props, {
    className: `lk-focus-layout ${isSharingScreen && !showCarouselList ? 'lk-is-sharing-screen' : ''} ${!isSharingScreen && featureFlags?.type === '1on1' ? 'adapt-1on1-call lk-adapt-1on1-call' : ''}`,
  });

  return (
    <>
      {isSharingScreen ? (
        <div
          className="lk-aside-control"
          style={{
            position: 'fixed',
            top: '50%',
            right: showCarouselList ? 196 : 0,
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            zIndex: 2,
          }}
          onClick={() => setShowCarouselList((prev) => !prev)}
        >
          {showCarouselList ? <AsideControlOff /> : <AsideControlOn />}
        </div>
      ) : null}
      <div {...elementProps}>{props.children}</div>
      {isSharingScreen && currentSpeaker
        ? createPortal(
            <div
              className="lk-participant-metadata-item"
              style={{
                position: 'fixed',
                left: 12,
                top: 40,
                borderRadius: 4,
              }}
            >
              {/* {isEncrypted && <LockLockedIcon style={{ marginRight: '0.25rem' }} />} */}
              <TrackMutedIndicator
                trackRef={{
                  participant: currentSpeaker,
                  source: Track.Source.Microphone,
                }}
                show={'unmuted'}
                onShowChange={setShowParticipantName}
              ></TrackMutedIndicator>
              {showParticipantName && (
                <ParticipantName participant={currentSpeaker}></ParticipantName>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** @public */
export interface FocusLayoutProps extends React.HTMLAttributes<HTMLElement> {
  /** The track to display in the focus layout. */
  trackRef?: TrackReferenceOrPlaceholder;

  onParticipantClick?: (evt: ParticipantClickEvent) => void;
}

/**
 * The `FocusLayout` component is just a light wrapper around the `ParticipantTile` to display a single participant.
 * @public
 */
export function FocusLayout({ trackRef, ...htmlProps }: FocusLayoutProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pinchableRef = React.useRef<PinchableBlockInstance>(null);

  React.useEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    pinchableRef.current?.initSize({ height: rect?.height, width: rect?.width });
  }, []);

  return <ParticipantTile isFocus trackRef={trackRef} {...htmlProps} />;
}

export interface IPinchableBlockProps {
  minScale?: number;
  maxScale?: number;
  style?: React.CSSProperties;
  rotation?: number;
  [key: string]: any;
}

export interface PinchableBlockInstance {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  initSize: (size: any) => void;
}

const useGesture = createUseGesture([pinchAction]);

export const PinchableBlock = React.forwardRef<PinchableBlockInstance, IPinchableBlockProps>(
  (props, ref) => {
    const {
      minScale = 1,
      maxScale = 100,
      style: styleProps,
      getContainer = () => document.body,
      rotation = 0,
      ...extraProps
    } = props;

    const featureFlags = useFeatureContext();
    const [initSize, setInitSize] = React.useState({ height: 0, width: 0 });

    const imgRef = React.useRef<HTMLImageElement>(null);

    const [scale, setScale] = React.useState(1);

    let counterRef = React.useRef({
      plus: 0,
      minus: 0,
    });

    const onPinch = useMemoizedFn(({ event, trigger, memo }) => {
      const container = getContainer();

      let direction = event.deltaY < 0 ? 1 : -1;

      const imageBounds = imgRef.current!.getBoundingClientRect();

      // for keep scale rate after zoom in or zoom out
      const ratio = parseFloat((imageBounds.width / initSize.width).toFixed(2));

      let delta = parseFloat((0.05 * direction * ratio).toFixed(2));

      if (direction > 0) {
        counterRef.current.plus++;
      } else if (direction < 0) {
        counterRef.current.minus++;
      }

      if ((scale === maxScale && direction > 0) || (scale === minScale && direction < 0)) {
        return;
      }

      let nextScale = 0;
      let offset: number | undefined = undefined;

      setScale((prev) => {
        nextScale = parseFloat((prev + delta).toFixed(2));

        if (direction > 0 && nextScale > maxScale) {
          offset = maxScale - prev;
        }

        return Math.min(Math.max(nextScale, minScale), maxScale);
      });

      requestAnimationFrame(() => {
        // amend actual delta
        if (offset !== undefined) {
          delta = offset;
        }

        const xRate =
          trigger === 'command' ? 0.5 : (event.clientX + container.scrollLeft) / imageBounds.width;
        const yRate =
          trigger === 'command'
            ? 0.5
            : (event.clientY - 52 + container.scrollTop) / imageBounds.height;

        container.scrollLeft += initSize.width * delta * xRate;
        container.scrollTop += initSize.height * delta * yRate;
      });

      return memo;
    });

    useGesture(
      {
        onPinch,
      },
      {
        target: imgRef,
        pinch: {
          scaleBounds: { min: minScale, max: maxScale },
          rubberband: true,
        },
      },
    );

    React.useImperativeHandle(ref, () => ({
      zoomIn() {
        onPinch({
          event: { deltaY: -1 },
          trigger: 'command',
        });
      },
      zoomOut() {
        onPinch({
          event: { deltaY: 1 },
          trigger: 'command',
        });
      },
      zoomReset() {
        setScale(1);
      },
      initSize(size) {
        setInitSize(size);
      },
    }));

    React.useLayoutEffect(() => {
      const container = getContainer();
      if (!container || !imgRef.current || initSize.height === 0) return;

      const parentBounds = container.getBoundingClientRect();
      const imgBounds = imgRef.current.getBoundingClientRect();

      imgRef.current.style.marginTop = `${Math.max(
        0,
        (parentBounds.height - imgBounds.height) / 2,
      )}px`;
    }, [initSize, scale, imgRef.current]);

    React.useEffect(() => {
      featureFlags?.onPinWindowStatusChange?.(true);

      return () => {
        return featureFlags?.onPinWindowStatusChange?.(false);
      };
    }, []);

    return (
      <animated.div
        {...extraProps}
        ref={imgRef}
        style={{
          ...styleProps,
          height: initSize.height * scale,
          width: initSize.width * scale,
          margin: `0 auto`,
        }}
      >
        {props.children}
      </animated.div>
    );
  },
);
