/**
 * Removes empty rows (all fields empty or whitespace) from an array of row objects.
 *
 * @param rows - An array of validated row objects.
 * @returns A new array containing only non-empty rows.
 */
export function removeEmptyRows<T extends Record<string, any>>(rows: T[]): T[] {
    return rows.filter(row =>
        Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== "")
    );
}

/**
 * Applies removeEmptyRows to all arrays of row objects within a container.
 *
 * @param data - An object containing one or more arrays of row objects.
 *               For example: { validRows: T[]; invalidRows: T[] }.
 * @returns A new object with the same keys, each with its rows filtered.
 */
export function cleanAllRowGroups<T extends Record<string, any>>(data: {
    [group: string]: T[];
}): { [K in keyof typeof data]: T[] } {
    const result: Partial<{ [K in keyof typeof data]: T[] }> = {};
    for (const key in data) {
        if (Array.isArray(data[key])) {
            result[key] = removeEmptyRows(data[key]);
        } else {
            result[key] = data[key];
        }
    }
    return result as { [K in keyof typeof data]: T[] };
}

/**
 * Removes empty strings and boolean values (false/true) from the beginning of each inner array.
 * @param rows The 2D array of strings to process.
 * @returns A new 2D array with the specified values removed.
 */
export function removeEmptyNonRequiredInfoFrom2DArray(rows: string[][]): string[][] {
    return rows.map(innerArr => {
        let newArr = [...innerArr];
        if (newArr.length > 0) {
            const firstValue = newArr[0].toLowerCase();
            if (firstValue === 'false' || firstValue === 'true') {
                newArr.shift();
            }
        }
        return newArr.filter(str => str !== '');
    });
}
