import { GameSettingsMultiUI } from '@app/game-manager/game-settings-multi.interface';
import { NewOnlineGameService } from '@app/game-manager/new-online-game.service';
import * as http from 'http';
import { Server } from 'socket.io';

const pendingGames = 'pendingGames';
const createGame = 'createGame';
const joinGame = 'joinGame';
const gameJoined = 'gameJoined';
const pendingGameId = 'pendingGameId';

export class NewOnlineGameSocketHandler {
    private ioServer: Server;

    constructor(server: http.Server, private newOnlineGameService: NewOnlineGameService) {
        this.ioServer = new Server(server, {
            path: '/newGame',
            cors: { origin: '*', methods: ['GET', 'POST'] },
        });
    }

    newGameHandler(): void {
        this.ioServer.on('connection', (socket) => {
            let gameId: string;
            socket.emit(pendingGames, this.newOnlineGameService.getPendingGames());

            socket.on(createGame, (gameSetting: GameSettingsMultiUI) => {
                if (this.isGameSettings(gameSetting)) {
                    gameId = this.newOnlineGameService.createPendingGame(gameSetting);
                    socket.emit(pendingGameId, gameId);
                    socket.join(gameId);
                    this.emitPendingGamesToAll();
                } // TODO: throw Error
            });

            socket.on(joinGame, (id: string, name: string) => {
                if (typeof id === 'string' && typeof name === 'string') {
                    const gameToken = this.newOnlineGameService.joinPendingGame(id, name);
                    if (gameToken !== undefined) {
                        gameId = id;
                        socket.join(gameId);
                        this.sendGameToken(gameId, gameToken);
                        this.emitPendingGamesToAll();
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('disconnected');
                if (gameId === undefined) {
                    return;
                }
                this.newOnlineGameService.deletePendingGame(gameId);
                this.emitPendingGamesToAll();
            });
        });
    }

    private sendGameToken(gameId: string, gameToken: string) {
        this.ioServer.to(gameId).emit(gameJoined, gameToken);
    }

    private emitPendingGamesToAll() {
        this.ioServer.sockets.emit(pendingGames, this.newOnlineGameService.getPendingGames());
    }
    // TODO mettre dans un fichier UTIls
    private isGameSettings(obj: unknown): obj is GameSettingsMultiUI {
        return (
            (obj as GameSettingsMultiUI).playerName !== undefined &&
            typeof (obj as GameSettingsMultiUI).playerName === 'string' &&
            (obj as GameSettingsMultiUI).opponentName === undefined &&
            (obj as GameSettingsMultiUI).randomBonus !== undefined &&
            typeof (obj as GameSettingsMultiUI).randomBonus === 'boolean' &&
            (obj as GameSettingsMultiUI).timePerTurn !== undefined &&
            typeof (obj as GameSettingsMultiUI).timePerTurn === 'number'
        );
    }
}
