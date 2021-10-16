import { Component } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NewSoloGameFormComponent } from '@app/components/new-solo-game-form/new-solo-game-form.component';
import { GameManagerService } from '@app/GameLogic/game/games/game-manager.service';
import { GameSettings } from '@app/GameLogic/game/games/game-settings.interface';
import { OnlineGameInitService } from '@app/modeMulti/online-game-init.service';

@Component({
    selector: 'app-classic-game',
    templateUrl: './classic-game.component.html',
    styleUrls: ['./classic-game.component.scss'],
})
export class ClassicGameComponent {
    gameSettings: GameSettings;

    constructor(
        private router: Router,
        private gameManager: GameManagerService,
        private dialog: MatDialog,
        private socketHandler: OnlineGameInitService,
    ) {}
    openSoloGameForm() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.disableClose = true;
        dialogConfig.minWidth = 60;

        const dialogRef = this.dialog.open(NewSoloGameFormComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((result) => {
            try {
                this.gameSettings = result;
                this.startSoloGame();
                // eslint-disable-next-line no-empty
            } catch (e) {}
            dialogRef.close();
        });
    }

    openMultiGameForm() {
        this.socketHandler.connect();
        const fakeGame = {
            timePerTurn: 60000,
            playerName: 'player',
            randomBonus: false,
        };
        this.socketHandler.createGameMulti(fakeGame);

        console.log('Nouvelle Partie MultiJoueurs');
    }

    startSoloGame() {
        this.gameManager.createGame(this.gameSettings);
        this.router.navigate(['/game']);
    }
}
