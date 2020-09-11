/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fs from "fs";
import path from "path";
// tslint:disable-next-line: ordered-imports
import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { Provider } from "nconf";
import passport from "passport";
import passportJWT from "passport-jwt";
import favicon from "serve-favicon";
import expiry from "static-expiry";
import winston from "winston";
import * as gatewayRoutes from "./routes";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const split = require("split");
// Base endpoint to expose static files at
const staticFilesEndpoint = "/public";

// Helper function to translate from a static files URL to the path to find the file
// relative to the static assets directory
export function translateStaticUrl(
    url: string,
    cache: { [key: string]: string },
    furl: (val: string) => string,
    production: boolean): string {
    const local = url.substring(staticFilesEndpoint.length);
    if (!(local in cache)) {
        const parsedPath = path.parse(local);
        parsedPath.name = `${parsedPath.name}.min`;
        // base and root are marked undefined to placate the TS definitions and because we want the format to
        // resolve with dir/ext/name. Base and root if defined will override.
        const minified = path.format({
            base: undefined,
            dir: parsedPath.dir,
            ext: parsedPath.ext,
            name: parsedPath.name,
            root: undefined,
        });

        // Cache the result and then update local
        cache[local] =
            production && fs.existsSync(path.join(__dirname, "../public", minified))
                ? minified
                : local;
    }

    return staticFilesEndpoint + furl(cache[local]);
}

/**
 * Basic stream logging interface for libraries that require a stream to pipe output to (re: Morgan)
 */
const stream = split().on("data", (message) => {
    winston.info(message);
});

export function create(config: Provider) {
    // Maximum REST request size
    const requestSize = config.get("gateway:restJsonSize");

    // Static cache to help map from full to minified files
    const staticMinCache: { [key: string]: string } = {};

    const opts = {
        jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.get("gateway:key"),
    };

    passport.use(new passportJWT.Strategy(opts, (payload, done) => {
        // eslint-disable-next-line no-null/no-null
        return done(null, payload);
    }));

    // Express app configuration
    const app: express.Express = express();

    // Running behind iisnode
    app.set("trust proxy", 1);

    // view engine setup
    app.set("views", path.join(__dirname, "../views"));
    app.set("view engine", "hjs");

    app.use(compression());
    app.use(favicon(path.join(__dirname, "../public", "favicon.ico")));
    // TODO we probably want to switch morgan to use the common format in prod
    app.use(morgan(config.get("logger:morganFormat"), { stream }));

    app.use(cookieParser());
    app.use(bodyParser.json({ limit: requestSize }));
    app.use(bodyParser.urlencoded({ limit: requestSize, extended: false }));
    app.use(passport.initialize());

    app.use(staticFilesEndpoint, expiry(app, { dir: path.join(__dirname, "../public") }));
    app.locals.hfurl = () => (value: string) => {
        return translateStaticUrl(
            value,
            staticMinCache,
            app.locals.furl,
            app.get("env") === "production");
    };
    app.use(staticFilesEndpoint, cors(), express.static(path.join(__dirname, "../public")));

    // bind routes
    const routes = gatewayRoutes.create(config);

    app.use(routes.home);
    app.use(routes.api);
    app.use("/", routes.loader);

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
        const err = new Error("Not Found");
        (err as any).status = 404;
        next(err);
    });

    // development error handler
    // will print stacktrace
    if (app.get("env") === "development") {
        app.use((err, req, res, next) => {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            res.status(err.status || 500);
            res.render("error", {
                error: err,
                message: err.message,
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use((err, req, res, next) => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        res.status(err.status || 500);
        res.render("error", {
            error: {},
            message: err.message,
        });
    });

    return app;
}
