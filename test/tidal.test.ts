import { Ghci } from '../src/ghci';
import { Tidal } from '../src/tidal';
import { Logger } from '../src/logging';
import * as TypeMoq from "typemoq";

suite("Tidal", () => {
    
    [true, false].forEach(withEcho => {
        test(`Single line sent to Tidal is passed to GHCi, echo=${withEcho}`, async () => {
            let mockedLogger = TypeMoq.Mock.ofType<Logger>();
            let mockedGhci = TypeMoq.Mock.ofType<Ghci>();
            let tidal: Tidal = new Tidal(mockedLogger.object, mockedGhci.object, null, false);
            tidal.tidalBooted = true;

            mockedGhci.setup(ghci => ghci.writeLn(':{')).verifiable(TypeMoq.Times.once());
            mockedGhci.setup(ghci => ghci.writeLn('d1 $ sound "bd"')).verifiable(TypeMoq.Times.once());
            mockedGhci.setup(ghci => ghci.writeLn(':}')).verifiable(TypeMoq.Times.once());

            if(withEcho){
                mockedLogger.setup(logger => logger.log('d1 $ sound "bd"')).verifiable(TypeMoq.Times.once());
            }

            return tidal.sendTidalExpression('d1 $ sound "bd"').then(() => {
                mockedGhci.verifyAll();
            });
        });
    });

    [true, false].forEach(withEcho => {
        ['\r\n', '\n'].forEach(function(lineEnding) {
            test(`Multiple lines (separator: ${lineEnding}) sent to Tidal are passed to GHCi, echo=${withEcho}`, async () => {
                let mockedLogger = TypeMoq.Mock.ofType<Logger>();
                let mockedGhci = TypeMoq.Mock.ofType<Ghci>();
                let tidal: Tidal = new Tidal(mockedLogger.object, mockedGhci.object, null, false);
                tidal.tidalBooted = true;

                mockedGhci.setup(ghci => ghci.writeLn(':{')).verifiable(TypeMoq.Times.once());
                mockedGhci.setup(ghci => ghci.writeLn('d1 $')).verifiable(TypeMoq.Times.once());
                mockedGhci.setup(ghci => ghci.writeLn('sound "bd"')).verifiable(TypeMoq.Times.once());
                mockedGhci.setup(ghci => ghci.writeLn(':}')).verifiable(TypeMoq.Times.once());

                if(withEcho){
                    mockedLogger.setup(logger => logger.log('d1 $')).verifiable(TypeMoq.Times.once());
                    mockedLogger.setup(logger => logger.log('sound "bd"')).verifiable(TypeMoq.Times.once());
                }

                return tidal.sendTidalExpression(`d1 $${lineEnding}sound "bd"`).then(() => {
                    mockedGhci.verifyAll();
                });
            });
        });
    });
});