import { createHash } from 'crypto';

export function generateEmployeeExternalId(employeeData: {
    Name: string;
    Grade: string;
    Role?: string;
}): string {
    const stableFields = [
        employeeData.Name?.trim().toLowerCase(),
        employeeData.Grade?.trim(),
        employeeData.Role?.trim() || 'Unknown'
    ].filter(Boolean).join('|');

    const hash = createHash('sha256')
        .update(stableFields, 'utf8')
        .digest('hex');

    return `emp_${hash.substring(0, 16)}`;
}

export function isValidExternalId(externalId: string): boolean {
    return /^emp_[a-f0-9]{16}$/.test(externalId);
}
