/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { GameCompiler } from '@app/game/game-compiler/game-compiler.service';
import { Action } from '@app/game/game-logic/actions/action';
import { SpecialServerGame } from '@app/game/game-logic/game/special-server-game';
import { GameStateToken } from '@app/game/game-logic/interface/game-state.interface';
import { ObjectiveCreator } from '@app/game/game-logic/objectives/objective-creator/objective-creator.service';
import { Objective } from '@app/game/game-logic/objectives/objectives/objective';
import { ObjectiveUpdateParams } from '@app/game/game-logic/objectives/objectives/objective-update-params.interface';
import { Player } from '@app/game/game-logic/player/player';
import { PointCalculatorService } from '@app/game/game-logic/point-calculator/point-calculator.service';
import { TimerController } from '@app/game/game-logic/timer/timer-controller.service';
import { SystemMessagesService } from '@app/messages-service/system-messages-service/system-messages.service';
import { createSinonStubInstance } from '@app/test.util';
import { expect } from 'chai';
import { Subject } from 'rxjs';

const TIME_PER_TURN = 10;

class MockAction extends Action {
    protected perform(): void {
        return;
    }
}
class MockPlayer extends Player {
    setActive(): void {
        return;
    }
}

describe('SpecialServerGame', () => {
    let game: SpecialServerGame;
    const randomBonus = false;
    const pointCalculatorStub = createSinonStubInstance<PointCalculatorService>(PointCalculatorService);
    const gameCompilerStub = createSinonStubInstance<GameCompiler>(GameCompiler);
    const systemMessagesServiceStub = createSinonStubInstance<SystemMessagesService>(SystemMessagesService);
    const timerControllerStub = createSinonStubInstance<TimerController>(TimerController);
    const objectiveCreatorStub = createSinonStubInstance<ObjectiveCreator>(ObjectiveCreator);
    const newGameStateSubject = new Subject<GameStateToken>();
    const endGameSubject = new Subject<string>();
    const gameToken = 'gameToken';
    const p1 = new MockPlayer('p1');
    const p2 = new MockPlayer('p2');

    beforeEach(() => {
        game = new SpecialServerGame(
            timerControllerStub,
            randomBonus,
            TIME_PER_TURN,
            gameToken,
            pointCalculatorStub,
            gameCompilerStub,
            systemMessagesServiceStub,
            newGameStateSubject,
            endGameSubject,
            objectiveCreatorStub,
        );
        game.players = [p1, p2];
    });

    it('should be created', () => {
        expect(game).to.be.equal(true);
    });

    it('should allocate private and public objectives', () => {
        game.allocateObjectives();
        expect(game.publicObjectives.length).to.be.equal(ObjectiveCreator.publicObjectiveCount);
        for (const player of game.players) {
            expect(game.privateObjectives.get(player.name)?.length).to.be.equal(ObjectiveCreator.privateObjectiveCount);
        }
    });

    it('should properly update private and public objectives', () => {
        game.allocateObjectives();
        const action = new MockAction(p1);
        const params: ObjectiveUpdateParams = {
            previousGrid: [],
            currentGrid: [],
            lettersToPlace: [],
            formedWords: [],
            affectedCoords: [],
        };
        game.updateObjectives(action, params);

        for (const publicObjective of game.publicObjectives) {
            expect(publicObjective.isCompleted).to.be.equal(true);
        }
        const p1Objective = (game.privateObjectives.get(p1.name) as Objective[])[0];
        expect(p1Objective.isCompleted).to.be.equal(true);
        const p2Objective = (game.privateObjectives.get(p2.name) as Objective[])[0];
        expect(p2Objective.isCompleted).to.be.equal(false);
    });
});
