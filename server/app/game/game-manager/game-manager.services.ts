import { NEW_GAME_TIMEOUT } from '@app/constants';
import { LeaderboardService } from '@app/database/leaderboard-service/leaderboard.service';
import { GameActionNotifierService } from '@app/game/game-action-notifier/game-action-notifier.service';
import { GameCompiler } from '@app/game/game-compiler/game-compiler.service';
import { GameCreator } from '@app/game/game-creator/game-creator';
import { Action } from '@app/game/game-logic/actions/action';
import { ActionCompilerService } from '@app/game/game-logic/actions/action-compiler.service';
import { ServerGame } from '@app/game/game-logic/game/server-game';
import { SpecialServerGame } from '@app/game/game-logic/game/special-server-game';
import { EndOfGame, EndOfGameReason } from '@app/game/game-logic/interface/end-of-game.interface';
import { ForfeitedGameSate, GameStateToken } from '@app/game/game-logic/interface/game-state.interface';
import { ObjectiveCreator } from '@app/game/game-logic/objectives/objective-creator/objective-creator.service';
import { OnlineObjectiveConverter } from '@app/game/game-logic/objectives/objectives/objective-converter/online-objective-converter';
import { TransitionObjectives } from '@app/game/game-logic/objectives/objectives/objective-converter/transition-objectives';
import { Player } from '@app/game/game-logic/player/player';
import { PointCalculatorService } from '@app/game/game-logic/point-calculator/point-calculator.service';
import { TimerController } from '@app/game/game-logic/timer/timer-controller.service';
import { TimerGameControl } from '@app/game/game-logic/timer/timer-game-control.interface';
import { BindedSocket } from '@app/game/game-manager/binded-client.interface';
import { GameMode } from '@app/game/game-mode.enum';
import { UserAuth } from '@app/game/game-socket-handler/user-auth.interface';
import { OnlineAction } from '@app/game/online-action.interface';
import { SystemMessagesService } from '@app/messages-service/system-messages-service/system-messages.service';
import { OnlineGameSettings } from '@app/new-game/online-game.interface';
import { Observable, Subject } from 'rxjs';
import { Service } from 'typedi';

export interface PlayerRef {
    gameToken: string;
    player: Player;
}

@Service()
export class GameManagerService {
    activeGames = new Map<string, ServerGame>();
    activePlayers = new Map<string, PlayerRef>(); // gameToken => PlayerRef[]
    linkedClients = new Map<string, BindedSocket[]>(); // gameToken => BindedSocket[]

    private endGame$ = new Subject<EndOfGame>(); // gameToken

    private gameCreator: GameCreator;
    private newGameStateSubject = new Subject<GameStateToken>();
    private forfeitedGameState$ = new Subject<GameStateToken>();

    get lastGameState(): Observable<GameStateToken> {
        return this.forfeitedGameState$;
    }

    get newGameState$(): Observable<GameStateToken> {
        return this.newGameStateSubject;
    }

    get timerControl$(): Observable<TimerGameControl> {
        return this.timerController.timerControl$;
    }

    constructor(
        private pointCalculator: PointCalculatorService,
        private messagesService: SystemMessagesService,
        private actionCompiler: ActionCompilerService,
        private gameCompiler: GameCompiler,
        private timerController: TimerController,
        private gameActionNotifier: GameActionNotifierService,
        private objectiveCreator: ObjectiveCreator,
        private leaderboardService: LeaderboardService,
    ) {
        this.gameCreator = new GameCreator(
            this.pointCalculator,
            this.gameCompiler,
            this.messagesService,
            this.newGameStateSubject,
            this.endGame$,
            this.timerController,
            this.objectiveCreator,
        );

        this.endGame$.subscribe((endOfGame: EndOfGame) => {
            const gameToken = endOfGame.gameToken;
            if (endOfGame.reason === EndOfGameReason.GameEnded) {
                this.updateLeaderboard(endOfGame.players);
            }
            this.deleteGame(gameToken);
        });
    }

    createGame(gameToken: string, onlineGameSettings: OnlineGameSettings) {
        const newServerGame = this.gameCreator.createGame(onlineGameSettings, gameToken);
        this.activeGames.set(gameToken, newServerGame);
        this.linkedClients.set(gameToken, []);
        this.startInactiveGameDestructionTimer(gameToken);
    }

    addPlayerToGame(playerId: string, userAuth: UserAuth) {
        const gameToken = userAuth.gameToken;
        const game = this.activeGames.get(gameToken);
        if (!game) {
            throw Error(`GameToken ${gameToken} is not in active game`);
        }

        const playerName = userAuth.playerName;
        const user = game.players.find((player: Player) => player.name === playerName);
        if (!user) {
            throw Error(`Player ${playerName} not created in ${gameToken}`);
        }

        const linkedClientsInGame = this.linkedClients.get(gameToken);
        if (linkedClientsInGame === undefined) {
            throw Error(`Can't add player, GameToken ${gameToken} is not in active game`);
        }
        const clientFound = linkedClientsInGame.find((client: BindedSocket) => client.name === playerName);
        if (clientFound !== undefined) {
            throw Error(`Can't add player, someone else is already linked to ${gameToken} with ${playerName}`);
        }

        const playerRef = { gameToken, player: user };
        this.activePlayers.set(playerId, playerRef);
        const bindedSocket: BindedSocket = { socketID: playerId, name: playerName };
        linkedClientsInGame.push(bindedSocket);
        if (linkedClientsInGame.length === 2) {
            game.start();
        }
    }

    receivePlayerAction(playerId: string, action: OnlineAction) {
        const playerRef = this.activePlayers.get(playerId);
        if (!playerRef) {
            throw Error(`Player ${playerId} is not active anymore`);
        }
        const player = playerRef.player;
        try {
            const compiledAction = this.actionCompiler.translate(action, player);
            const gameToken = playerRef.gameToken;
            this.notifyAction(compiledAction, gameToken);
            player.play(compiledAction);
        } catch (e) {
            return;
        }
    }

    removePlayerFromGame(playerId: string) {
        const playerRef = this.activePlayers.get(playerId);
        if (!playerRef) {
            return;
        }
        const gameToken = playerRef.gameToken;
        const game = this.activeGames.get(gameToken);
        if (!game) {
            return;
        }
        // TODO replace for sendTransitionGameState() (aka forfeitedGameState)
        this.createTransitionGameState(game);
        this.activePlayers.delete(playerId);

        this.endForfeitedGame(game, playerRef.player.name);
        this.deleteGame(gameToken);
    }

    private startInactiveGameDestructionTimer(gameToken: string) {
        setTimeout(() => {
            const currentLinkedClient = this.linkedClients.get(gameToken);
            if (currentLinkedClient === undefined) {
                this.deleteInactiveGame(gameToken);
                return;
            }

            if (currentLinkedClient.length !== 2) {
                this.deleteInactiveGame(gameToken);
                return;
            }
        }, NEW_GAME_TIMEOUT);
    }

    private notifyAction(action: Action, gameToken: string) {
        const clientsInGame = this.linkedClients.get(gameToken);
        if (!clientsInGame) {
            throw Error(`GameToken ${gameToken} is not in active game`);
        }
        this.gameActionNotifier.notify(action, clientsInGame, gameToken);
    }

    private endGame(game: ServerGame) {
        game.stop();
    }

    private endForfeitedGame(game: ServerGame, playerName: string) {
        game.forfeit(playerName);
    }

    private createTransitionGameState(game: ServerGame) {
        const objConverter = new OnlineObjectiveConverter();
        let translatedObjectives: TransitionObjectives[] = [];
        const gameState = this.gameCompiler.compile(game);
        if (game instanceof SpecialServerGame) {
            translatedObjectives = translatedObjectives.concat(objConverter.convertObjectives(game.publicObjectives, game.privateObjectives));
        }
        const lastGameState: ForfeitedGameSate = {
            activePlayerIndex: gameState.activePlayerIndex,
            consecutivePass: game.consecutivePass,
            grid: gameState.grid,
            isEndOfGame: gameState.isEndOfGame,
            letterBag: game.letterBag.gameLetters,
            players: gameState.players,
            lettersRemaining: gameState.lettersRemaining,
            winnerIndex: gameState.winnerIndex,
            randomBonus: game.randomBonus,
            objectives: translatedObjectives,
        };
        const lastGameToken: GameStateToken = { gameState: lastGameState, gameToken: game.gameToken };
        this.forfeitedGameState$.next(lastGameToken);
    }

    private deleteInactiveGame(gameToken: string) {
        const serverGame = this.activeGames.get(gameToken);
        if (serverGame) {
            this.endGame(serverGame);
        }
        this.deleteGame(gameToken);
    }

    private deleteGame(gameToken: string) {
        this.activeGames.delete(gameToken);
        this.linkedClients.delete(gameToken);
    }

    private updateLeaderboard(players: Player[]) {
        for (const player of players) {
            const score = { name: player.name, point: player.points };
            this.leaderboardService.updateLeaderboard(score, GameMode.Classic);
        }
    }
}
