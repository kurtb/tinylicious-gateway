/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Provider } from "nconf";
import * as api from "./api";
import * as home from "./home";
import * as loader from "./loader";

export const create = (config: Provider) => ({
    api: api.create(config),
    home: home.create(),
    loader: loader.create(config),
});
