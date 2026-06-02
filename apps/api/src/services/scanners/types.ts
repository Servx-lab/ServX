export interface Finding {
  id: string; // unique ID for frontend tracking/testing
  scanner: 'sast' | 'secret' | 'sca' | 'iac' | 'dast';
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  description: string;
  remediation?: string;
  file?: string;        // Path to the file where finding was found
  line?: number;        // Line number
  cve?: string;         // CVE if applicable
  cwe?: string[];       // CWE array if applicable
  evidence?: string;    // Code evidence / exact match string
  timestamp: string;
}

export type ScanEmitFn = (event: string, data: any) => void;
