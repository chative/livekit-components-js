import * as React from 'react';
import { useParticipants, useSortedParticipants, useTracks } from '../hooks';
import { useFeatureContext } from '../context';
import { Participant, RoomEvent, Track } from 'livekit-client';
import { TrackMutedIndicator } from './participant/TrackMutedIndicator';
import { CallClose } from '../assets/icons';

interface IProps {
  open: boolean;
  onClose: () => void;
}

export const ParticipantAsideList = (props: IProps) => {
  const { open, onClose } = props;

  const [searchQuery, setSearchQuery] = React.useState('');
  const participantsSource = useParticipants();
  const participants = useSortedParticipants(participantsSource);
  const features = useFeatureContext();
  const { renderParticipantPlaceholder, nameFormatter } = features!;

  const filteredParticipants = React.useMemo(() => {
    return participants.filter((p) =>
      (nameFormatter?.(p) ?? p.identity).toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [participants, searchQuery]);

  const [screenShareTrack] = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  if (!open) {
    return null;
  }

  return (
    <div className="lk-participant-aside-list">
      <div className="lk-participant-aside-list-header">
        <span className="lk-participant-aside-list-header-title">
          Attendees({participants.length})
        </span>
        <div className="lk-participant-aside-list-close-button" onClick={onClose}>
          <CallClose />
        </div>
      </div>

      <div className="lk-participant-aside-list-search">
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="lk-participant-aside-list-input"
        />
      </div>

      <div className="lk-participant-aside-list-list">
        {filteredParticipants.map((participant, index) => (
          <div key={index} className="lk-participant-aside-list-list-item">
            <div className="lk-participant-aside-list-list-item-info">
              <div className={`lk-participant-aside-list-list-item-avatar`}>
                {renderParticipantPlaceholder?.(participant, { size: 28 })}
              </div>
              <div className="lk-participant-aside-list-list-item-info-name">
                <span className="lk-participant-aside-list-list-item-info-name-text">
                  {nameFormatter ? nameFormatter(participant) : participant.identity}
                </span>
                <span className="lk-participant-aside-list-list-item-sharing">
                  {screenShareTrack?.participant?.identity === participant.identity
                    ? 'Sharing'
                    : ''}
                </span>
              </div>
            </div>

            <div className="lk-participant-aside-list-list-item-status">
              <div className="lk-participant-aside-list-list-item-status-audio">
                <TrackMutedIndicator
                  trackRef={{
                    participant,
                    source: Track.Source.Microphone,
                  }}
                  show={'always'}
                  singleColor={true}
                ></TrackMutedIndicator>
              </div>
              <div className="lk-participant-aside-list-list-item-status-video">
                <TrackMutedIndicator
                  trackRef={{
                    participant,
                    source: Track.Source.Camera,
                  }}
                  show={'always'}
                  singleColor={true}
                ></TrackMutedIndicator>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
