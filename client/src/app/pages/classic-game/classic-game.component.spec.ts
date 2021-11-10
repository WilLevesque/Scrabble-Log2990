import { CommonModule, LocationStrategy } from '@angular/common';
import { MockLocationStrategy } from '@angular/common/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatToolbar } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HeaderBarComponent } from '@app/components/header-bar/header-bar.component';
import { NewOnlineGameFormComponent } from '@app/components/modals/new-online-game-form/new-online-game-form.component';
import { NewSoloGameFormComponent } from '@app/components/modals/new-solo-game-form/new-solo-game-form.component';
import { WaitingForPlayerComponent } from '@app/components/modals/waiting-for-player/waiting-for-player.component';
import { GameManagerService } from '@app/game-logic/game/games/game-manager/game-manager.service';
import { routes } from '@app/modules/app-routing.module';
import { ClassicGameComponent } from '@app/pages/classic-game/classic-game.component';
import { OnlineGameSettings } from '@app/socket-handler/interfaces/game-settings-multi.interface';
import { NewOnlineGameSocketHandler } from '@app/socket-handler/new-online-game-socket-handler/new-online-game-socket-handler.service';
import { Observable, of, Subject } from 'rxjs';

describe('ClassicGameComponent', () => {
    let component: ClassicGameComponent;
    let fixture: ComponentFixture<ClassicGameComponent>;
    const mockIsDisconnect$ = new Subject<boolean>();
    const mockStartGame$ = new Subject<OnlineGameSettings>();
    let matDialog: jasmine.SpyObj<MatDialog>;
    let onlineSocketHandlerSpy: jasmine.SpyObj<NewOnlineGameSocketHandler>;
    let gameManagerSpy: jasmine.SpyObj<GameManagerService>;
    let router: Router;

    beforeEach(async () => {
        matDialog = jasmine.createSpyObj('MatDialog', ['open']);
        onlineSocketHandlerSpy = jasmine.createSpyObj(
            'NewOnlineGameSocketHandler',
            ['createGameMulti', 'listenForPendingGames', 'disconnectSocket', 'joinPendingGames', 'resetGameToken'],
            ['isDisconnected$', 'startGame$'],
        );
        gameManagerSpy = jasmine.createSpyObj('GameManagerService', ['joinOnlineGame', 'createGame']);
        await TestBed.configureTestingModule({
            declarations: [ClassicGameComponent, HeaderBarComponent, MatToolbar],
            imports: [RouterTestingModule.withRoutes(routes), MatDialogModule, BrowserAnimationsModule, CommonModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {} },
                { provide: MatDialog, useValue: matDialog },
                { provide: NewOnlineGameSocketHandler, useValue: onlineSocketHandlerSpy },
                { provide: GameManagerService, useValue: gameManagerSpy },
                { provide: LocationStrategy, useClass: MockLocationStrategy },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();

        (Object.getOwnPropertyDescriptor(onlineSocketHandlerSpy, 'isDisconnected$')?.get as jasmine.Spy<() => Observable<boolean>>).and.returnValue(
            mockIsDisconnect$,
        );
        (
            Object.getOwnPropertyDescriptor(onlineSocketHandlerSpy, 'startGame$')?.get as jasmine.Spy<() => Observable<OnlineGameSettings>>
        ).and.returnValue(mockStartGame$);

        fixture = TestBed.createComponent(ClassicGameComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        router = TestBed.inject(Router);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('dialog should set game setting and start game', () => {
        spyOn(component, 'startSoloGame');
        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of({
                    botDifficulty: 'easy',
                    playerName: 'Sam',
                    timePerTurn: 3000,
                    randomBonus: false,
                });
            },
            close: () => {
                return;
            },
        } as MatDialogRef<NewSoloGameFormComponent>);
        component.openSoloGameForm();
        expect(component.gameSettings).toBeDefined();
        expect(component.startSoloGame).toHaveBeenCalled();
    });

    it('dialog should not set game setting and start game if form is undefined', () => {
        spyOn(component, 'startSoloGame');
        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of(undefined);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<NewSoloGameFormComponent>);
        component.openSoloGameForm();
        expect(component.gameSettings).toBeUndefined();
        expect(component.startSoloGame).not.toHaveBeenCalled();
    });

    it('button partie solo should call openSoloGameForm', () => {
        spyOn(component, 'openSoloGameForm');
        const el = fixture.nativeElement as HTMLElement;
        const button = el.querySelector('button');
        button?.click();
        expect(component.openSoloGameForm).toHaveBeenCalled();
    });

    it('start solo game should create a game', () => {
        spyOn(router, 'navigate');
        component.startSoloGame();
        expect(gameManagerSpy.createGame).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalled();
    });

    it('Creer partie multijoueur should call openMultiGameForm', () => {
        spyOn(component, 'openWaitingForPlayer');
        const gameSettings = {
            playerName: 'Sam',
            timePerTurn: 3000,
            randomBonus: false,
        };

        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of(gameSettings);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<NewOnlineGameFormComponent>);
        component.openMultiGameForm();
        expect(matDialog.open).toHaveBeenCalled();
        expect(onlineSocketHandlerSpy.createGameMulti).toHaveBeenCalledOnceWith(gameSettings);
        expect(component.openWaitingForPlayer).toHaveBeenCalledWith(gameSettings.playerName);
    });

    it('Creer partie multijoueur should call openMultiGameForm and return if form is undefined', () => {
        spyOn(component, 'openWaitingForPlayer');
        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of(undefined);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);
        component.openMultiGameForm();
        expect(matDialog.open).toHaveBeenCalled();
        expect(component.gameSettings).toBeUndefined();
        expect(onlineSocketHandlerSpy.createGameMulti).not.toHaveBeenCalled();
        expect(component.openWaitingForPlayer).not.toHaveBeenCalled();
    });

    it('openWaitingForPlayer should start solo game if bot difficulty is return', () => {
        spyOn(component, 'startSoloGame');
        component.gameSettings = {
            playerName: 'Sam',
            botDifficulty: '',
            timePerTurn: 3000,
            randomBonus: false,
        };

        matDialog.open.and.returnValue({
            afterOpened: () => {
                return of(undefined);
            },
            afterClosed: () => {
                return of('easy');
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);
        component.openWaitingForPlayer('Sam');
        const soloGameSettings = component.gameSettings;
        soloGameSettings.botDifficulty = 'easy';
        expect(matDialog.open).toHaveBeenCalled();
        expect(component.gameSettings).toEqual(soloGameSettings);
        expect(onlineSocketHandlerSpy.disconnectSocket).toHaveBeenCalled();
        expect(component.startSoloGame).toHaveBeenCalled();
    });

    it('openWaitingForPlayer should disconnectSocket if player is disconnected from server and should not startOnlineGame', () => {
        spyOn(component, 'startOnlineGame');
        component.gameSettings = {
            playerName: 'Sam',
            botDifficulty: '',
            timePerTurn: 3000,
            randomBonus: false,
        };
        matDialog.open.and.returnValue({
            afterOpened: () => {
                return of(undefined);
            },
            afterClosed: () => {
                return of(undefined);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);
        component.openWaitingForPlayer('Sam');
        mockIsDisconnect$.next(true);
        mockStartGame$.next(undefined);
        expect(component.startOnlineGame).not.toHaveBeenCalled();
        expect(onlineSocketHandlerSpy.disconnectSocket).toHaveBeenCalled();
    });

    it('openWaitingForPlayer should start onlineGame', () => {
        spyOn(component, 'openWaitingForPlayer').and.callThrough();
        spyOn(component, 'startOnlineGame');
        const gameSettings = {
            id: 'abc',
            playerName: 'Sam',
            timePerTurn: 3000,
            randomBonus: false,
        };
        matDialog.open.and.returnValue({
            afterOpened: () => {
                return of(undefined);
            },
            afterClosed: () => {
                return of(undefined);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);

        component.openWaitingForPlayer('Sam');
        mockIsDisconnect$.next(false);
        mockStartGame$.next(gameSettings);
        expect(component.startOnlineGame).toHaveBeenCalledWith('Sam', gameSettings);
        component.openWaitingForPlayer('Sam');
        expect(component.openWaitingForPlayer).toHaveBeenCalledTimes(2);
    });

    it('openPendingGames should open dialog unsubscribe and if name start onlineGame', () => {
        spyOn(component, 'openPendingGames').and.callThrough();
        spyOn(component, 'startOnlineGame').and.callThrough();
        const onlineGameSettings = {
            id: 'abc',
            playerName: 'Sam',
            timePerTurn: 3000,
            randomBonus: false,
        };
        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of('name');
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);
        component.openPendingGames();
        mockStartGame$.next(onlineGameSettings);
        expect(matDialog.open).toHaveBeenCalled();
        expect(gameManagerSpy.joinOnlineGame).toHaveBeenCalled();
        expect(component.startOnlineGame).toHaveBeenCalledWith('name', onlineGameSettings);
        component.openPendingGames();
        expect(component.openPendingGames).toHaveBeenCalledTimes(2);
    });

    it('openPendingGames should open dialog and return if name was not provided', () => {
        spyOn(component, 'startOnlineGame');
        matDialog.open.and.returnValue({
            afterClosed: () => {
                return of('name');
            },
            close: () => {
                return;
            },
        } as MatDialogRef<WaitingForPlayerComponent>);
        component.openPendingGames();
        mockStartGame$.next(undefined);
        expect(matDialog.open).toHaveBeenCalled();
        expect(component.startOnlineGame).not.toHaveBeenCalled();
    });
});
