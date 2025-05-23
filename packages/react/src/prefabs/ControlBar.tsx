import { Track } from 'livekit-client';
import * as React from 'react';
import { MediaDeviceMenu } from './MediaDeviceMenu';
import { DisconnectButton } from '../components/controls/DisconnectButton';
import { TrackToggle } from '../components/controls/TrackToggle';
import { ChatIcon, GearIcon, LeaveIcon, AddMemberIcon, MemberListIcon } from '../assets/icons';
import { ChatToggle } from '../components/controls/ChatToggle';
import {
  useLocalParticipantPermissions,
  useParticipants,
  usePersistentUserChoices,
} from '../hooks';
import { useMediaQuery } from '../hooks/internal';
import { useFeatureContext, useMaybeLayoutContext } from '../context';
import { supportsScreenSharing } from '@cc-livekit/components-core';
import { mergeProps } from '../utils';
import { StartMediaButton } from '../components/controls/StartMediaButton';
import { SettingsMenuToggle } from '../components/controls/SettingsMenuToggle';
import { AddMemberButton } from '../components/controls/AddMemberButton';
import { MemberListButton } from '../components/controls/MemberListButton';
import { MessageSender } from '../components/MessageSender';

/** @public */
export type ControlBarControls = {
  microphone?: boolean;
  camera?: boolean;
  chat?: boolean;
  screenShare?: boolean;
  leave?: boolean;
  settings?: boolean;
  addMember?: boolean;
  memberList?: boolean;
};

/** @public */
export interface ControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
  variation?: 'minimal' | 'verbose' | 'textOnly';
  controls?: ControlBarControls;
  /**
   * If `true`, the user's device choices will be persisted.
   * This will enable the user to have the same device choices when they rejoin the room.
   * @defaultValue true
   * @alpha
   */
  saveUserChoices?: boolean;
  onScreenShareClick?: (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onAddMember?: () => void;
  onMemberList?: () => void;
}

/**
 * The `ControlBar` prefab gives the user the basic user interface to control their
 * media devices (camera, microphone and screen share), open the `Chat` and leave the room.
 *
 * @remarks
 * This component is build with other LiveKit components like `TrackToggle`,
 * `DeviceSelectorButton`, `DisconnectButton` and `StartAudio`.
 *
 * @example
 * ```tsx
 * <LiveKitRoom>
 *   <ControlBar />
 * </LiveKitRoom>
 * ```
 * @public
 */
export function ControlBar({
  variation,
  controls,
  saveUserChoices = true,
  onDeviceError,
  onScreenShareClick,
  onAddMember,
  onMemberList,
  ...props
}: ControlBarProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const layoutContext = useMaybeLayoutContext();
  React.useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext?.widget.state?.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);
  const isTooLittleSpace = useMediaQuery(`(max-width: ${isChatOpen ? 1000 : 760}px)`);

  const defaultVariation = isTooLittleSpace ? 'minimal' : 'verbose';
  variation ??= defaultVariation;

  const visibleControls = { leave: true, ...controls };

  const localPermissions = useLocalParticipantPermissions();
  const participants = useParticipants();

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    visibleControls.camera ??= localPermissions.canPublish;
    visibleControls.microphone ??= localPermissions.canPublish;
    visibleControls.screenShare ??= localPermissions.canPublish;
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  const showIcon = React.useMemo(
    () => variation === 'minimal' || variation === 'verbose',
    [variation],
  );
  const showText = React.useMemo(
    () => variation === 'textOnly' || variation === 'verbose',
    [variation],
  );

  const browserSupportsScreenSharing = supportsScreenSharing();

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);

  const onScreenShareChange = React.useCallback(
    (enabled: boolean) => {
      setIsScreenShareEnabled(enabled);
    },
    [setIsScreenShareEnabled],
  );

  const htmlProps = mergeProps({ className: 'lk-control-bar' }, props);

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const microphoneOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveAudioInputEnabled(enabled) : null,
    [saveAudioInputEnabled],
  );

  const cameraOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveVideoInputEnabled(enabled) : null,
    [saveVideoInputEnabled],
  );

  const featureFlags = useFeatureContext();
  const onSendMessage = featureFlags?.onSendMessage || undefined;

  return (
    <div {...htmlProps}>
      {visibleControls.chat && <MessageSender onSendMessage={onSendMessage} />}
      <div className="lk-control-area">
        {visibleControls.microphone && (
          <div className="lk-button-group">
            <TrackToggle
              source={Track.Source.Microphone}
              showIcon={showIcon}
              onChange={microphoneOnChange}
              onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Microphone, error })}
            >
              {showText && 'Microphone'}
            </TrackToggle>
            <div className="lk-button-group-menu">
              <MediaDeviceMenu
                kind="audioinput"
                onActiveDeviceChange={(_kind, deviceId) => saveAudioInputDeviceId(deviceId ?? '')}
              />
            </div>
          </div>
        )}
        {visibleControls.camera && (
          <div className="lk-button-group">
            <TrackToggle
              source={Track.Source.Camera}
              showIcon={showIcon}
              onChange={cameraOnChange}
              onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Camera, error })}
            >
              {showText && 'Camera'}
            </TrackToggle>
            <div className="lk-button-group-menu">
              <MediaDeviceMenu
                kind="videoinput"
                onActiveDeviceChange={(_kind, deviceId) => saveVideoInputDeviceId(deviceId ?? '')}
              />
            </div>
          </div>
        )}
        {visibleControls.screenShare && browserSupportsScreenSharing && (
          <TrackToggle
            source={Track.Source.ScreenShare}
            captureOptions={{ audio: true, selfBrowserSurface: 'include' }}
            showIcon={showIcon}
            onChange={onScreenShareChange}
            onClick={onScreenShareClick}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.ScreenShare, error })}
          >
            {showText && (isScreenShareEnabled ? 'Stop screen share' : 'Share screen')}
          </TrackToggle>
        )}
        {/* {visibleControls.chat && (
        <ChatToggle>
          {showIcon && <ChatIcon />}
          {showText && 'Chat'}
        </ChatToggle>
      )} */}
        {visibleControls.settings && (
          <SettingsMenuToggle>
            {showIcon && <GearIcon />}
            {showText && 'Settings'}
          </SettingsMenuToggle>
        )}
        {visibleControls.addMember && (
          <AddMemberButton onClick={onAddMember}>
            {showIcon && <AddMemberIcon />}
            {showText && 'Add member'}
          </AddMemberButton>
        )}
        {visibleControls.memberList && (
          <MemberListButton onClick={onMemberList}>
            {showIcon && <MemberListIcon />}
            {showText && 'Member list'}
            <span style={{ fontSize: 14 }}>{participants.length}</span>
          </MemberListButton>
        )}
        {visibleControls.leave && (
          <DisconnectButton>
            {showIcon && <LeaveIcon />}
            {showText && 'Leave'}
          </DisconnectButton>
        )}
        <StartMediaButton />
      </div>
    </div>
  );
}
