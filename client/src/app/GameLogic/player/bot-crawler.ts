import { PlaceLetter } from '@app/GameLogic/actions/place-letter';
import { Direction } from '@app/GameLogic/direction.enum';
import { Tile } from '@app/GameLogic/game/board/tile';
import { PlacementSetting } from '@app/GameLogic/interfaces/placement-setting.interface';
import { Vec2 } from '@app/GameLogic/interfaces/vec2';
import { Bot } from '@app/GameLogic/player/bot';
import { PositionSettings } from '@app/GameLogic/player/position-settings';
import { ValidWord, VERTICAL } from '@app/GameLogic/player/valid-word';
import { PointCalculatorService } from '@app/GameLogic/point-calculator/point-calculator.service';
import { DictionaryService } from '@app/GameLogic/validator/dictionary.service';
import { WordSearcher } from '@app/GameLogic/validator/word-search/word-searcher.service';

const EMPTY = 0;
const END_OF_BOARD = 14;
const START_OF_BOARD = 0;
const MIDDLE_OF_BOARD = 7;

export class BotCrawler {
    constructor(
        private bot: Bot,
        private dictionaryService: DictionaryService,
        protected pointCalculatorService: PointCalculatorService,
        protected wordValidator: WordSearcher,
    ) {}

    botFirstTurn() {
        for (let rackIndex = 0; rackIndex < this.bot.letterRack.length; rackIndex++) {
            if (this.bot.timesUp) break;
            const startingLetter = this.bot.letterRack[rackIndex].char.toLowerCase();
            if (startingLetter !== '*') {
                const placedLetter: ValidWord[] = [];
                const initialWord = new ValidWord(startingLetter);
                const tmpLetter = this.bot.letterRack.splice(rackIndex, 1);

                if (this.bot.getRandomInt(1)) {
                    initialWord.isVertical = VERTICAL;
                }

                initialWord.startingTileX = MIDDLE_OF_BOARD;
                initialWord.startingTileY = MIDDLE_OF_BOARD;
                initialWord.leftCount = MIDDLE_OF_BOARD;
                initialWord.rightCount = MIDDLE_OF_BOARD;
                placedLetter.push(initialWord);
                const possiblyValidWords: ValidWord[] = this.possibleWordsGenerator(placedLetter);
                possiblyValidWords.forEach((word) => {
                    word.numberOfLettersPlaced++;
                });
                this.bot.letterRack.splice(rackIndex, 0, tmpLetter[0]);

                this.possibleWordsValidator(possiblyValidWords);
            }
        }
    }

    boardCrawler(startingPosition: Vec2, grid: Tile[][], isVerticalFlag: boolean) {
        if (this.bot.timesUp) return;
        let x = startingPosition.x;
        let y = startingPosition.y;
        let isVertical = isVerticalFlag;
        let letterInBox = grid[y][x].letterObject.char;

        while (letterInBox === ' ') {
            if (isVertical) {
                if (y !== END_OF_BOARD) {
                    y++;
                } else break;
            } else {
                if (x !== END_OF_BOARD) {
                    x++;
                } else break;
            }
            letterInBox = grid[y][x].letterObject.char;
        }
        if (letterInBox !== ' ') {
            const position: PositionSettings = { x, y, isVertical };
            const lettersOnLine = this.getLettersOnLine(position, grid, letterInBox);
            const allPlacedLettersCombination = this.getAllPossibilitiesOnLine(lettersOnLine);
            const possiblyValidWords: ValidWord[] = this.possibleWordsGenerator(allPlacedLettersCombination);
            this.possibleWordsValidator(possiblyValidWords);
        }

        if (isVertical && x < END_OF_BOARD) {
            x++;
            y = START_OF_BOARD;
            const position: Vec2 = { x, y };
            this.boardCrawler(position, grid, isVertical);
            return;
        } else if (isVertical && x === END_OF_BOARD) {
            return;
        } else if (!isVertical && y < END_OF_BOARD) {
            x = START_OF_BOARD;
            y++;
            const position: Vec2 = { x, y };
            this.boardCrawler(position, grid, isVertical);
            return;
        } else {
            x = START_OF_BOARD;
            y = START_OF_BOARD;
            const position: Vec2 = { x, y };
            isVertical = true;
            this.boardCrawler(position, grid, isVertical);
            return;
        }
    }

    getAllPossibilitiesOnLine(lettersOnLine: ValidWord): ValidWord[] {
        const allPossibilities: ValidWord[] = [];
        const notFound = -1;
        const startOfLine = 0;
        let leftIndex = startOfLine;
        let rightIndex = startOfLine;
        const endOfLine = lettersOnLine.word.length;
        let subWord: string;

        let emptyBox = lettersOnLine.word.indexOf('-');
        let index = emptyBox;

        if (emptyBox === notFound) {
            lettersOnLine.word = lettersOnLine.word.toLowerCase();
            allPossibilities.push(lettersOnLine);
        } else {
            let maxGroupSize = 1;

            while (emptyBox !== notFound) {
                maxGroupSize++;

                while (lettersOnLine.word.charAt(index) === '-') {
                    index++;
                }
                leftIndex = index;
                emptyBox = lettersOnLine.word.indexOf('-', leftIndex);
                index = emptyBox;
            }

            let tmpSubWord: ValidWord = new ValidWord('');
            let leftCounter = 0;
            let rightCounter = 0;

            for (let groupsOf = 1; groupsOf <= maxGroupSize; groupsOf++) {
                tmpSubWord = new ValidWord('');
                leftIndex = startOfLine;
                emptyBox = lettersOnLine.word.indexOf('-');
                index = emptyBox;

                for (let passCount = 1; passCount < groupsOf; passCount++) {
                    while (lettersOnLine.word.charAt(index) === '-') {
                        index++;
                    }
                    rightIndex = index;
                    emptyBox = lettersOnLine.word.indexOf('-', rightIndex);
                    index = emptyBox;
                }
                rightIndex = index;

                while (emptyBox !== notFound) {
                    tmpSubWord = new ValidWord('');
                    subWord = lettersOnLine.word.substring(leftIndex, rightIndex);
                    tmpSubWord.word = subWord.toLowerCase();
                    if (leftIndex === startOfLine) {
                        tmpSubWord.leftCount = lettersOnLine.leftCount;
                    } else {
                        tmpSubWord.leftCount = leftCounter;
                    }
                    tmpSubWord.isVertical = lettersOnLine.isVertical;
                    if (lettersOnLine.isVertical) {
                        tmpSubWord.startingTileY = lettersOnLine.startingTileY + leftIndex;
                        tmpSubWord.startingTileX = lettersOnLine.startingTileX;
                    } else {
                        tmpSubWord.startingTileY = lettersOnLine.startingTileY;
                        tmpSubWord.startingTileX = lettersOnLine.startingTileX + leftIndex;
                    }
                    rightCounter = 0;
                    rightIndex++;

                    while (lettersOnLine.word.charAt(rightIndex) === '-') {
                        rightCounter++;
                        rightIndex++;
                    }
                    tmpSubWord.rightCount = rightCounter;
                    allPossibilities.push(tmpSubWord);

                    while (lettersOnLine.word.charAt(leftIndex) !== '-') {
                        leftIndex++;
                    }
                    leftCounter = 0;
                    leftIndex++;

                    while (lettersOnLine.word.charAt(leftIndex) === '-') {
                        leftCounter++;
                        leftIndex++;
                    }
                    emptyBox = lettersOnLine.word.indexOf('-', rightIndex);
                    rightIndex = emptyBox;
                }
                tmpSubWord = new ValidWord('');
                subWord = lettersOnLine.word.substring(leftIndex, endOfLine);
                tmpSubWord.word = subWord.toLowerCase();
                if (leftIndex === startOfLine) {
                    tmpSubWord.leftCount = lettersOnLine.leftCount;
                } else {
                    tmpSubWord.leftCount = leftCounter;
                }
                tmpSubWord.rightCount = lettersOnLine.rightCount;
                tmpSubWord.isVertical = lettersOnLine.isVertical;
                if (lettersOnLine.isVertical) {
                    tmpSubWord.startingTileY = lettersOnLine.startingTileY + leftIndex;
                    tmpSubWord.startingTileX = lettersOnLine.startingTileX;
                } else {
                    tmpSubWord.startingTileY = lettersOnLine.startingTileY;
                    tmpSubWord.startingTileX = lettersOnLine.startingTileX + leftIndex;
                }
                allPossibilities.push(tmpSubWord);
            }
        }
        return allPossibilities;
    }

    private getLettersOnLine(position: PositionSettings, grid: Tile[][], letterInBox: string): ValidWord {
        const lettersOnLine: ValidWord = new ValidWord('');
        let lastLetterOfLine: number;
        let rightCount = 0;
        if (position.isVertical) {
            lettersOnLine.leftCount = position.y;
        } else {
            lettersOnLine.leftCount = position.x;
        }
        lettersOnLine.isVertical = position.isVertical;
        lettersOnLine.startingTileX = position.x;
        lettersOnLine.startingTileY = position.y;
        if (position.isVertical) {
            let tmpY = END_OF_BOARD;
            let tmpYLetterInBox = grid[tmpY][position.x].letterObject.char;

            while (tmpYLetterInBox === ' ') {
                tmpY--;
                rightCount++;
                tmpYLetterInBox = grid[tmpY][position.x].letterObject.char;
            }
            lastLetterOfLine = tmpY;
            lettersOnLine.rightCount = rightCount;
            tmpY = position.y;

            while (tmpY <= lastLetterOfLine) {
                letterInBox = grid[tmpY][position.x].letterObject.char;
                lettersOnLine.word = lettersOnLine.word.concat(this.emptyCheck(letterInBox));
                tmpY++;
            }
        } else {
            let tmpX = END_OF_BOARD;
            let tmpXLetterInBox = grid[position.y][tmpX].letterObject.char;

            while (tmpXLetterInBox === ' ') {
                tmpX--;
                rightCount++;
                tmpXLetterInBox = grid[position.y][tmpX].letterObject.char;
            }
            lastLetterOfLine = tmpX;
            lettersOnLine.rightCount = rightCount;
            tmpX = position.x;

            while (tmpX <= lastLetterOfLine) {
                letterInBox = grid[position.y][tmpX].letterObject.char;
                lettersOnLine.word = lettersOnLine.word.concat(this.emptyCheck(letterInBox));
                tmpX++;
            }
        }
        return lettersOnLine;
    }

    private emptyCheck(letterInBox: string): string {
        if (letterInBox !== ' ') {
            return letterInBox;
        } else {
            return '-';
        }
    }

    private possibleWordsGenerator(allPlacedLettersCombination: ValidWord[]): ValidWord[] {
        const possiblyValidWords: ValidWord[] = [];
        let tmpWordList: ValidWord[] = [];

        for (const placedLetters of allPlacedLettersCombination) {
            tmpWordList = this.dictionaryService.wordGen(placedLetters);

            for (const word of tmpWordList) {
                const wordToValidate = this.dictionaryService.regexValidation(word, placedLetters.word, this.bot.letterRack);
                if (wordToValidate !== 'false') {
                    possiblyValidWords.push(
                        new ValidWord(
                            wordToValidate,
                            word.indexFound,
                            word.emptyCount,
                            word.leftCount,
                            word.rightCount,
                            word.isVertical,
                            word.startingTileX,
                            word.startingTileY,
                            word.numberOfLettersPlaced,
                        ),
                    );
                }
            }
        }
        return possiblyValidWords;
    }

    private possibleWordsValidator(possiblyValidWords: ValidWord[]) {
        for (const word of possiblyValidWords) {
            let placement: PlacementSetting;
            if (word.isVertical) {
                placement = { x: word.startingTileX, y: word.startingTileY, direction: Direction.Vertical };
            } else {
                placement = { x: word.startingTileX, y: word.startingTileY, direction: Direction.Horizontal };
            }
            const fakeAction = new PlaceLetter(this.bot, word.word, placement, this.pointCalculatorService, this.wordValidator);
            const validWords = this.wordValidator.listOfValidWord(fakeAction);
            const wordIsValid = validWords.length > EMPTY;
            if (wordIsValid) {
                const words = validWords.map((validWord) => validWord.letters);
                const pointEstimation = this.pointCalculatorService.testPlaceLetterCalculation(word.numberOfLettersPlaced, words);
                word.value = pointEstimation;
                word.adjacentWords = validWords;
                this.bot.validWordList.push(word);
            }
        }
    }
}
