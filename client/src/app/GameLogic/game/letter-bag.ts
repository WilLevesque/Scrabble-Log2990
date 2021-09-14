import { GameLetter } from './game-letter';

export class LetterBag {
    static GameLettersLetters = [
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '*',
    ];

    // Lint est pas parfait : https://github.com/typescript-eslint/typescript-eslint/issues/945
    static gameLettersCount = [9, 2, 2, 3, 15, 2, 2, 2, 8, 1, 1, 5, 3, 6, 6, 2, 1, 6, 6, 6, 6, 2, 1, 1, 1, 1, 2];
    static gameLettersValue = [1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 10, 1, 2, 1, 1, 3, 8, 1, 1, 1, 1, 4, 10, 10, 10, 10, 0];
    static playerLetterCount = 7;

    gameLetters: GameLetter[] = [];

    constructor() {
        for (let letterIndex = 0; letterIndex < LetterBag.GameLettersLetters.length; letterIndex++) {
            for (let count = 0; count < LetterBag.gameLettersCount[letterIndex]; count++) {
                this.gameLetters.push(new GameLetter(LetterBag.GameLettersLetters[letterIndex], LetterBag.gameLettersValue[letterIndex]));
            }
        }
        this.displayNumberGameLettersLeft();
    }

    displayNumberGameLettersLeft() {
        console.log('There are ' + this.gameLetters.length + ' GameLetters left');
    }

    drawEmptyRackLetters(): GameLetter[] {
        return this.drawGameLetters(LetterBag.playerLetterCount);
    }

    drawGameLetters(count: number = 1): GameLetter[] {
        if (count > this.gameLetters.length) {
            throw new Error('Not enough GameLetters in bag (' + this.gameLetters.length + ') to draw ' + count + ' GameLetters.');
        }
        const drawedGameLetters: GameLetter[] = [];
        let drawedGameLetterIndex = -1;
        for (let i = 0; i < count; i++) {
            drawedGameLetterIndex = this.getRandomInt(this.gameLetters.length);
            drawedGameLetters.push(this.gameLetters.splice(drawedGameLetterIndex, 1)[0]);
        }
        return drawedGameLetters;
    }

    getRandomInt(max: number) {
        return Math.floor(Math.random() * max);
    }
}