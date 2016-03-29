'use strict';

import { exec, spawn, ChildProcess } from 'child_process';
import { IService } from '@sane/service';
import { EventEmitter } from 'events';
let shellescape = require('shell-escape');

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export interface Options {
    shellEscape?: boolean; // Defaults to true; escape all arguments
    shell?: boolean | string;
    cwd?: string;
    env?: string[][];
    uid?: number;
    gid?: number;
}

export interface CmdOptions extends Options {
    checkError?: boolean; // Defaults to true; fail if stderr has output
    maxBuffer?: number;
    encoding?: string;
    killSignal?: string;
    timeout?: number;
}

export function cmd(cmd: string[], options?: CmdOptions): Promise<string> {
    const defaultOptions = {
        shellEscape: true,
        maxBuffer: DEFAULT_MAX_BUFFER
    };
    options = <CmdOptions> Object.assign({}, defaultOptions, options);
    let cmdStr = options.shellEscape ? shellescape(cmd) : cmd.join(' ');
    return new Promise<string>((resolve, reject) => {
        /* tslint:disable:no-unused-variable */
        let child = exec(cmdStr, options,
            (err: Error, stdout: Buffer, stderr: Buffer) => {
                if(err) {  // By default, exit code !== 0 is an error
                    reject(err);
                } else if(typeof options.checkError !== 'undefined' && stderr.length !== 0) {
                    reject('command failed: ' + stderr.toString('utf8'));
                } else {
                    resolve(stdout.toString('utf8'));
                }
            });
    });
}

export interface DaemonOptions extends Options {
    emitErrors?: boolean;
    killSignal?: string;
}

const DEFAULT_DAEMON_OPTIONS = {
    shellEscape: true,
    emitErrors: false,
    killSignal: 'SIGTERM',
    stdio: 'ignore'
};

/*
   This is a command which implements the IService interface from @sane/service.
   You run the command just for its side-effects (e.g. not its stdin, stderr or stdout) and
   need to control the lifetime. Quite good for test suites, where you want to run some
   external command for the duration of your test suite and stop it at the end.
 */

export class Daemon extends EventEmitter implements IService {
    cmd: string[];
    options: DaemonOptions;
    childProc: ChildProcess;
    error: any;
    errHandler: Function;
    exitHandler: Function;

    constructor(cmd: string[], options?: DaemonOptions) {
        super();
        this.options = Object.assign({}, DEFAULT_DAEMON_OPTIONS, options);
        if(this.options.shellEscape !== false) {
            cmd = cmd.map(x => shellescape([x]));
        }
        this.cmd = cmd;
        this.errHandler = (err: any) => {
            this.error = err;
            if(this.options.emitErrors !== false) {
                this.emit('error', this.error);
            }
        };
        this.exitHandler = (code: number, signal: string) => {
            if(!this.error) {
                this.error = new Error(`Unexpected exit, code: ${code}, signal: ${signal}`);
                if(this.options.emitErrors !== false) {
                    this.emit('error', this.error);
                }
            }
        };
    }
    async start(): Promise<void> {
        this.childProc = spawn(this.cmd[0], this.cmd.slice(1), this.options);
        this.childProc.addListener('error', this.errHandler);
        this.childProc.addListener('exit', this.exitHandler);
    }
    async stop(): Promise<void> {
        this.childProc.removeListener('error', this.errHandler);
        this.childProc.removeListener('exit', this.exitHandler);
        if(this.error) {
            throw this.error;
        }
        return new Promise<void>((resolve, reject) => {
            this.childProc.once('error', (err: any) => reject(err));
            this.childProc.once('exit', () => resolve());
            this.childProc.kill(this.options.killSignal);
        });
    }
}
