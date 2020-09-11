/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BasicWebServerFactory } from "@fluidframework/server-services";
import * as utils from "@fluidframework/server-services-utils";
import { Provider } from "nconf";
import { GatewayRunner } from "./runner";

export class GatewayResources implements utils.IResources {
    public readonly webServerFactory: BasicWebServerFactory;

    constructor(
        public config: Provider,
        public port: any,
    ) {
        this.webServerFactory = new BasicWebServerFactory();
    }

    public async dispose(): Promise<void> {
        return;
    }
}

export class GatewayResourcesFactory implements utils.IResourcesFactory<GatewayResources> {
    public async create(config: Provider): Promise<GatewayResources> {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        const port = utils.normalizePort(process.env.PORT || "3000");
        return new GatewayResources(config, port);
    }
}

export class GatewayRunnerFactory implements utils.IRunnerFactory<GatewayResources> {
    public async create(resources: GatewayResources): Promise<utils.IRunner> {
        return new GatewayRunner(
            resources.webServerFactory,
            resources.config,
            resources.port);
    }
}
