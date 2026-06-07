import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface BiddingPanelProps {
  roundNumber: number;
  validBids: number[];
  onPlaceBid: (bid: number) => void;
  isMyTurn: boolean;
}

export const BiddingPanel: React.FC<BiddingPanelProps> = ({
  roundNumber, validBids, onPlaceBid, isMyTurn,
}) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  if (!isMyTurn) {
    return (
      <motion.div
        className="bidding-panel glass-strong bid-panel-waiting"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bidding-title">Waiting for other players to bid...</div>
      </motion.div>
    );
  }

  const allBids = Array.from({ length: roundNumber + 1 }, (_, i) => i);

  return (
    <motion.div
      className="bidding-panel glass-strong bid-panel-active"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bidding-title">
        How many tricks will you win? (Round {roundNumber})
      </div>

      <div className="bid-options">
        {allBids.map((bid) => {
          const isValid = validBids.includes(bid);
          return (
            <button
              key={bid}
              className={`bid-btn ${selectedBid === bid ? 'selected' : ''}`}
              disabled={!isValid}
              onClick={() => setSelectedBid(bid)}
              title={!isValid ? 'This bid is restricted (would make total equal round number)' : `Bid ${bid}`}
              aria-label={`Bid ${bid}${!isValid ? ' - restricted' : ''}`}
            >
              {bid}
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-primary btn-lg"
        disabled={selectedBid === null}
        onClick={() => {
          if (selectedBid !== null) onPlaceBid(selectedBid);
        }}
        style={{ width: '100%' }}
      >
        Confirm Bid {selectedBid !== null ? `(${selectedBid})` : ''}
      </button>
    </motion.div>
  );
};
