import { ClientRequest, MatchingRequirements } from "../types/request.types";

export function mapParseResultToMatchingRequirements(
    parseData: Partial<ClientRequest>
): MatchingRequirements {
    return {
        levels: parseData.levels,
        languageRequirements: parseData.languageRequirements,
        teamSize: parseData.teamSize,

        location: parseData.location ? {
            regions: parseData.location.regions,
            workType: parseData.location.workType,
            timezone: parseData.location.timezone
        } : undefined,

        experience: parseData.experience ? {
            minTotalYears: parseData.experience.minTotalYears,
            leadershipRequired: parseData.experience.leadershipRequired,
            roleExperience: parseData.experience.roleExperience
        } : undefined,

        role: parseData.role,
        responsibilities: parseData.responsibilities,
        industry: parseData.industry,

        skills: parseData.skills ? {
            required: parseData.skills.required,
            preferred: parseData.skills.preferred
        } : undefined
    };
}

export type { MatchingRequirements };
