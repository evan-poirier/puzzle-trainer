import { useState, useCallback, useRef, useEffect } from "react";
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

type PuzzleStatus = "loading" | "playing" | "correct" | "wrong" | "review";

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
  const [status, setStatus] = useState<PuzzleStatus>("loading");
  const [reported, setReported] = useState(false);
  const [lastResult, setLastResult] = useState<{ puzzle: Puzzle; correct: boolean } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
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
    setSelectedSquare(null);
    setLegalMoves([]);
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

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

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

  function selectPiece(square: string) {
    const moves = game.moves({ square: square as Square, verbose: true });
    if (moves.length > 0) {
      setSelectedSquare(square);
      setLegalMoves(moves.map((m) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }

  function clearSelection() {
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  function tryMove(from: string, to: string) {
    const expectedUci = solutionMoves[moveIndex];
    const expectedFrom = expectedUci.substring(0, 2);
    const expectedTo = expectedUci.substring(2, 4);
    const expectedPromotion = expectedUci.length > 4 ? expectedUci[4] : undefined;

    const chess = new Chess(game.fen());
    const move = chess.move({
      from: from as Square,
      to: to as Square,
      promotion: expectedPromotion,
    });
    if (!move) return;

    clearSelection();

    if (from !== expectedFrom || to !== expectedTo) {
      setStatus("wrong");
      return;
    }

    if (expectedPromotion) {
      const piece = game.get(from as Square);
      if (piece && piece.type !== expectedPromotion) {
        setStatus("wrong");
        return;
      }
    }

    setGame(new Chess(chess.fen()));
    const nextIndex = moveIndex + 1;
    if (nextIndex >= solutionMoves.length) {
      setStatus("correct");
      reportResult(true);
      return;
    }
    makeOpponentMove(chess, solutionMoves, nextIndex);
  }

  function onSquareClick({ square }: { piece: unknown; square: string }) {
    if (status !== "playing") return;

    if (selectedSquare && legalMoves.includes(square)) {
      tryMove(selectedSquare, square);
      return;
    }

    const piece = game.get(square as Square);
    if (piece && piece.color === game.turn()) {
      selectPiece(square);
    } else {
      clearSelection();
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean {
    clearSelection();
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
      <div className={status === "loading" ? "board-wrapper board-loading" : "board-wrapper"}>
        {status === "loading" && <div className="board-loading-overlay">Loading puzzle...</div>}
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop,
            onSquareClick,
            boardOrientation,
            allowDragging: status === "playing",
            boardStyle: { width: "480px", height: "480px" },
            squareStyles: {
              ...(selectedSquare ? { [selectedSquare]: { background: "rgba(255, 255, 0, 0.4)" } } : {}),
              ...Object.fromEntries(
                legalMoves.map((sq) => {
                  const hasPiece = game.get(sq as Square);
                  return [sq, {
                    background: hasPiece
                      ? "radial-gradient(circle, transparent 55%, rgba(0, 0, 0, 0.3) 55%)"
                      : "radial-gradient(circle, rgba(0, 0, 0, 0.25) 25%, transparent 25%)",
                  }];
                })
              ),
            },
          }}
        />
      </div>

      <div className="puzzle-status">
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
            clearSelection();
          }}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
