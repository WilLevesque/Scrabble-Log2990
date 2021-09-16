import { Tile } from '@app/GameLogic/game/tile';
import { DictionaryService } from '@app/GameLogic/validator/dictionary.service';
import { BoardService } from '@app/services/board.service';
import { Player } from './player';
import { ValidWord } from './valid-word';

export abstract class Bot extends Player {
    static botNames = ['Jimmy', 'Sasha', 'Beep'];

    // Bot constructor takes opponent name as argument to prevent same name
    constructor(name: string, private boardService: BoardService, private dictionaryService: DictionaryService) {
        super('PlaceholderName');
        this.name = this.generateBotName(name);
    }

    getRandomInt(max: number, min: number = 0) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    // Will probably need to be moved to a UI component to show the name
    generateBotName(opponentName: string): string {
        const generatedName = Bot.botNames[this.getRandomInt(Bot.botNames.length)];
        return generatedName === opponentName ? this.generateBotName(opponentName) : generatedName;
    }

    // TODO add the board and dictionary services to the bot creator
    bruteForceStart(): ValidWord[] {
        const grid = this.boardService.board.grid;
        const validWordList: ValidWord[] = [];
        const startingX = 0;
        const startingY = 0;
        const startingDirection = false;
        // let isTimesUp = false;

        this.boardCrawler(startingX, startingY, grid, validWordList, startingDirection);

        // grid[1][1].letterObject;

        return validWordList;
    }

    // TODO Verify if edge case where only one letter is placed works
    private boardCrawler(startingX: number, startingY: number, grid: Tile[][], validWordList: ValidWord[], isVerticalFlag: boolean) {
        let x = startingX;
        let y = startingY;
        const endOfBoard = 14;
        const startOfBoard = 0;
        let isVertical = isVerticalFlag;
        let lettersOnLine = '';

        // HookUtil
        this.dictionaryService.wordGen('test');
        // TODO To be deleted

        let letterInBox = grid[x][y].letterObject.char;
        while (letterInBox === ' ') {
            if (isVertical) {
                if (y === endOfBoard) {
                    break;
                } else {
                    y++;
                    letterInBox = grid[x][y].letterObject.char;
                }
            } else {
                if (x == endOfBoard) {
                    break;
                } else {
                    x++;
                    letterInBox = grid[x][y].letterObject.char;
                }
            }
        }
        if (letterInBox !== ' ') {
            let lastLetterOfLine: number;
            if (isVertical) {
                let tmpY = endOfBoard;
                let tmpYLetterInBox = grid[x][tmpY].letterObject.char;
                while (tmpYLetterInBox === ' ') {
                    tmpY--;
                    tmpYLetterInBox = grid[x][tmpY].letterObject.char;
                }
                lastLetterOfLine = tmpY;
                while (y <= lastLetterOfLine) {
                    lettersOnLine = lettersOnLine.concat(this.emptyCheck(letterInBox));
                    y++;
                    letterInBox = grid[x][y].letterObject.char;
                }
            } else {
                let tmpX = endOfBoard;
                let tmpXLetterInBox = grid[tmpX][y].letterObject.char;
                while (tmpXLetterInBox === ' ') {
                    tmpX--;
                    tmpXLetterInBox = grid[tmpX][y].letterObject.char;
                }
                lastLetterOfLine = tmpX;
                while (x <= lastLetterOfLine) {
                    lettersOnLine = lettersOnLine.concat(this.emptyCheck(letterInBox));
                    x++;
                    letterInBox = grid[x][y].letterObject.char;
                }
            }

            // TODO Check dict for list of words here
            // TODO Check if the words found can be placed with the available letters here
            // TODO Check if the words that can be made are valid / crosscheck / scoring of the move here
        }

        if (isVertical && x < endOfBoard) {
            x++;
            y = startOfBoard;
            this.boardCrawler(x, y, grid, validWordList, isVertical);
        } else if (isVertical && x === endOfBoard) return;
        if (!isVertical && y < endOfBoard) {
            x = startOfBoard;
            y++;
            this.boardCrawler(x, y, grid, validWordList, isVertical);
        } else if (!isVertical && x === endOfBoard) {
            x = startOfBoard;
            y = startOfBoard;
            isVertical = true;
            this.boardCrawler(x, y, grid, validWordList, isVertical);
        }

        // if (x < endOfBoard) {
        //     x++;
        //     this.boardCrawler(x, y, grid, validWordList, isVertical);
        // } else if (y < endOfBoard && x === endOfBoard) {
        //     x = startOfBoard;
        //     y++;
        //     this.boardCrawler(x, y, grid, validWordList, isVertical);
        // } else if (y === endOfBoard && x === endOfBoard && !isVertical) {
        //     x = startOfBoard;
        //     y = startOfBoard;
        //     isVertical = true;
        // }
        // return;

        // this.boardCrawler(newX, newY, grid, validWordList);
    }

    private emptyCheck(letterInBox: string): string {
        if (letterInBox !== ' ') {
            return letterInBox;
        } else {
            return '-';
        }
    }

    // TODO Might not be necessary
    // private lineParser(direction: number, grid: Tile[][]): string {
    //     let lettersOnLine = '';

    //     this.dictionaryService.wordGen('test');

    //     return lettersOnLine;
    // }

    // TODO Make private
    wordValidator(x: number, y: number, grid: Tile[][], validWordList: ValidWord[]) {}

    // TODO Remove commented console.log/code and make private
    // TODO Edge case board is empty
    // TODO Edge case forming words with multiple sets of placed letters
    // Check if it's possible to form the word with the currently available letters
    regexCheck(dictWord: string, placedWord: string): boolean {
        // let testBot = new EasyBot('Jimmy');
        // console.log(testBot.regexCheck('keyboard', 'oa'));
        // let letterRack = 'keybrd';

        const letterRack = this.letterRack;
        const mapRack = new Map();
        const notFound = -1;
        const firstLetterIndex = 1;
        const wordLength = dictWord.length;

        for (const letter of letterRack) {
            const letterCount = mapRack.get(letter);
            if (mapRack.has(letter)) {
                mapRack.set(letter, letterCount + 1);
            } else {
                mapRack.set(letter, 1);
            }
        }
        let regex = new RegExp(placedWord.toLowerCase());
        let INDEX = dictWord.search(regex);
        if (INDEX === notFound) {
            return false;
        }
        while (INDEX !== firstLetterIndex) {
            const lettersLeft = this.tmpLetterLeft(mapRack);
            regex = new RegExp('(?<=[' + lettersLeft + '])' + placedWord.toLowerCase());
            INDEX = dictWord.search(regex);

            if (INDEX === notFound) {
                if (mapRack.has('*')) {
                    regex = new RegExp(placedWord.toLowerCase());
                    INDEX = dictWord.search(regex);
                    this.deleteTmpLetter('*', mapRack);
                    placedWord = dictWord[INDEX - 1].toUpperCase() + placedWord;
                } else break;
            } else {
                this.deleteTmpLetter(dictWord[INDEX - 1], mapRack);
                placedWord = dictWord[INDEX - 1] + placedWord;
            }
        }
        while (placedWord.length !== wordLength) {
            const lettersLeft = this.tmpLetterLeft(mapRack);
            regex = new RegExp(placedWord.toLowerCase() + '(?=[' + lettersLeft + '])');
            INDEX = dictWord.search(regex);
            if (INDEX === notFound) {
                if (mapRack.has('*')) {
                    regex = new RegExp(placedWord.toLowerCase());
                    INDEX = dictWord.search(regex);
                    this.deleteTmpLetter('*', mapRack);
                    placedWord = placedWord + dictWord[placedWord.length].toUpperCase();
                } else break;
            } else {
                this.deleteTmpLetter(dictWord[placedWord.length], mapRack);
                placedWord = placedWord + dictWord[placedWord.length];
            }
        }
        // if(dictWord.search(regex) !== notFound)
        if (dictWord === placedWord.toLowerCase()) {
            // console.log('Found_Word: ' + placedWord);
            return true;
        } else {
            // console.log('Not_Found');
            return false;
        }
    }

    private deleteTmpLetter(placedLetter: string, mapRack: Map<string, number>) {
        if (!mapRack) return;
        const letterCount = mapRack.get(placedLetter);
        if (!letterCount) return;
        if (letterCount > 1) {
            mapRack.set(placedLetter, letterCount - 1);
        } else {
            mapRack.delete(placedLetter);
        }
    }

    private tmpLetterLeft(mapRack: Map<string, number>): string {
        let lettersLeft = '';
        if (!mapRack) return lettersLeft;
        for (const key of mapRack.keys()) {
            if (key !== '*') {
                const letterCount = mapRack.get(key);
                if (!letterCount) return lettersLeft;
                for (let i = 0; i < letterCount; i++) {
                    lettersLeft += key;
                }
            }
        }
        return lettersLeft;
    }

    hello(): void {
        console.log('hello from bot ' + this.name);
    }
}
