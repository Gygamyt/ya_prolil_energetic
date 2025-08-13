// import { Employee } from '@repo/shared/src/schemas';
//
// export interface TeamStats {
//     total: number;
//     grades: Record<string, number>;
//     roles: Record<string, number>;
//     topSkills: Record<string, number>;
//     locations: Record<string, number>;
// }
//
// // export interface AnalysisRequest {
// //     type: 'team-analysis' | 'employee-profile' | 'skill-assessment' | 'client-request-analysis';
// //     employees: Employee[];
// //     context?: Record<string, any>;
// //     clientRequest?: ClientRequest;
// // }
//
// export interface TeamAnalysisResult {
//     success: boolean;
//     analysis: string;
//     stats: TeamStats;
//     duration: number;
//     tokensUsed?: number;
//     timestamp: string;
// }
//
// // TODO: add when traits docs will be added by leads
// export interface EmployeePersonalityTrait {
//     employeeId: string;
//     leadAssessment: {
//         workStyle: string;
//         strengths: string[];
//         areasForDevelopment: string[];
//         communicationStyle: string;
//         teamCollaboration: string;
//         notes?: string;
//     };
//     lastUpdated: string;
// }
//
// export interface EmployeeProfileAnalysisRequest extends AnalysisRequest {
//     type: 'employee-profile';
//     targetEmployeeId: string;
//     personalityTraits?: EmployeePersonalityTrait; // TODO: Использовать когда добавим
// }
//
// // export interface ClientRequest {
// //     technologies: string[];
// //     projectType: 'web-development' | 'mobile-app' | 'test-automation' | 'api-testing' | 'performance-testing' | 'full-stack';
// //     teamSize: number;
// //     duration: string;
// //     seniority: ('Junior' | 'Middle' | 'Senior' | 'Lead')[];
// //     timeline: string;
// //     budget?: string;
// //     specialRequirements?: string[];
// // }
// //
// // export interface ClientRequestAnalysisResult {
// //     success: boolean;
// //     feasibility: 'high' | 'medium' | 'low';
// //     recommendedTeam: {
// //         employeeIds: string[];
// //         totalCost?: number;
// //         startDate?: string;
// //     };
// //     risks: string[];
// //     alternatives: string[];
// //     analysis: string;
// //     timestamp: string;
// // }
