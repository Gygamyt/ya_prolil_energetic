import { ParseStrategy } from "../types";
import { ParserStrategy } from "./parser-engine";

/**
 * Strategy manager: handles strategy switching and fallback logic
 */
export class StrategyManager {
    private strategies: Map<ParseStrategy, ParserStrategy>;

    constructor() {
        this.strategies = new Map();
    }

    /**
     * Register a parsing strategy
     */
    register(strategy: ParserStrategy): void {
        this.strategies.set(strategy.name, strategy);
    }

    /**
     * Get strategy by name
     */
    get(strategy: ParseStrategy): ParserStrategy | undefined {
        return this.strategies.get(strategy);
    }

    /**
     * Get fallback strategy when primary fails
     */
    getFallback(base: ParseStrategy): ParserStrategy | undefined {
        // Example fallback chain: nlp -> hybrid -> standard
        if (base === "nlp") return this.strategies.get("hybrid");
        if (base === "hybrid") return this.strategies.get("standard");
        return this.strategies.get("standard");
    }
}
