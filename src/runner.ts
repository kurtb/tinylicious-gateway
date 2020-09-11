/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Deferred } from "@fluidframework/common-utils";
import {
    IWebServer,
    IWebServerFactory,
    IHttpServer,
} from "@fluidframework/server-services-core";
import * as utils from "@fluidframework/server-services-utils";
import { Provider } from "nconf";
import winston from "winston";
import * as app from "./app";

export class GatewayRunner implements utils.IRunner {
    private server?: IWebServer;
    private runningDeferred: Deferred<void> | undefined;

    constructor(
        private readonly serverFactory: IWebServerFactory,
        private readonly config: Provider,
        private readonly port: string | number,
    ) {
    }

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public start(): Promise<void> {
        this.runningDeferred = new Deferred<void>();

        // Create the HTTP server and attach alfred to it
        const gateway = app.create(this.config);
        gateway.set("port", this.port);

        this.server = this.serverFactory.create(gateway);
        const httpServer = this.server.httpServer;

        // Listen on provided port, on all network interfaces.
        httpServer.listen(this.port);
        httpServer.on("error", (error) => this.onError(error));
        httpServer.on("listening", () => this.onListening(httpServer));

        return this.runningDeferred.promise;
    }

    public async stop(): Promise<void> {
        if (this.server === undefined) {
            return;
        }

        // Close the underlying server and then resolve the runner once closed
        this.server.close().then(
            () => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.runningDeferred!.resolve();
            },
            (error) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.runningDeferred!.reject(error);
            });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.runningDeferred!.promise;
    }

    /**
     * Event listener for HTTP server "error" event.
     */
    private onError(error) {
        if (error.syscall !== "listen") {
            throw error;
        }

        const bind = typeof this.port === "string"
            ? `Pipe ${this.port}`
            : `Port ${this.port}`;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case "EACCES":
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.runningDeferred!.reject(`${bind} requires elevated privileges`);
                break;
            case "EADDRINUSE":
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.runningDeferred!.reject(`${bind} is already in use`);
                break;
            default:
                throw error;
        }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */
    private onListening(httpServer: IHttpServer) {
        const addr = httpServer.address();
        const bind = typeof addr === "string"
            ? `pipe ${addr}`
            : `port ${addr.port}`;
        winston.info(`Listening on ${bind}`);
    }
}
