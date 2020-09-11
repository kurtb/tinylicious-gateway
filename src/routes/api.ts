/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { parse, UrlWithStringQuery } from "url";
import { IResolvedUrl } from "@fluidframework/driver-definitions";
import { ScopeType } from "@fluidframework/protocol-definitions";
import { getR11sToken, IAlfredUser } from "@fluidframework/routerlicious-urlresolver";
import { Request, Router } from "express";
import safeStringify from "json-stringify-safe";
import { Provider } from "nconf";
import passport from "passport";

async function getInternalComponent(
    request: Request,
    config: Provider,
    url: UrlWithStringQuery,
    scopes: ScopeType[],
    tenantId,
    appTenants,
): Promise<IResolvedUrl> {
    const gatewayUrl = parse(config.get("gateway:url"));
    if (gatewayUrl.host !== url.host || gatewayUrl.pathname === undefined) {
        return Promise.reject("Must be a gateway URL");
    }

    // parse inbound URL into parts
    const regex = /^\/([^/?]*)(\/?.*)$/;

    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec, @typescript-eslint/no-non-null-assertion
    const match = url.path!.match(regex);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!match) {
        return Promise.reject("Must be a gateway URL");
    }

    const safeTenantId = encodeURIComponent(tenantId);
    const documentId = match[1];
    const path = match[2];

    const orderer = config.get("tinylicious");
    const parsedOrderer = parse(orderer);

    const user: IAlfredUser = (request as any).user.user;

    const token = getR11sToken(tenantId, documentId, appTenants, scopes, user);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const fluidUrl = `fluid://${parsedOrderer.host}/${tenantId}/${documentId}${path}${url.hash ? url.hash : ""}`;
    const deltaStorageUrl = `${orderer}/deltas/${safeTenantId}/${encodeURIComponent(documentId)}`;
    const storageUrl = `${orderer}/repos/${safeTenantId}`;

    return {
        endpoints: {
            deltaStorageUrl,
            ordererUrl: orderer,
            storageUrl,
        },
        tokens: { jwt: token },
        type: "fluid",
        url: fluidUrl,
    };
}

export function create(config: Provider): Router {
    const router: Router = Router();

    const tenantId = "fluid";
    const appTenants = [
        { id: tenantId, key: "notyetusedbytinylicious" },
    ];

    router.post("/api/v1/load", passport.authenticate("jwt", { session: false }), (request, response) => {
        const url = parse(request.body.url);

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        const scopes: ScopeType[] = request.body.scopes
            ? request.body.scopes
            : [ScopeType.DocRead, ScopeType.DocWrite, ScopeType.SummaryWrite];

        const resultP = getInternalComponent(request, config, url, scopes, tenantId, appTenants);
        resultP.then(
            (result) => response.status(200).json(result),
            (error) => response.status(400).end(safeStringify(error)));
    });

    return router;
}
