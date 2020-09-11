/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseHost, IBaseHostConfig } from "@fluidframework/base-host";
import { IDocumentServiceFactory } from "@fluidframework/driver-definitions";
import { DefaultErrorTracking, RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver";
import { ContainerUrlResolver } from "@fluidframework/routerlicious-host";
import { HTMLViewAdapter } from "@fluidframework/view-adapters";
import { SemVerCdnCodeResolver } from "@fluidframework/web-code-loader";
import { IFluidCodeDetails } from "@fluidframework/container-definitions";
import { debug } from "./debug";

async function getFluidObjectAndRender(baseHost: BaseHost, url: string, div: HTMLDivElement) {
    const fluidObject = await baseHost.requestFluidObject(url);
    if (fluidObject === undefined) {
        return;
    }

    // Render the Fluid object with an HTMLViewAdapter to abstract the UI framework used by the Fluid object
    const view = new HTMLViewAdapter(fluidObject);
    view.render(div, { display: "block" });
}

export async function initialize(
    url: string,
    chaincode: IFluidCodeDetails | undefined,
    jwt: string,
) {
    const documentServiceFactories: IDocumentServiceFactory[] = [];

    documentServiceFactories.push(new RouterliciousDocumentServiceFactory(
        false,
        new DefaultErrorTracking(),
        false,
        true));

    const resolver = new ContainerUrlResolver(document.location.origin, jwt);

    const hostConfig: IBaseHostConfig = {
        documentServiceFactory: documentServiceFactories,
        urlResolver: resolver,
        codeResolver: new SemVerCdnCodeResolver(),
    };

    const baseHost = new BaseHost(hostConfig);

    debug(`Loading ${url}`);

    const div = document.getElementById("content") as HTMLDivElement;

    const container = await baseHost.initializeContainer(url, chaincode);

    // Currently this contextChanged handler covers both the initial load (from NullRuntime) as well as the upgrade
    // scenario.  In the next version of base-host it will only be for the upgrade scenario.
    container.on("contextChanged", () => {
        getFluidObjectAndRender(baseHost, url, div).catch(() => { });
    });
    await getFluidObjectAndRender(baseHost, url, div);

    container.on("error", (error) => {
        console.error(error);
    });

    return container;
}
