/* Default SRE AI prompt template for Gemini incident analysis */

export const DEFAULT_AI_PROMPT_TEMPLATE = `You are an expert SRE. I have {totalCount} occurrences of this error pattern:
Error Type: {errorCode}
Sample Logs: {sampleLogs}

Provide:
1. **SEVERITY**: [INFO / WARN / ERROR / CRITICAL]
2. **ROOT CAUSE**: [Brief explanation]
3. **REMEDIATION**: [Step-by-step instructions]`;
