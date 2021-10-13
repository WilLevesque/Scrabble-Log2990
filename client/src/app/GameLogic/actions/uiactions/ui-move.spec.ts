import { ARROWLEFT, ARROWRIGHT, BACKSPACE, ENTER, JOKER_CHAR, ONE, RACK_LETTER_COUNT, SIX, SPACE, THREE, TWO, ZERO } from '@app/GameLogic/constants';
import { WheelRoll } from '@app/GameLogic/interface/ui-input';
import { Player } from '@app/GameLogic/player/player';
import { User } from '@app/GameLogic/player/user';
import { getRandomInt } from '@app/GameLogic/utils';
import { UIMove } from './ui-move';

describe('UIMove', () => {
    let player: Player;
    beforeEach(() => {
        player = new User('p1');
        player.letterRack = [
            { char: 'A', value: 0 },
            { char: 'B', value: 0 },
            { char: 'C', value: 0 },
            { char: JOKER_CHAR, value: 0 },
            { char: 'E', value: 0 },
            { char: 'F', value: 0 },
            { char: 'G', value: 0 },
        ];
    });

    it('should create an instance', () => {
        expect(new UIMove(player)).toBeTruthy();
    });

    it('should return the appropriate canBeCreated boolean', () => {
        const action = new UIMove(player);
        expect(action.canBeCreated).toBeFalsy();
        action.concernedIndexes.add(0);
        expect(action.canBeCreated).toBeTruthy();
        action.concernedIndexes.delete(0);
        expect(action.canBeCreated).toBeFalsy();
    });

    it('should throw error when receiving a RightClick', () => {
        expect(() => {
            new UIMove(player).receiveRightClick();
        }).toThrowError('UIMove should not be able to receive a RightClick');
    });

    it('should update the concernedIndexes (unique) following a receiveLeftClick call', () => {
        const action = new UIMove(player);
        const firstIndex = 0;
        const secondIndex = getRandomInt(RACK_LETTER_COUNT - 1, 1);
        action.receiveLeftClick(firstIndex);
        expect(action.concernedIndexes.has(firstIndex)).toBeTruthy();
        action.receiveLeftClick(firstIndex);
        expect(action.concernedIndexes.has(firstIndex)).toBeFalsy();
        action.receiveLeftClick(firstIndex);
        action.receiveLeftClick(secondIndex);
        expect(action.concernedIndexes.has(firstIndex)).toBeFalsy();
        expect(action.concernedIndexes.has(secondIndex)).toBeTruthy();
        expect(action.concernedIndexes.size).toBe(ONE);
    });


    it('should properly select a letter from the player LetterRack', () => {
        const action = new UIMove(player);
        const index = getRandomInt(RACK_LETTER_COUNT - 1);
        action.receiveKey(player.letterRack[index].char.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(index)).toBeTruthy();
    });

    it('should properly select a letter from the player LetterRack and select, if possible, the next occurence', () => {
        const action = new UIMove(player);
        const firstIndex = 0;
        const secondIndex = THREE;
        const thirdIndex = SIX;
        const repeatedChar = player.letterRack[firstIndex].char;
        player.letterRack[secondIndex].char = repeatedChar;
        player.letterRack[thirdIndex].char = repeatedChar;

        action.receiveKey(repeatedChar.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(firstIndex)).toBeTruthy();

        action.receiveKey(repeatedChar.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(secondIndex)).toBeTruthy();

        action.receiveKey(repeatedChar.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(thirdIndex)).toBeTruthy();

        action.receiveKey(repeatedChar.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(firstIndex)).toBeTruthy();
    });

    it('should properly select a joker from the player LetterRack and select, if possible, the next occurence', () => {
        const action = new UIMove(player);
        const firstIndex = 0;
        const secondIndex = THREE;
        const repeatedJoker = player.letterRack[secondIndex].char;
        player.letterRack[firstIndex].char = repeatedJoker;

        action.receiveKey(repeatedJoker.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(firstIndex)).toBeTruthy();

        action.receiveKey(repeatedJoker.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(secondIndex)).toBeTruthy();

        action.receiveKey(repeatedJoker.toLowerCase());
        expect(action.concernedIndexes.size).toBe(ONE);
        expect(action.concernedIndexes.has(firstIndex)).toBeTruthy();
    });

    it('should unselect a letter from the player LetterRack if a key/number outside of the LetterRack is pressed', () => {
        const action = new UIMove(player);
        const index = 0;
        const char = player.letterRack[index].char;

        const keysOutsideOfLetterRack = [SPACE, ENTER, BACKSPACE, '-', '#', '/', '.', '+', '!', '"']

        for (let outChar of keysOutsideOfLetterRack) {
            action.receiveKey(char.toLowerCase());
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.has(index)).toBeTruthy();

            action.receiveKey(outChar);
            expect(action.concernedIndexes.size).toBe(ZERO);
        }

        for (let num = 0; num < 10; num++) {
            action.receiveKey(char.toLowerCase());
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.has(index)).toBeTruthy();

            action.receiveKey(String(num));
            expect(action.concernedIndexes.size).toBe(ZERO);
        }
    });

    it('should unselect a letter from the player LetterRack if a letter outside of the LetterRack is pressed', () => {
        const action = new UIMove(player);
        const index = 0;
        const char = player.letterRack[index].char;
        const charOutsideOfLetterRack = ['h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

        for (let outChar of charOutsideOfLetterRack) {
            action.receiveKey(char.toLowerCase());
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.has(index)).toBeTruthy();

            action.receiveKey(outChar);
            expect(action.concernedIndexes.size).toBe(ZERO);
        }
    });

    it('should move the selected letter to the right after receiving an ARROWRIGHT keypress', () => {
        const action = new UIMove(player);
        const index = getRandomInt(RACK_LETTER_COUNT - 1);
        const concernedLetter = player.letterRack[index];
        action.receiveKey(concernedLetter.char.toLowerCase());

        for (let i = 0; i < TWO * RACK_LETTER_COUNT; i++) {
            const currentIndex = action.concernedIndexes.values().next().value
            const newIndex = (currentIndex + 1) % RACK_LETTER_COUNT
            action.receiveKey(ARROWRIGHT);
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.values().next().value).toBe(newIndex);
            expect(player.letterRack[newIndex]).toEqual(concernedLetter);
        }
    });

    it('should move the selected letter to the left after receiving an ARROWLEFT keypress', () => {
        const action = new UIMove(player);
        const index = getRandomInt(RACK_LETTER_COUNT - 1);
        const concernedLetter = player.letterRack[index];
        action.receiveKey(concernedLetter.char.toLowerCase());

        for (let i = 0; i < TWO * RACK_LETTER_COUNT; i++) {
            const currentIndex = action.concernedIndexes.values().next().value
            const newIndex = (currentIndex + RACK_LETTER_COUNT - 1) % RACK_LETTER_COUNT
            action.receiveKey(ARROWLEFT);
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.values().next().value).toBe(newIndex);
            expect(player.letterRack[newIndex]).toEqual(concernedLetter);
        }
    });

    it('should move the selected letter to the right after receiving a downwards mousewheel roll', () => {
        const action = new UIMove(player);
        const index = getRandomInt(RACK_LETTER_COUNT - 1);
        const concernedLetter = player.letterRack[index];
        action.receiveKey(concernedLetter.char.toLowerCase());

        for (let i = 0; i < TWO * RACK_LETTER_COUNT; i++) {
            const currentIndex = action.concernedIndexes.values().next().value
            const newIndex = (currentIndex + 1) % RACK_LETTER_COUNT
            action.receiveRoll(WheelRoll.DOWN);
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.values().next().value).toBe(newIndex);
            expect(player.letterRack[newIndex]).toEqual(concernedLetter);
        }
    });

    it('should move the selected letter to the left after receiving an upwards mousewheel roll', () => {
        const action = new UIMove(player);
        const index = getRandomInt(RACK_LETTER_COUNT - 1);
        const concernedLetter = player.letterRack[index];
        action.receiveKey(concernedLetter.char.toLowerCase());

        for (let i = 0; i < TWO * RACK_LETTER_COUNT; i++) {
            const currentIndex = action.concernedIndexes.values().next().value
            const newIndex = (currentIndex + RACK_LETTER_COUNT - 1) % RACK_LETTER_COUNT
            action.receiveRoll(WheelRoll.UP);
            expect(action.concernedIndexes.size).toBe(ONE);
            expect(action.concernedIndexes.values().next().value).toBe(newIndex);
            expect(player.letterRack[newIndex]).toEqual(concernedLetter);
        }
    });

    it('should throw error when create method is called', () => {
        expect(() => {
            new UIMove(player).create();
        }).toThrowError('UIMove should not be able to create an Action');
    });
});
