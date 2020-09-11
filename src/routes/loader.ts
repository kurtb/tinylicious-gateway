/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IFluidCodeDetails } from "@fluidframework/container-definitions";
import { extractPackageIdentifierDetails } from "@fluidframework/web-code-loader";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { Provider } from "nconf";
import sillyname from "sillyname";
import { v4 } from "uuid";
import { queryParamAsString } from "../utils";
import { defaultPartials } from "./partials";

export function create(
    config: Provider,
): Router {
    const router: Router = Router();

    const jwtKey = config.get("gateway:key");

    router.get("*", (request, response) => {
        const chaincode: string = queryParamAsString(request.query.chaincode);
        let codeDetails: IFluidCodeDetails | undefined;

        if (chaincode !== "") {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            const cdn = request.query.cdn ? request.query.cdn : config.get("npm");
            const entryPoint = queryParamAsString(request.query.entrypoint);

            if (chaincode.startsWith("http")) {
                codeDetails = {
                    config: {
                        [`@gateway:cdn`]: chaincode,
                    },
                    package: {
                        fluid: {
                            browser: {
                                umd: {
                                    files: [chaincode],
                                    library: entryPoint,
                                },
                            },
                        },
                        name: `@gateway/${v4()}`,
                        version: "0.0.0",
                    },
                };
            } else {
                const details = extractPackageIdentifierDetails(chaincode);
                codeDetails = {
                    config: {
                        [`@${details.scope}:cdn`]: cdn,
                    },
                    package: chaincode,
                };
            }
        }

        const name = sillyname();

        const claims = {
            user: {
                displayName: name,
                id: v4(),
                name,
            },
        };

        const jwtToken = jwt.sign(claims, jwtKey);

        response.render(
            "loader",
            {
                chaincode: JSON.stringify(codeDetails),
                jwt: jwtToken,
                partials: defaultPartials,
                title: request.params[0],
            });
    });

    return router;
}
