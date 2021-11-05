import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Sort } from '@angular/material/sort';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JoinOnlineGameComponent } from '@app/components/modals/join-online-game/join-online-game.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { OnlineGameSettings } from '@app/socket-handler/mode-multi/interface/game-settings-multi.interface';
import { OnlineGameInitService } from '@app/socket-handler/mode-multi/online-game-init.service';
import { Observable, of, Subject } from 'rxjs';
import { PendingGamesComponent } from './pending-games.component';

const mockDialogRef = {
    close: jasmine.createSpy('close').and.returnValue(() => {
        return;
    }),
};

const mockLiveAnnouncer = {
    announce: jasmine.createSpy('announce'),
};

describe('PendingGamesComponent', () => {
    let component: PendingGamesComponent;
    let fixture: ComponentFixture<PendingGamesComponent>;
    let onlineSocketHandlerSpy: jasmine.SpyObj<'OnlineGameInitService'>;
    const testPendingGames$ = new Subject<OnlineGameSettings[]>();
    let matDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(
        waitForAsync(() => {
            matDialog = jasmine.createSpyObj('MatDialog', ['open']);
            onlineSocketHandlerSpy = jasmine.createSpyObj(
                'OnlineGameInitService',
                ['createGameMulti', 'listenForPendingGames', 'disconnect', 'joinPendingGames'],
                ['pendingGames$'],
            );

            TestBed.configureTestingModule({
                imports: [AppMaterialModule, BrowserAnimationsModule, CommonModule],

                providers: [
                    { provide: MAT_DIALOG_DATA, useValue: {} },
                    { provide: MatDialogRef, useValue: mockDialogRef },
                    { provide: MatDialog, useValue: matDialog },
                    { provide: OnlineGameInitService, useValue: onlineSocketHandlerSpy },
                    { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
                ],
                declarations: [PendingGamesComponent],
            }).compileComponents();
            (
                Object.getOwnPropertyDescriptor(onlineSocketHandlerSpy, 'pendingGames$')?.get as jasmine.Spy<() => Observable<OnlineGameSettings[]>>
            ).and.returnValue(testPendingGames$);
        }),
    );

    beforeEach(async () => {
        fixture = TestBed.createComponent(PendingGamesComponent);
        component = fixture.componentInstance;
        component.ngOnInit();
        component.ngAfterViewInit();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set data in table to gameSettings', () => {
        const pendingGames = [
            { id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 },
            { id: '4', playerName: 'Jerry', randomBonus: false, timePerTurn: 65000 },
        ];

        testPendingGames$.next(pendingGames);
        expect(component.dataSource.data).toEqual(pendingGames);
    });

    it('should set selected row to row', () => {
        const pendingGames = [
            { id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 },
            { id: '4', playerName: 'Jerry', randomBonus: false, timePerTurn: 65000 },
        ];

        testPendingGames$.next(pendingGames);
        component.setSelectedRow(pendingGames[0]);
        expect(component.selectedRow).toBe(pendingGames[0]);

        component.setSelectedRow(pendingGames[0]);
        expect(component.selectedRow).toBeUndefined();

        expect(component.isSelectedRow(pendingGames[0])).toBeFalse();
    });

    it('cancel should close the dialog', () => {
        component.cancel();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('JoinGame should not be responsive if game not selected', () => {
        const dom = fixture.nativeElement as HTMLElement;
        const buttons = dom.querySelectorAll('button');
        const spy = spyOn(component, 'joinGame');
        buttons[1].click();
        expect(spy.calls.count()).toBe(0);
    });

    it('JoinGame should open JoinOnline dialog and get name value', () => {
        matDialog.open.and.returnValue({
            beforeClosed: () => {
                return of('name');
            },
            close: () => {
                return;
            },
        } as MatDialogRef<JoinOnlineGameComponent>);
        component.setSelectedRow({ id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 });
        component.joinGame();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('JoinGameDialog should close if name was not returned', () => {
        matDialog.open.and.returnValue({
            beforeClosed: () => {
                return of(undefined);
            },
            close: () => {
                return;
            },
        } as MatDialogRef<JoinOnlineGameComponent>);
        component.setSelectedRow({ id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 });
        component.joinGame();
        expect(matDialog.open).toHaveBeenCalled();
    });

    it('should be an empty table ', () => {
        const dom = fixture.nativeElement as HTMLElement;
        const tables = dom.querySelectorAll('tr');
        expect(tables.length).toBe(2);

        const numberHeaders = 4;
        const tableGames = tables[0];
        expect(tableGames.cells.length).toBe(numberHeaders);

        const tableAucunePartie = tables[1];
        expect(tableAucunePartie.cells[0].innerHTML).toBe('Aucune partie en attente');
    });

    it('should be a full table ', () => {
        testPendingGames$.next([
            { id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 },
            { id: '4', playerName: 'Jerry', randomBonus: false, timePerTurn: 65000 },
        ]);
        const tableLength = 4;
        const dom = fixture.nativeElement as HTMLElement;
        const tables = dom.querySelectorAll('tr');
        expect(tables.length).toBe(tableLength);
    });

    it('should sort table ', () => {
        testPendingGames$.next([
            { id: '4', playerName: 'Jerry', randomBonus: false, timePerTurn: 65000 },
            { id: '1', playerName: 'Tom', randomBonus: true, timePerTurn: 60000 },
        ]);
        fixture.detectChanges();
        const dom = fixture.debugElement.nativeElement;
        const tableNotSort = dom.querySelectorAll('tr');
        expect(tableNotSort[1].cells[0].innerHTML).toBe(' 4 ');

        component.dataSource.sort = component.tableSort;
        const sortState: Sort = { active: 'Id', direction: 'asc' };
        component.tableSort.active = sortState.active;
        component.tableSort.direction = sortState.direction;
        component.tableSort.sortChange.emit(sortState);
        component.announceSortChange(sortState);
        expect(mockLiveAnnouncer.announce).toHaveBeenCalled();
    });
});