import * as React from 'react';
import { useParticipants } from '../hooks';

export const ParticipantAsideList = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const participants = useParticipants();

  const filteredParticipants = React.useMemo(() => {
    return participants.filter((p) => p.identity.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [participants, searchQuery]);

  return (
    <div className="lk-participant-aside-list">
      <div className="lk-participant-aside-list-header">
        <span className="lk-participant-aside-list-header-title">
          Attendees({participants.length})
        </span>
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
            <div className={`lk-participant-aside-list-list-item-avatar`}>
              {participant.identity}
            </div>
            <div className="lk-participant-aside-list-list-item-info">
              <div className="lk-participant-aside-list-list-item-info-name">
                {participant.identity}
              </div>
            </div>
            <div className="lk-participant-aside-list-list-item-controls">1 2</div>
          </div>
        ))}
      </div>
    </div>
  );
};
