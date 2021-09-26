/* eslint-disable max-classes-per-file */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DEFAULT_TIME_PER_TURN } from '@app/components/new-solo-game-form/new-solo-game-form.component';
import { PlaceLetter, PlacementSetting } from '@app/GameLogic/actions/place-letter';
import { Game } from '@app/GameLogic/game/games/game';
import { LetterCreator } from '@app/GameLogic/game/letter-creator';
import { Tile } from '@app/GameLogic/game/tile';
import { TimerService } from '@app/GameLogic/game/timer/timer.service';
import { Player } from '@app/GameLogic/player/player';
import { User } from '@app/GameLogic/player/user';
import { PointCalculatorService } from '@app/GameLogic/point-calculator/point-calculator.service';
import { Word } from '@app/GameLogic/validator/word-search/word';
import { WordSearcher } from '@app/GameLogic/validator/word-search/word-searcher.service';
import { BoardService } from '@app/services/board.service';

class MockWordSearcher extends WordSearcher {
    validity = true;
    // eslint-disable-next-line no-unused-vars
    listOfValidWord(action: PlaceLetter): Word[] {
        if (this.validity) {
            return [{ letters: [new Tile()], index: [0] }];
        }
        return [];
    }
}

class MockPointCalculator extends PointCalculatorService {
    placeLetterPointsCalculation(action: PlaceLetter, listOfWord: Tile[][]) {
        const points = action.word.length + listOfWord.length;
        action.player.points += points;
        return points;
    }
}

describe('PlaceLetter', () => {
    let timer: TimerService;

    const lettersToPlace = 'bateau';

    const placement: PlacementSetting = {
        x: 0,
        y: 0,
        direction: 'H',
    };
    let game: Game;
    const player1: Player = new User('Tim');
    const player2: Player = new User('George');
    let pointCalculatorService: PointCalculatorService;
    let wordSearcher: WordSearcher;
    let placeLetter: PlaceLetter;
    beforeEach(() => {
        timer = new TimerService();
        TestBed.configureTestingModule({
            providers: [
                BoardService,
                { provide: PointCalculatorService, useClass: MockPointCalculator },
                { provide: WordSearcher, useClass: MockWordSearcher },
            ],
        });
        const boardService = new BoardService();
        pointCalculatorService = TestBed.inject(PointCalculatorService);
        wordSearcher = TestBed.inject(WordSearcher);

        game = new Game(DEFAULT_TIME_PER_TURN, timer, pointCalculatorService, boardService);
        game.players.push(player1);
        game.players.push(player2);
        game.start();
        const letterCreator = new LetterCreator();
        const letterObjects = letterCreator.createLetters(lettersToPlace.split(''));
        const activePlayer = game.getActivePlayer();
        for (let i = 0; i < letterObjects.length; i++) {
            activePlayer.letterRack[i] = letterObjects[i];
        }
        placeLetter = new PlaceLetter(activePlayer, lettersToPlace, placement, pointCalculatorService, wordSearcher);
    });

    it('should create an instance', () => {
        const activePlayer = game.getActivePlayer();
        expect(new PlaceLetter(activePlayer, lettersToPlace, placement, pointCalculatorService, wordSearcher)).toBeTruthy();
    });

    it('should place letter at right place', () => {
        placeLetter.execute(game);
        for (let i = 0; i < lettersToPlace.length; i++) {
            expect(game.board.grid[0][i].letterObject.char).toBe(lettersToPlace.charAt(i).toUpperCase());
        }
    });

    it('should have proper revert behavior', fakeAsync(() => {
        const TIME_BEFORE_REVERT = 3000;
        (wordSearcher as MockWordSearcher).validity = false;
        placeLetter.execute(game);
        tick(TIME_BEFORE_REVERT);
        for (let i = 0; i < lettersToPlace.length; i++) {
            expect(game.board.grid[i][0].letterObject.char).toBe(' ');
        }
    }));

    it('should add points when action valid', () => {
        const LIST_OF_WORD_LENGTH = 1;
        const points = placeLetter.word.length + LIST_OF_WORD_LENGTH;
        placeLetter.execute(game);
        const activePlayer = game.getActivePlayer();
        expect(activePlayer.points).toBe(points);
    });
});
