/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-vars */
import { NewOnlineGameService } from '@app/game-manager/new-online-game.service';
import { createSinonStubInstance, StubbedClass } from '@app/test.util';
import { expect } from 'chai';
import { createServer, Server } from 'http';
import { beforeEach } from 'mocha';
import { AddressInfo } from 'net';
import { Socket } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { NewOnlineGameSocketHandler } from './new-online-game-manager';

describe('New Online Game Service', () => {
    let handler: NewOnlineGameSocketHandler;
    let clientSocket: ClientSocket;
    let serverSocket: Socket;
    let port: number;
    let httpServer: Server;
    let newOnlineGameService: StubbedClass<NewOnlineGameService>;

    before((done) => {
        httpServer = createServer();
        httpServer.listen(() => {
            process.setMaxListeners(0);
            port = (httpServer.address() as AddressInfo).port;
            // no warning but slow
            newOnlineGameService = createSinonStubInstance<NewOnlineGameService>(NewOnlineGameService);
            handler = new NewOnlineGameSocketHandler(httpServer, newOnlineGameService);
            handler.newGameHandler();
            handler.ioServer.on('connection', (socket: Socket) => {
                serverSocket = socket;
            });
            done();
        });
    });
    beforeEach((done) => {
        clientSocket = Client(`http://localhost:${port}`, { path: '/newGame' });
        clientSocket.on('connect', done);
    });
    afterEach(() => {
        clientSocket.close();
    });

    after(() => {
        httpServer.close();
    });

    it('should create pendingGame', (done) => {
        const gameSettings = { playerName: 'Max', randomBonus: true, timePerTurn: 60000 };
        serverSocket.on('createGame', () => {
            expect(newOnlineGameService.createPendingGame.calledWith(gameSettings)).to.be.true;
            done();
        });
        clientSocket.emit('createGame', gameSettings);
    });

    it('should receive pendingGameId on create', (done) => {
        const id = 'abc';
        newOnlineGameService.createPendingGame.returns(id);
        const gameSettings = { playerName: 'Max', randomBonus: true, timePerTurn: 60000 };
        clientSocket.on('pendingGameId', (pendingId: string) => {
            expect(pendingId).to.deep.equal(id);
            done();
        });
        clientSocket.emit('createGame', gameSettings);
    });

    it('should throw error if game settings are invalid', (done) => {
        const gameSettings = { playerName: false, randomBonus: true, timePerTurn: 60000 };
        clientSocket.on('error', (errorContent: string) => {
            expect(errorContent).to.equal('Cannot create game, invalid GameSettings');
            done();
        });
        clientSocket.emit('createGame', gameSettings);
    });

    it('should delete pending game if client disconnect', (done) => {
        const gameSettings = { playerName: 'name', randomBonus: true, timePerTurn: 60000 };
        clientSocket.emit('createGame', gameSettings);
        serverSocket.on('disconnect', () => {
            expect(newOnlineGameService.deletePendingGame.called).to.be.true;
            done();
        });
        clientSocket.close();
    });

    it('should throw error if parameters are invalid', (done) => {
        const id = true;
        const playerName = 'abc';
        clientSocket.on('error', (errorContent: string) => {
            expect(errorContent).to.equal('Cannot join game, invalid GameSettings');
            done();
        });
        clientSocket.emit('joinGame', id, playerName);
    });

    it('should throw error if player try to join a game not active', (done) => {
        newOnlineGameService.joinPendingGame.returns(undefined);
        const id = 'aa';
        const playerName = 'abc';
        clientSocket.on('error', (errorContent: string) => {
            expect(errorContent).to.equal('Cannot join game, game does not exist anymore');
            done();
        });
        clientSocket.emit('joinGame', id, playerName);
    });

    it('should send gameToken to players on joinGame', (done) => {
        newOnlineGameService.createPendingGame.returns('a');
        newOnlineGameService.joinPendingGame.returns('token');

        const clientSocket2 = Client(`http://localhost:${port}`, { path: '/newGame', multiplex: false });
        const gameSettings = { playerName: 'name', randomBonus: true, timePerTurn: 60000 };
        const playerName = 'abc';
        let id = '';
        let gameTokenPlayer1 = '';
        clientSocket2.emit('createGame', gameSettings);
        clientSocket2.on('pendingGameId', (idGame: string) => {
            id = idGame;
            clientSocket.emit('joinGame', id, playerName);
        });
        clientSocket.on('gameJoined', (gameToken) => {
            gameTokenPlayer1 = gameToken;
        });
        clientSocket2.on('gameJoined', (gameToken) => {
            expect(gameToken).to.equal(gameTokenPlayer1);
            done();
            clientSocket2.close();
        });
    });
});
