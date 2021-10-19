import { Injectable } from '@angular/core';
import { Action } from '@app/GameLogic/actions/action';
import { Direction } from '@app/GameLogic/actions/direction.enum';
import { ExchangeLetter } from '@app/GameLogic/actions/exchange-letter';
import { PassTurn } from '@app/GameLogic/actions/pass-turn';
import { PlaceLetter } from '@app/GameLogic/actions/place-letter';
import { BOARD_DIMENSION, BOARD_MAX_POSITION, BOARD_MIN_POSITION, EMPTY_CHAR, JOKER_CHAR, RACK_LETTER_COUNT } from '@app/GameLogic/constants';
import { BoardService } from '@app/GameLogic/game/board/board.service';
import { Letter } from '@app/GameLogic/game/board/letter.interface';
import { GameInfoService } from '@app/GameLogic/game/game-info/game-info.service';
import { MessagesService } from '@app/GameLogic/messages/messages.service';
import { placementSettingsToString } from '@app/GameLogic/utils';
@Injectable({
    providedIn: 'root',
})
export class ActionValidatorService {
    constructor(private boardService: BoardService, private gameInfo: GameInfoService, private messageService: MessagesService) {}

    sendActionArgsMessage(action: Action) {
        if (action instanceof PlaceLetter) {
            this.sendPlaceLetterMessage(action);
        }

        if (action instanceof ExchangeLetter) {
            this.sendExchangeLetterMessage(action);
        }

        if (action instanceof PassTurn) {
            this.sendPassTurnMessage(action);
        }
    }

    sendAction(action: Action) {
        const actionValid = this.validateAction(action);
        if (actionValid) {
            this.sendActionArgsMessage(action);
            const player = action.player;
            player.play(action);
        }
    }

    validateAction(action: Action): boolean {
        if (this.validateTurn(action)) {
            if (action instanceof PlaceLetter) {
                return this.validatePlaceLetter(action as PlaceLetter);
            }

            if (action instanceof ExchangeLetter) {
                return this.validateExchangeLetter(action as ExchangeLetter);
            }

            if (action instanceof PassTurn) {
                return this.validatePassTurn();
            }

            throw Error("Action couldn't be validated");
        }
        this.sendErrorMessage('Action demandé par ' + action.player.name + " pendant le tour d'un autre joueur");
        return false;
    }

    private validateTurn(action: Action): boolean {
        return this.gameInfo.activePlayer === action.player;
    }

    private validatePlaceLetter(action: PlaceLetter): boolean {
        if (!this.validateBoardsLimits(action)) {
            return false;
        }

        if (!this.validateLettersCanBePlaced(action)) {
            return false;
        }

        const centerTilePosition: number = Math.floor(BOARD_DIMENSION / 2);
        const hasCenterTile = this.boardService.board.grid[centerTilePosition][centerTilePosition].letterObject.char !== EMPTY_CHAR;
        if (hasCenterTile) {
            return this.validateOtherPlaceLetter(action);
        }
        return this.validateFirstPlaceLetter(action);
    }

    private validateLettersCanBePlaced(action: PlaceLetter) {
        let x = action.placement.x;
        const y = action.placement.y;
        let lettersNeeded = '';

        for (let letterIndex = 0; letterIndex < action.word.length; letterIndex++) {
            const currentTileChar = this.boardService.board.grid[y][x].letterObject.char.toLowerCase();
            const wordCurrentChar = action.word.charAt(letterIndex);
            if (currentTileChar === EMPTY_CHAR) {
                lettersNeeded = lettersNeeded.concat(wordCurrentChar);
            } else {
                if (wordCurrentChar.toLowerCase() !== currentTileChar) {
                    this.sendErrorMessage(
                        `Commande impossible à réaliser : La lettre 
                        ${wordCurrentChar} 
                        ne peut être placé en
                        ${String.fromCharCode(y + 'A'.charCodeAt(0))}
                        ${++x}`,
                    );
                    return false;
                }
            }
        }
        if (!this.hasLettersInRack(action.player.letterRack, lettersNeeded)) {
            let message = 'Commande impossible à réaliser : Le joueur ne possède pas toutes les lettres concernées.';
            if (this.hasAJoker(action.player.letterRack)) {
                message = message.concat(
                    ' Vous avez au moins une lettre blanche (*). Utilisez une lettre Majuscule pour la représenter dans votre mot.',
                );
            }
            this.sendErrorMessage(message);
            return false;
        }
        return true;
    }

    private validateBoardsLimits(action: PlaceLetter): boolean {
        // TODO : VALIDATE NEGATIVE
        let concernedAxisValue;
        if (action.placement.direction.charAt(0).toUpperCase() === Direction.Vertical) {
            concernedAxisValue = action.placement.y;
        } else {
            concernedAxisValue = action.placement.x;
        }
        const lastLetterPosition = concernedAxisValue + action.word.length;
        const doesLastPositionOverflow = lastLetterPosition > BOARD_MAX_POSITION || lastLetterPosition < BOARD_MIN_POSITION;
        if (doesLastPositionOverflow) {
            this.sendErrorMessage('Commande impossible à réaliser : Les lettres déboderont de la grille');
            return false;
        }
        return true;
    }

    private validateOtherPlaceLetter(action: PlaceLetter): boolean {
        let hasNeighbour = false;
        let x = action.placement.x;
        let y = action.placement.y;
        let index = 0;
        while (index++ < action.word.length) {
            if (action.placement.direction.charAt(0).toUpperCase() === Direction.Vertical) {
                y++;
            } else {
                x++;
            }
            hasNeighbour = this.boardService.board.hasNeighbour(x, y);
            if (hasNeighbour) {
                return true;
            }
        }
        this.sendErrorMessage("Commande impossible à réaliser : Le mot placé n'est pas adjacent à un autre mot");
        return false;
    }

    private validateFirstPlaceLetter(action: PlaceLetter): boolean {
        const centerTilePosition: number = Math.floor(BOARD_DIMENSION / 2);
        let x = action.placement.x;
        let y = action.placement.y;
        let index = 0;
        while (index++ < action.word.length) {
            if (action.placement.direction.charAt(0).toUpperCase() === Direction.Vertical) {
                y++;
            } else {
                x++;
            }
            if (x === centerTilePosition && y === centerTilePosition) {
                return true;
            }
        }
        this.sendErrorMessage("Commande impossible à réaliser : Aucun mot n'est pas placé sur la tuile centrale");
        return false;
    }

    // private oldValidatePlaceLetter(action: PlaceLetter): boolean {
    //     const centerTilePosition: number = Math.floor(BOARD_DIMENSION / 2);
    //     let hasCenterTile = this.boardService.board.grid[centerTilePosition][centerTilePosition].letterObject.char !== EMPTY_CHAR;

    //     let hasNeighbour = false;

    //     let x = action.placement.x;
    //     let y = action.placement.y;
    //     let lettersNeeded = '';
    //     let nextPos = 0;

    //     for (let letterIndex = 0; letterIndex < action.word.length; letterIndex++) {
    //         if (nextPos >= BOARD_DIMENSION || nextPos >= BOARD_DIMENSION) {
    //             this.sendErrorMessage(
    //                 'Commande impossible à réaliser : Les lettres déboderont de la grille en ' + String.fromCharCode(y + 'A'.charCodeAt(0)) + ++x,
    //             );
    //             return false;
    //         }

    //         const currentTileChar = this.boardService.board.grid[y][x].letterObject.char.toLowerCase();
    //         const wordCurrentChar = action.word.charAt(letterIndex);

    //         if (currentTileChar === EMPTY_CHAR) {
    //             lettersNeeded = lettersNeeded.concat(wordCurrentChar);
    //         } else {
    //             if (wordCurrentChar.toLowerCase() !== currentTileChar) {
    //                 this.sendErrorMessage(
    //                     `Commande impossible à réaliser : La lettre
    //                     ${wordCurrentChar}
    //                     ne peut être placé en
    //                     ${String.fromCharCode(y + 'A'.charCodeAt(0))}
    //                     ${++x}`,
    //                 );
    //                 return false;
    //             }
    //         }

    //         if (!hasCenterTile) {
    //             if (x === centerTilePosition && y === centerTilePosition) {
    //                 hasCenterTile = true;
    //                 hasNeighbour = true;
    //             }
    //         } else {
    //             if (!hasNeighbour) {
    //                 hasNeighbour = this.boardService.board.hasNeighbour(x, y);
    //             }
    //         }

    //         nextPos = action.placement.direction.charAt(0).toUpperCase() === Direction.Vertical ? ++y : ++x;
    //     }

    //     if (!hasCenterTile) {
    //         this.sendErrorMessage("Commande impossible à réaliser : Aucun mot n'est pas placé sur la tuile centrale");
    //         return false;
    //     }

    //     if (!hasNeighbour) {
    //         this.sendErrorMessage("Commande impossible à réaliser : Le mot placé n'est pas adjacent à un autre mot");
    //         return false;
    //     }

    //     if (!this.hasLettersInRack(action.player.letterRack, lettersNeeded)) {
    //         let message = 'Commande impossible à réaliser : Le joueur ne possède pas toutes les lettres concernées.';
    //         if (this.hasAJoker(action.player.letterRack)) {
    //             message = message.concat(
    //                 ' Vous avez au moins une lettre blanche (*). Utilisez une lettre Majuscule pour la représenter dans votre mot.',
    //             );
    //         }
    //         this.sendErrorMessage(message);
    //         return false;
    //     }
    //     return true;
    // }

    private validateExchangeLetter(action: ExchangeLetter): boolean {
        if (this.gameInfo.numberOfLettersRemaining < RACK_LETTER_COUNT) {
            this.sendErrorMessage(
                'Commande impossible à réaliser : Aucun échange de lettres lorsque la réserve en contient moins de ' + RACK_LETTER_COUNT,
            );
            return false;
        }

        let actionLetters = '';
        for (const letter of action.lettersToExchange) {
            actionLetters += letter.char.toLowerCase();
        }

        if (!this.hasLettersInRack(action.player.letterRack, actionLetters)) {
            this.sendErrorMessage('Commande impossible à réaliser : Le joueur ne possède pas toutes les lettres concernées');
            return false;
        }
        return true;
    }

    private validatePassTurn() {
        return true;
    }

    private hasLettersInRack(rackLetters: Letter[], actionLetters: string): boolean {
        const rackChars = rackLetters.map((value) => value.char);
        const actionChars: string[] = actionLetters.split('');

        const rackCharsOccurences = new Map<string, number>();
        for (const char of rackChars) {
            const lowerChar = char.toLowerCase();
            let occurence = rackCharsOccurences.get(lowerChar);
            if (occurence) {
                occurence++;
                rackCharsOccurences.set(lowerChar, occurence);
            } else {
                rackCharsOccurences.set(lowerChar, 1);
            }
        }

        for (let char of actionChars) {
            let occurence = rackCharsOccurences.get(char);
            if (occurence === undefined || occurence === 0) {
                if (char.toUpperCase() === char) {
                    occurence = rackCharsOccurences.get(JOKER_CHAR);
                    char = JOKER_CHAR;
                    if (occurence === undefined || occurence === 0) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            occurence--;
            rackCharsOccurences.set(char, occurence);
        }
        return true;
    }

    private hasAJoker(letterRack: Letter[]): boolean {
        for (const letter of letterRack) {
            if (letter.char === JOKER_CHAR) {
                return true;
            }
        }
        return false;
    }

    private sendPlaceLetterMessage(action: PlaceLetter) {
        const playerName = action.player.name;
        const placementSettings = action.placement;
        const placementString = placementSettingsToString(placementSettings);
        const word = action.word;
        const content = `${playerName} place le mot ${word} en ${placementString}`;
        this.sendSystemMessage(content);
    }

    private sendExchangeLetterMessage(action: ExchangeLetter) {
        const letters = action.lettersToExchange;
        const playerName = action.player.name;
        const userName = this.gameInfo.user.name;
        if (playerName !== userName) {
            const nLetters = letters.length;
            const playerMessageContent = `${playerName} échange ${nLetters} lettres`;
            this.sendSystemMessage(playerMessageContent);
            return;
        }
        const chars = letters.map((letter) => letter.char);
        const userMessageContent = `${userName} échange les lettres ${chars}`;
        this.sendSystemMessage(userMessageContent);
    }

    private sendPassTurnMessage(action: PassTurn) {
        const playerName = action.player.name;
        const content = `${playerName} passe son tour`;
        this.sendSystemMessage(content);
    }

    private sendErrorMessage(content: string) {
        this.messageService.receiveErrorMessage(content);
    }

    private sendSystemMessage(content: string) {
        this.messageService.receiveSystemMessage(content);
    }
}
