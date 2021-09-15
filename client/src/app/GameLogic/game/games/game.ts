import { Action } from '@app/GameLogic/actions/action';
import { ActionValidatorService } from '@app/GameLogic/actions/action-validator.service';
import { ExchangeLetter } from '@app/GameLogic/actions/exchange-letter';
import { PassTurn } from '@app/GameLogic/actions/pass-turn';
import { Board } from '@app/GameLogic/game/board';
import { LetterBag } from '@app/GameLogic/game/letter-bag';
import { TimerService } from '@app/GameLogic/game/timer/timer.service';
import { Player } from '@app/GameLogic/player/player';
import { PointCalculatorService } from '@app/GameLogic/point-calculator/point-calculator.service';
import { BoardService } from '@app/services/board.service';
import { merge } from 'rxjs';
import { first, mapTo } from 'rxjs/operators';

const MAX_CONSECUTIVE_PASS = 6;

export class Game {
    static readonly maxConsecutivePass = MAX_CONSECUTIVE_PASS;
    letterBag: LetterBag = new LetterBag();
    players: Player[] = [];
    board: Board = new Board();
    activePlayerIndex: number;
    consecutivePass: number = 0;
    avs: ActionValidatorService = new ActionValidatorService();
    turnNumber: number = 0;

    constructor(
        public timePerTurn: number,
        private timer: TimerService,
        private pointCalculator: PointCalculatorService,
        private boardService: BoardService,
    ) {
        this.boardService.board = this.board;
    }

    start(): void {
        this.drawGameLetters();
        this.pickFirstPlayer();
        this.startTurn();
    }

    nextPlayer() {
        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    }
    getActivePlayer(): Player {
        return this.players[this.activePlayerIndex];
    }

    isEndOfGame() {
        if (this.letterBag.isEmpty) {
            for (const player of this.players) {
                if (player.letterRackIsEmpty) {
                    return true;
                }
            }
        }
        if (this.consecutivePass >= Game.maxConsecutivePass) {
            return true;
        }
        return false;
    }

    onEndOfGame() {
        console.log('Game ended');
        this.pointCalculator.endOfGamePointdeduction(this);
        this.displayLettersLeft();
        for (const player of this.getWinner()) {
            console.log('Congratulations!', player.name, 'is the winner.');
        }
        console.log(this.getWinner());
    }

    doAction(action: Action) {
        if (action instanceof PassTurn) {
            this.consecutivePass += 1;
        } else {
            this.consecutivePass = 0;
        }
    }

    private pickFirstPlayer() {
        const max = this.players.length;
        const firstPlayer = Math.floor(Math.random() * max);
        this.activePlayerIndex = firstPlayer;
    }

    private drawGameLetters() {
        for (const player of this.players) {
            player.letterRack = this.letterBag.drawEmptyRackLetters();
            player.displayGameLetters();
            this.letterBag.displayNumberGameLettersLeft();
        }
    }

    /// ////////////////////////// ///
    getRandomInt(max: number) {
        return Math.floor(Math.random() * max);
    }

    private simulatePlayerInput(g: Game) {
        const fakeLetter = { char: 'A', value: 1 };
        g.getActivePlayer().letterRack[0] = fakeLetter;
        const exchangeLetterAction = new ExchangeLetter(g.getActivePlayer(), [fakeLetter]);
        const passTurnAction = new PassTurn(g.getActivePlayer());
        if (this.getRandomInt(2) === 1) {
            console.log('exchangeLetterAction ', exchangeLetterAction.id);
            g.avs.validateAction(exchangeLetterAction, g);
        } else {
            console.log('passTurnAction ', exchangeLetterAction.id);
            g.avs.validateAction(passTurnAction, g);
        }
    }
    /// ////////////////////////// ///

    private startTurn() {
        this.turnNumber++;
        /// ////////////////////////// ///
        console.log(' ');
        console.log('--- Turn No. : ', this.turnNumber, ' ---');
        setTimeout(() => {
            this.simulatePlayerInput(this);
        }, 2500);
        /// ////////////////////////// ///

        // TODO timerends emits passturn action + feed action in end turn arguments
        const activePlayer = this.players[this.activePlayerIndex];
        console.log('its', activePlayer, 'turns');
        const timerEnd$ = this.timer.start(this.timePerTurn).pipe(mapTo(new PassTurn(activePlayer)));
        const turnEnds$ = merge(activePlayer.action$, timerEnd$);
        turnEnds$.pipe(first()).subscribe((action) => this.endOfTurn(action));
    }

    // TODO implement action execute
    private endOfTurn(action: Action) {
        this.timer.stop();
        action.perform(this);
        console.log('end of turn');
        if (this.isEndOfGame()) {
            this.onEndOfGame();
            return;
        }
        this.nextPlayer();
        this.startTurn();
    }

    private displayLettersLeft() {
        console.log('Fin de partie - lettres restantes');
        for (const player of this.players) {
            if (!player.letterRackIsEmpty) {
                // TODO Envoyer dans la boite de communication
                console.log(player.name, ':', player.letterRack);
            }
        }
    }

    private getWinner(): Player[] {
        let highestScore = -1;
        let winners: Player[] = [];
        for (const player of this.players) {
            if (player.points === highestScore) {
                winners.push(player);
            }
            if (player.points > highestScore) {
                highestScore = player.points;
                winners = [player];
            }
        }
        return winners;
    }
}
