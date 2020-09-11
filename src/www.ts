/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import path from "path";
import { runService } from "@fluidframework/server-services-utils";
import { GatewayResourcesFactory, GatewayRunnerFactory } from "./runnerFactory";

runService(
    new GatewayResourcesFactory(),
    new GatewayRunnerFactory(),
    "gateway",
    path.join(__dirname, "../config.json"));
