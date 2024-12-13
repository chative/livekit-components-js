import { log, setupLiveKitRoom } from '@cc-livekit/components-core';
import {
  Room,
  MediaDeviceFailure,
  RoomEvent,
  ConnectionState,
  DisconnectReason,
} from 'livekit-client';
import * as React from 'react';
import type { HTMLAttributes } from 'react';

import type { LiveKitRoomProps } from '../components';
import { mergeProps } from '../mergeProps';
import { roomOptionsStringifyReplacer } from '../utils';

const defaultRoomProps: Partial<LiveKitRoomProps> = {
  connect: true,
  audio: false,
  video: false,
  prepareConnection: true,
};

/**
 * The `useLiveKitRoom` hook is used to implement the `LiveKitRoom` or your custom implementation of it.
 * It returns a `Room` instance and HTML props that should be applied to the root element of the component.
 *
 * @example
 * ```tsx
 * const { room, htmlProps } = useLiveKitRoom();
 * return <div {...htmlProps}>...</div>;
 * ```
 * @public
 */
export function useLiveKitRoom<T extends HTMLElement>(
  props: LiveKitRoomProps,
): {
  room: Room | undefined;
  htmlProps: HTMLAttributes<T>;
} {
  const {
    token,
    serverUrl,
    options,
    room: passedRoom,
    connectOptions,
    connect,
    audio,
    video,
    screen,
    onConnected,
    onDisconnected,
    onError,
    onMediaDeviceFailure,
    onEncryptionError,
    simulateParticipants,
    prepareConnection,
    ...rest
  } = { ...defaultRoomProps, ...props };
  if (options && passedRoom) {
    log.warn(
      'when using a manually created room, the options object will be ignored. set the desired options directly when creating the room instead.',
    );
  }

  const [room, setRoom] = React.useState<Room | undefined>();

  React.useEffect(() => {
    setRoom(passedRoom ?? new Room(options));
  }, [passedRoom, JSON.stringify(options, roomOptionsStringifyReplacer)]);

  const prewarm = React.useMemo(() => {
    if (room && serverUrl && prepareConnection && token) {
      return room.prepareConnection(serverUrl, token);
    }
    return new Promise<void>((resolve) => resolve(undefined));
  }, [serverUrl, prepareConnection, token, room]);

  const htmlProps = React.useMemo(() => {
    const { className } = setupLiveKitRoom();
    return mergeProps(rest, { className }) as HTMLAttributes<T>;
  }, [rest]);

  React.useEffect(() => {
    if (!room) return;
    const onSignalConnected = () => {
      const localP = room.localParticipant;

      log.debug('trying to publish local tracks');
      Promise.all([
        localP.setMicrophoneEnabled(!!audio, typeof audio !== 'boolean' ? audio : undefined),
        localP.setCameraEnabled(!!video, typeof video !== 'boolean' ? video : undefined),
        localP.setScreenShareEnabled(!!screen, typeof screen !== 'boolean' ? screen : undefined),
      ]).catch((e) => {
        log.warn(e);
        onError?.(e as Error);
      });
    };

    const handleMediaDeviceError = (e: Error) => {
      const mediaDeviceFailure = MediaDeviceFailure.getFailure(e);
      onMediaDeviceFailure?.(mediaDeviceFailure);
    };
    const handleEncryptionError = (e: Error) => {
      onEncryptionError?.(e);
    };
    const handleDisconnected = (reason?: DisconnectReason) => {
      onDisconnected?.(reason);
    };
    const handleConnected = () => {
      onConnected?.();
    };

    room
      .on(RoomEvent.SignalConnected, onSignalConnected)
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
      .on(RoomEvent.EncryptionError, handleEncryptionError)
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.Connected, handleConnected);

    return () => {
      room
        .off(RoomEvent.SignalConnected, onSignalConnected)
        .off(RoomEvent.MediaDevicesError, handleMediaDeviceError)
        .off(RoomEvent.EncryptionError, handleEncryptionError)
        .off(RoomEvent.Disconnected, handleDisconnected)
        .off(RoomEvent.Connected, handleConnected);
    };
  }, [
    room,
    audio,
    video,
    screen,
    onError,
    onEncryptionError,
    onMediaDeviceFailure,
    onConnected,
    onDisconnected,
  ]);

  React.useEffect(() => {
    if (!room) return;

    if (simulateParticipants) {
      room.simulateParticipants({
        participants: {
          count: simulateParticipants,
        },
        publish: {
          audio: true,
          useRealTracks: true,
        },
      });
      return;
    }
    if (!token) {
      log.debug('no token yet');
      return;
    }
    if (!serverUrl) {
      log.warn('no livekit url provided');
      onError?.(Error('no livekit url provided'));
      return;
    }
    if (connect) {
      log.debug('connecting');
      prewarm.then(() =>
        room.connect(serverUrl, token, connectOptions).catch((e) => {
          log.warn(e);
          onError?.(e as Error);
        }),
      );
    } else {
      log.debug('disconnecting because connect is false');
      room.disconnect();
    }
  }, [
    connect,
    token,
    JSON.stringify(connectOptions),
    room,
    onError,
    serverUrl,
    simulateParticipants,
  ]);

  React.useEffect(() => {
    if (!room) return;
    return () => {
      log.info('disconnecting on onmount');
      room.disconnect();
    };
  }, [room]);

  return { room, htmlProps };
}
