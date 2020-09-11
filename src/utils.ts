/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Helper function to convert Request's query param to a string
 * @param value - The value to be interpreted as a string
 * @returns The provided value as a string, otherwise empty string in any case of error
 */
export const queryParamAsString = (value: any): string => {
    return typeof value === "string" ? value : "";
};
