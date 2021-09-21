// /* eslint max-classes-per-file: ["error", 2] */
// import { TestBed } from '@angular/core/testing';
// import { PlaceLetter, PlacementSetting } from '@app/GameLogic/actions/place-letter';
// import { Tile } from '@app/GameLogic/game/tile';
// import { Player } from '@app/GameLogic/player/player';
// import { User } from '@app/GameLogic/player/user';
// import { Dictionary } from '@app/GameLogic/validator/dictionary';
// import { DictionaryService } from '@app/GameLogic/validator/dictionary.service';
// import { WordSearcher } from '@app/GameLogic/validator/word-search/word-searcher';

// const BOARD_LENGTH = 16;
// const BOARD_WIDTH = 16;
// class MockDictionaryService extends DictionaryService {
//     mockDictionary: Dictionary = {
//         title: 'dictionnaire',
//         description: 'mots',
//         words: ['bateau', 'crayon', 'table', 'butte', 'allo', 'ou', 'mi', 'il', 'ma', 'elle'],
//     };

//     isWordInDict(word: string): boolean {
//         const dict = new Set(this.mockDictionary.words);
//         return dict.has(word.toLowerCase());
//     }
// }

// class MockBoard {
//     grid: Tile[][];
//     constructor() {
//         this.grid = [];
//         for (let i = 0; i < BOARD_WIDTH; i++) {
//             this.grid[i] = [];
//             for (let j = 0; j < BOARD_LENGTH; j++) {
//                 this.grid[i][j] = new Tile();
//                 this.grid[i][j].letterObject = { char: ' ', value: 1 };
//             }
//         }

//         this.grid[0][0].letterObject = { char: 'M', value: 1 };
//         this.grid[0][1].letterObject = { char: 'I', value: 1 };
//         this.grid[1][0].letterObject = { char: 'A', value: 1 };
//         this.grid[1][1].letterObject = { char: 'L', value: 1 };
//         this.grid[1][2].letterObject = { char: 'L', value: 1 };
//         this.grid[1][3].letterObject = { char: 'O', value: 1 };
//         this.grid[2][3].letterObject = { char: 'U', value: 1 };

//         this.grid[4][1].letterObject = { char: 'E', value: 1 };
//         this.grid[4][2].letterObject = { char: 'L', value: 1 };
//         this.grid[4][3].letterObject = { char: 'L', value: 1 };
//         this.grid[4][4].letterObject = { char: 'E', value: 1 };
//     }
// }

// describe('WordSearcher', () => {
//     let wordSearcher: WordSearcher;
//     const board: MockBoard = new MockBoard();
//     let dictionaryService: MockDictionaryService;

//     beforeEach(() => {
//         TestBed.configureTestingModule({
//             providers: [MockDictionaryService, MockBoard],
//         });
//         dictionaryService = TestBed.inject(MockDictionaryService);
//         wordSearcher = new WordSearcher(board, dictionaryService);
//     });

//     it('should be created', () => {
//         expect(wordSearcher).toBeTruthy();
//     });

//     it('should thorw error if word is not valid', () => {
//         const word: Tile[] = [
//             { letterObject: { char: 'B', value: 3 }, letterMultiplicator: 2, wordMultiplicator: 1 },
//             { letterObject: { char: 'U', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'T', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'T', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//         ];
//         expect(() => {
//             wordSearcher.addWord(word);
//         }).toThrow();
//     });

//     it('should convert a word in tile to string', () => {
//         const wordBateau = [
//             { letterObject: { char: 'B', value: 3 }, letterMultiplicator: 2, wordMultiplicator: 1 },
//             { letterObject: { char: 'A', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'T', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'E', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'A', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'U', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//         ];
//         const wordBateauToString = wordSearcher.tileToString(wordBateau);
//         expect(wordBateauToString).toBeInstanceOf(String);
//         expect(wordBateauToString).toBe('BATEAU');
//     });

//     it('should add word to list if word is valid', () => {
//         const word: Tile[] = [
//             { letterObject: { char: 'B', value: 3 }, letterMultiplicator: 2, wordMultiplicator: 1 },
//             { letterObject: { char: 'U', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'T', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'T', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//             { letterObject: { char: 'E', value: 1 }, letterMultiplicator: 1, wordMultiplicator: 1 },
//         ];

//         wordSearcher.addWord(word);
//         expect(wordSearcher.listOfValidWord).toContain(word);
//     });

//     it('should find all neighbours if they are all valid words', () => {
//         const player: Player = new User('Max');
//         // const letters: Letter[] = [
//         //     { char: 'M', value: 1 },
//         //     { char: 'I', value: 1 },
//         // ];
//         const place: PlacementSetting = { x: 0, y: 0, direction: 'H' };
//         const action = new PlaceLetter(player, 'mi', place);

//         wordSearcher.searchAdjacentWords(action);
//         let wordListInString: String[] = [];
//         for (const word of wordSearcher.listOfValidWord) {
//             wordListInString.push(wordSearcher.tileToString(word).toLowerCase());
//         }
//         expect(wordListInString).toContain('ma');
//     });

//     it('should return all neighbours if they are all valid words', () => {
//         const wordsToReturn: string[] = ['mi', 'ma', 'il'];
//         const player: Player = new User('Max');
//         // const letters: Letter[] = [
//         //     { char: 'M', value: 1 },
//         //     { char: 'I', value: 1 },
//         // ];
//         const place: PlacementSetting = { x: 0, y: 0, direction: 'H' };
//         const action = new PlaceLetter(player, 'mi', place);

//         wordSearcher.searchAdjacentWords(action);

//         expect(wordSearcher.tileToString(wordSearcher.listOfValidWord[0]).toLowerCase()).toEqual(wordsToReturn[0]);
//         expect(wordSearcher.tileToString(wordSearcher.listOfValidWord[1]).toLowerCase()).toEqual(wordsToReturn[1]);
//         expect(wordSearcher.tileToString(wordSearcher.listOfValidWord[2]).toLowerCase()).toEqual(wordsToReturn[2]);
//     });

//     it('should add word to list if word is valid on board', () => {
//         // Mot EL-E a la poisition (1,4) on ajoute L(3,4);
//         const player: Player = new User('Max');
//         // const letters: Letter[] = [{ char: 'L', value: 1 }];
//         const placement: PlacementSetting = { x: 3, y: 4, direction: 'H' };

//         const action = new PlaceLetter(player, 'l', placement);

//         wordSearcher.validatePlacement(action);
//         let wordListInString: String[] = [];
//         for (const word of wordSearcher.listOfValidWord) {
//             wordListInString.push(wordSearcher.tileToString(word).toLowerCase());
//         }
//         expect(wordListInString).toContain('elle');
//     });
// });
