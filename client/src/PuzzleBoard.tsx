import { useState, useEffect, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import type { PieceDropHandlerArgs } from "react-chessboard/dist/types";

interface Puzzle {
  id: number;
  puzzleId: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string;
}

type PuzzleStatus = "loading" | "playing" | "correct" | "wrong";

export default function PuzzleBoard() {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("loading");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");

  const loadPuzzle = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/puzzle/random");
    const data: Puzzle = await res.json();
    setPuzzle(data);

    const moves = data.moves.split(" ");
    setSolutionMoves(moves);

    const chess = new Chess(data.fen);

    // Player's color is whoever moves AFTER the setup move
    const setupColor = chess.turn();
    setBoardOrientation(setupColor === "w" ? "black" : "white");

    // Play the opponent's setup move
    const setupMove = moves[0];
    chess.move({
      from: setupMove.substring(0, 2) as Square,
      to: setupMove.substring(2, 4) as Square,
      promotion: setupMove.length > 4 ? setupMove[4] : undefined,
    });

    setGame(chess);
    setMoveIndex(1);
    setStatus("playing");
  }, []);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

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

    const expectedUci = solutionMoves[moveIndex];
    const expectedFrom = expectedUci.substring(0, 2);
    const expectedTo = expectedUci.substring(2, 4);
    const expectedPromotion = expectedUci.length > 4 ? expectedUci[4] : undefined;

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

    const chess = new Chess(game.fen());
    const move = chess.move({
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: expectedPromotion,
    });
    if (!move) return false;

    setGame(new Chess(chess.fen()));

    const nextIndex = moveIndex + 1;

    if (nextIndex >= solutionMoves.length) {
      setStatus("correct");
      return true;
    }

    makeOpponentMove(chess, solutionMoves, nextIndex);
    return true;
  }

  return (
    <div className="puzzle-container">
      <div className="puzzle-info">
        {puzzle && (
          <>
            <span className="puzzle-rating">Rating: {puzzle.rating}</span>
            <span className="puzzle-themes">{puzzle.themes.replace(/ /g, ", ")}</span>
          </>
        )}
      </div>

      <Chessboard
        options={{
          position: game.fen(),
          onPieceDrop,
          boardOrientation,
          allowDragging: status === "playing",
          boardStyle: { width: "480px", height: "480px" },
        }}
      />

      <div className="puzzle-status">
        {status === "loading" && <span>Loading puzzle...</span>}
        {status === "playing" && <span>Your turn — find the best move</span>}
        {status === "correct" && <span className="status-correct">Correct!</span>}
        {status === "wrong" && <span className="status-wrong">Wrong move — try again</span>}
      </div>

      <div className="puzzle-controls">
        {(status === "correct" || status === "wrong") && (
          <button onClick={loadPuzzle}>Next Puzzle</button>
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
