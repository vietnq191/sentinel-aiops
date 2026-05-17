/* Self-healing module interfaces */

export interface MitigationResult {
  success: boolean;
  action: string;
  error?: string;
}
