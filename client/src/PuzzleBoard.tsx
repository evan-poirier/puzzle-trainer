import { useState, useCallback, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import type { PieceDropHandlerArgs } from "react-chessboard";

interface Puzzle {
  id: number;
  puzzleId: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string;
}

type PuzzleStatus = "start" | "loading" | "playing" | "correct" | "wrong" | "review";

async function fetchPuzzle(): Promise<Puzzle | null> {
  const res = await fetch("/api/puzzle/random");
  if (res.status === 401) return null;
  return res.json();
}

interface PuzzleBoardProps {
  onAuthError: () => void;
}

export default function PuzzleBoard({ onAuthError }: PuzzleBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("start");
  const [reported, setReported] = useState(false);
  const [lastResult, setLastResult] = useState<{ puzzle: Puzzle; correct: boolean } | null>(null);
  const prefetchedRef = useRef<Promise<Puzzle | null> | null>(null);
  const boardOrientation = game.turn() === "w" ? "white" : "black";

  function prefetchNext() {
    prefetchedRef.current = fetchPuzzle();
  }

  function startPuzzle(data: Puzzle) {
    setPuzzle(data);
    const moves = data.moves.split(" ");
    setSolutionMoves(moves);

    const chess = new Chess(data.fen);
    const setupMove = moves[0];
    chess.move({
      from: setupMove.substring(0, 2) as Square,
      to: setupMove.substring(2, 4) as Square,
      promotion: setupMove.length > 4 ? setupMove[4] : undefined,
    });

    setGame(chess);
    setMoveIndex(1);
    setStatus("playing");
    setReported(false);
  }

  const loadPuzzle = useCallback(async () => {
    setStatus("loading");

    // Use prefetched puzzle if available, otherwise fetch fresh
    const pending = prefetchedRef.current;
    prefetchedRef.current = null;
    const data = pending ? await pending : await fetchPuzzle();

    if (!data) {
      onAuthError();
      return;
    }

    startPuzzle(data);
    prefetchNext();
  }, [onAuthError]);

  function reportResult(correct: boolean) {
    if (reported || !puzzle) return;
    setReported(true);
    fetch("/api/puzzle/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId: puzzle.puzzleId, correct }),
    });
  }

  function makeOpponentMove(chess: Chess, moves: string[], nextIndex: number) {
    const opponentUci = moves[nextIndex];
    if (!opponentUci) return;

    setTimeout(() => {
      chess.move({
        from: opponentUci.substring(0, 2) as Square,
        to: opponentUci.substring(2, 4) as Square,
        promotion: opponentUci.length > 4 ? opponentUci[4] : undefined,
      });
      setGame(new Chess(chess.fen()));
      setMoveIndex(nextIndex + 1);
    }, 300);
  }

  function onPieceDrop({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean {
    if (status !== "playing" || !targetSquare) return false;
    if (sourceSquare === targetSquare) return false;

    const expectedUci = solutionMoves[moveIndex];
    const expectedFrom = expectedUci.substring(0, 2);
    const expectedTo = expectedUci.substring(2, 4);
    const expectedPromotion = expectedUci.length > 4 ? expectedUci[4] : undefined;

    const chess = new Chess(game.fen());
    const move = chess.move({
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: expectedPromotion,
    });
    if (!move) return false;

    if (sourceSquare !== expectedFrom || targetSquare !== expectedTo) {
      setStatus("wrong");
      return false;
    }

    if (expectedPromotion) {
      const pieceLetter = piece.pieceType[1]?.toLowerCase();
      if (pieceLetter !== expectedPromotion) {
        setStatus("wrong");
        return false;
      }
    }

    setGame(new Chess(chess.fen()));

    const nextIndex = moveIndex + 1;

    if (nextIndex >= solutionMoves.length) {
      setStatus("correct");
      reportResult(true);
      return true;
    }

    makeOpponentMove(chess, solutionMoves, nextIndex);
    return true;
  }

  if (status === "start") {
    return (
      <div className="puzzle-container">
        <div className="interstitial">
          <h2>Puzzle Training</h2>
          <p>Solve tactical puzzles to sharpen your chess skills.</p>
          <button className="interstitial-btn" onClick={loadPuzzle}>Start</button>
        </div>
      </div>
    );
  }

  if (status === "review" && lastResult) {
    return (
      <div className="puzzle-container">
        <div className="interstitial">
          <span className={lastResult.correct ? "status-correct" : "status-wrong"}>
            {lastResult.correct ? "Correct!" : "Incorrect"}
          </span>
          <div className="review-details">
            <p>Rating: {lastResult.puzzle.rating}</p>
            <p>Themes: {lastResult.puzzle.themes.replace(/ /g, ", ")}</p>
          </div>
          <button className="interstitial-btn" onClick={loadPuzzle}>Next Puzzle</button>
        </div>
      </div>
    );
  }

  return (
    <div className="puzzle-container">
      <div className="puzzle-info">
        {puzzle && (
          <span className="puzzle-rating">Rating: {puzzle.rating}</span>
        )}
      </div>

      <div className={status === "loading" ? "board-wrapper board-loading" : "board-wrapper"}>
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop,
            boardOrientation,
            allowDragging: status === "playing",
            boardStyle: { width: "480px", height: "480px" },
          }}
        />
      </div>

      <div className="puzzle-status">
        {status === "loading" && <span>Loading puzzle...</span>}
        {status === "playing" && <span>Your turn — find the best move</span>}
        {status === "correct" && <span className="status-correct">Correct!</span>}
        {status === "wrong" && <span className="status-wrong">Wrong move — try again</span>}
      </div>

      <div className="puzzle-controls">
        {(status === "correct" || status === "wrong") && (
          <button onClick={() => {
            if (status === "wrong") reportResult(false);
            setLastResult({ puzzle: puzzle!, correct: status === "correct" });
            setStatus("review");
          }}>Continue</button>
        )}
        {status === "wrong" && (
          <button onClick={() => {
            setGame(new Chess(game.fen()));
            setStatus("playing");
          }}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
