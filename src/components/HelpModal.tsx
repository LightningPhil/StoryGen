import { useState } from 'react';
import { HELP_TOPICS, HELP_TOPIC_ORDER } from '../prompts/help_content';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [selectedTopic, setSelectedTopic] = useState(HELP_TOPIC_ORDER[0] || '');

  const topic = HELP_TOPICS[selectedTopic];

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-xl">
        <header className="modal-header">
          <h2>Help &amp; Documentation</h2>
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body modal-body-split help-modal-body">
          <nav className="modal-column modal-column-left help-topics-nav">
            <ul className="help-topics-list">
              {HELP_TOPIC_ORDER.map(topicKey => {
                const t = HELP_TOPICS[topicKey];
                if (!t) return null;
                return (
                  <li key={topicKey}>
                    <button
                      className={`help-topic-btn${topicKey === selectedTopic ? ' active' : ''}`}
                      onClick={() => setSelectedTopic(topicKey)}
                    >
                      {t.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <article className="modal-column modal-column-right help-content-area">
            {topic && (
              <div className="help-content-display" dangerouslySetInnerHTML={{ __html: topic.content }} />
            )}
          </article>
        </div>
        <footer className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
