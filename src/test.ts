'use strict';

import * as assert from 'assert';
import { cmd, Daemon } from './index';

function sleep(ms: number): Promise<void> {
    return new Promise<void>(r => setTimeout(r, ms));
}

describe('@sane/command', () => {
    describe('cmd', () => {
        it('should run a cmd', async () => {
            let s = await cmd(['ls', '-d', '/']);
            assert.equal(s, '/\n');
        });
        it('should fail if cmd does not exist', async () => {
            let err: any = null;
            try {
                await cmd(['should_not_exist_really']);
            } catch (e) {
                err = e; /* Expect to reach here */
            }
            assert.notEqual(err, null);
        });
        it('should escape shell arguments', async () => {
            let err: any = null;
            try {
                await cmd(['ls', '/t*']);
            } catch(e) {
                err = e; /* Expect to reach here */
            }
            assert.notEqual(err, null);
        });
    });
    describe('Daemon', () => {
        it('should run stuff', async () => {
            let d = new Daemon(['sleep', '3600']);
            await d.start();
            await sleep(100);
            await d.stop();
        });
        it('should fail on stop() with emitErrors disabled', async () => {
            let err: any = null,
                d = new Daemon(['doesnotexist']);
                await d.start();
            try {
                await d.stop();
            } catch (e) {
                err = e;
            }
            assert.notEqual(err, null);
        });
        it('should emit errors when emitErrors enabled', async () => {
            let err: any = null,
                d = new Daemon(['doesnotexist'], { emitErrors: true });
            d.on('error', (e: any) => err = e);
            await d.start();
            assert.notEqual(err, null);
        });
    });
});
