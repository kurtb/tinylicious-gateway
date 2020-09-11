/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Router } from "express";
import { defaultPartials } from "./partials";

export function create(): Router {
    const router: Router = Router();

    /**
     * Route to retrieve the home page for the app
     */
    router.get("/", (request, response) => {
        response.render("home", {
            partials: defaultPartials,
            title: "Routerlicious",
        });
    });

    return router;
}
