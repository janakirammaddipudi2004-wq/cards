import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { GamePhase } from '@shared/types/game';
import { SUIT_SYMBOLS } from '@shared/types/card';
import { TOTAL_ROUNDS } from '@shared/constants';
import { PlayerSeat } from './PlayerSeat';
import { CardHand } from './CardHand';
import { TrickArea } from './TrickArea';
import { BiddingPanel } from './BiddingPanel';
import { ScoreBoard } from './ScoreBoard';
import { RoundInfo } from './RoundInfo';
import { ChatPanel } from './ChatPanel';
import { GameOverModal } from './GameOverModal';
import { TrickCelebrationOverlay } from './TrickCelebrationOverlay';
import { RoundSummaryPanel } from './RoundSummaryPanel';

function getPlayerPositions(playerCount: number, myIndex: number) {
  const positions: Array<{ top?: string; left?: string }> = [];

  for (let i = 0; i < playerCount; i++) {
    const relativeIndex = (i - myIndex + playerCount) % playerCount;
    const angle = (relativeIndex / playerCount) * 360 + 90;
    const angleRad = (angle * Math.PI) / 180;
    const radiusX = 41;
    const radiusY = 36;

    positions.push({
      left: `${50 + radiusX * Math.cos(angleRad)}%`,
      top: `${50 + radiusY * Math.sin(angleRad)}%`,
    });
  }

  return positions;
}

export const GameTable: FC = () => {
  const {
    gameState,
    messages,
    standings,
    showGameOver,
    trickCelebration,
    roundSummary,
    setShowGameOver,
    setTrickCelebration,
    setRoundSummary,
    resetGame,
  } = useGameStore();
  const { playCard, placeBid, sendMessage, leaveRoom } = useSocket();
  const [collectedTrickKey, setCollectedTrickKey] = useState<string | null>(null);

  const myIndex = useMemo(() => {
    if (!gameState) return 0;
    return gameState.players.findIndex(p => p.id === gameState.myId);
  }, [gameState]);

  const positions = useMemo(() => {
    if (!gameState) return [];
    return getPlayerPositions(gameState.players.length, myIndex);
  }, [gameState, myIndex]);

  const playerNames = useMemo(() => {
    if (!gameState) return {};
    return Object.fromEntries(gameState.players.map(p => [p.id, p.name]));
  }, [gameState]);

  useEffect(() => {
    if (!gameState || !trickCelebration) return;
    const collectedKey = `${gameState.roundNumber}:${trickCelebration.trickNumber}`;
    const frameId = window.requestAnimationFrame(() => setCollectedTrickKey(collectedKey));
    const timeoutId = window.setTimeout(() => setTrickCelebration(null), 3200);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [gameState, setTrickCelebration, trickCelebration]);

  useEffect(() => {
    if (!roundSummary || trickCelebration) return;
    const timeoutId = window.setTimeout(() => setRoundSummary(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [roundSummary, setRoundSummary, trickCelebration]);

  if (!gameState) {
    return (
      <div className="game-table-container rummy-game-screen">
        <div className="game-loading-panel">Loading game...</div>
      </div>
    );
  }

  const currentTrick = gameState.currentRound?.currentTrick;
  const myPlayer = gameState.players.find(p => p.id === gameState.myId);
  const isMyTurn = myPlayer?.isTurn || false;
  const isPlaying = gameState.phase === GamePhase.PLAYING;
  const isBidding = gameState.phase === GamePhase.BIDDING;
  const trickNumber = currentTrick?.trickNumber || 0;
  const currentTrickKey = currentTrick ? `${gameState.roundNumber}:${currentTrick.trickNumber}` : null;
  const isCollectedTrick = Boolean(currentTrickKey && currentTrickKey === collectedTrickKey);
  const shouldShowTrickCards = Boolean(
    currentTrick?.playedCards.length && !trickCelebration && !isCollectedTrick
  );
  const dealer = gameState.players.find(player => player.isDealer);
  const leader = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore)[0];
  const leadSuitLabel = currentTrick?.leadSuit ? SUIT_SYMBOLS[currentTrick.leadSuit] : '-';
  const bidsPlaced = Object.keys(gameState.currentRound?.bids || {}).length;
  const celebrationWinnerPosition = trickCelebration
    ? positions[gameState.players.findIndex(player => player.id === trickCelebration.winnerId)] || { left: '50%', top: '50%' }
    : { left: '50%', top: '50%' };

  return (
    <div className="game-table-container rummy-game-screen">
      <header className="rummy-topbar">
        <div className="rummy-brand-block">
          <p className="eyebrow">Room {gameState.roomCode}</p>
          <h1>Trick Master</h1>
        </div>

        <RoundInfo
          roundNumber={gameState.roundNumber}
          totalRounds={TOTAL_ROUNDS}
          trickNumber={trickNumber}
          totalTricks={gameState.roundNumber}
          phase={gameState.phase}
        />

        <div className="rummy-topbar-stats">
          <div>
            <span>Dealer</span>
            <strong>{dealer?.name || '-'}</strong>
          </div>
          <div>
            <span>Leader</span>
            <strong>{leader?.name || '-'}</strong>
          </div>
          <button className="btn btn-secondary btn-sm leave-table-button" onClick={leaveRoom}>
            Leave
          </button>
        </div>
      </header>

      <main className="rummy-game-layout">
        <section className="rummy-table-shell">
          <div className="rummy-table-status">
            <div className={`turn-banner ${isMyTurn ? 'active' : ''}`}>
              {isMyTurn ? (isBidding ? 'Your bid' : 'Your card') : 'Table is thinking'}
            </div>
            <div className="rummy-table-pill">
              <span>Lead suit</span>
              <strong>{leadSuitLabel}</strong>
            </div>
            <div className="rummy-table-pill">
              <span>Bids</span>
              <strong>{bidsPlaced}/{gameState.players.length}</strong>
            </div>
          </div>

          <div className="round-table rummy-table">
            {gameState.players.map((player, index) => (
              <PlayerSeat
                key={player.id}
                player={player}
                position={positions[index] || {}}
                isMe={player.id === gameState.myId}
              />
            ))}

            <div className="table-center-mat">
              <div className="table-center-heading">
                <span>Trick {trickNumber || 1}</span>
                <strong>Round {gameState.roundNumber}</strong>
              </div>
              {shouldShowTrickCards && currentTrick ? (
                <TrickArea playedCards={currentTrick.playedCards} playerNames={playerNames} />
              ) : (
                <div className="table-center-state">
                  {trickCelebration && 'Collecting trick'}
                  {!trickCelebration && isCollectedTrick && gameState.phase !== GamePhase.ROUND_COMPLETE && 'Next trick'}
                  {isBidding && 'Bids are open'}
                  {!trickCelebration && !isCollectedTrick && isPlaying && 'Lead or follow'}
                  {!trickCelebration && gameState.phase === GamePhase.ROUND_COMPLETE && `Round ${gameState.roundNumber} complete`}
                  {!trickCelebration && gameState.phase === GamePhase.DEALING && 'Dealing'}
                </div>
              )}
            </div>

            <AnimatePresence>
              {trickCelebration && (
                <TrickCelebrationOverlay
                  key={`trick-${trickCelebration.trickNumber}-${trickCelebration.winningCard.id}`}
                  winnerName={trickCelebration.winnerName}
                  trickNumber={trickCelebration.trickNumber}
                  playedCards={trickCelebration.playedCards}
                  winningCard={trickCelebration.winningCard}
                  playerNames={playerNames}
                  winnerPosition={celebrationWinnerPosition}
                />
              )}
            </AnimatePresence>
          </div>

          {isBidding && (
            <BiddingPanel
              roundNumber={gameState.roundNumber}
              validBids={gameState.validBids}
              onPlaceBid={placeBid}
              isMyTurn={isMyTurn}
            />
          )}

          {gameState.myHand.length > 0 && (
            <div className="rummy-hand-panel">
              <div className="hand-panel-copy">
                <span>Your hand</span>
                <strong>{gameState.myHand.length} cards</strong>
              </div>
              <CardHand
                cards={gameState.myHand}
                validCardIds={isPlaying && isMyTurn ? gameState.validCards : []}
                onPlayCard={playCard}
                disabled={!isPlaying || !isMyTurn}
              />
            </div>
          )}
        </section>

        <aside className="rummy-side-dock">
          <AnimatePresence>
            {roundSummary && !trickCelebration && (
              <RoundSummaryPanel
                key={`round-summary-${roundSummary.roundNumber}`}
                roundNumber={roundSummary.roundNumber}
                scores={roundSummary.scores}
                players={gameState.players}
                myId={gameState.myId}
                onClose={() => setRoundSummary(null)}
              />
            )}
          </AnimatePresence>
          <ScoreBoard players={gameState.players} roundNumber={gameState.roundNumber} />
          <div className="rummy-round-ledger">
            <p className="eyebrow">Round ledger</p>
            {gameState.players.map(player => (
              <div key={player.id} className={player.id === gameState.myId ? 'ledger-row is-me' : 'ledger-row'}>
                <span>{player.name}</span>
                <strong>{player.bid ?? '-'} / {player.tricksWon}</strong>
              </div>
            ))}
          </div>
          <ChatPanel messages={messages} onSend={sendMessage} />
        </aside>
      </main>

      {showGameOver && standings && (
        <GameOverModal
          standings={standings}
          onPlayAgain={() => {
            setShowGameOver(false);
            resetGame();
          }}
          onBackToLobby={() => {
            setShowGameOver(false);
            resetGame();
          }}
        />
      )}
    </div>
  );
};
