import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ONE_MINUTE_IN_MS,
  MS_TO_SECONDS_FACTOR,
  NANOSECOND_PADDING,
  INITIAL_TIMESTAMP_NS,
} from './constants/loki.constants.js';

@Injectable()
export class LokiService {
  private readonly logger = new Logger(LokiService.name);
  private readonly lokiQueryUrl = (process.env.LOKI_QUERY_URL || '').trim();
  private lastProcessedTimestampNs = INITIAL_TIMESTAMP_NS;

  constructor() {
    if (!this.lokiQueryUrl) {
      throw new Error('FATAL: LOKI_QUERY_URL environment variable is not defined or is empty!');
    }
  }

  /* Query Loki API to fetch all new error occurrences recorded in the last minute */
  async fetchLatestErrors(): Promise<string[]> {
    try {
      const query = '{app="sentinel-simulator"} |= "error"';
      const start = Math.floor((Date.now() - ONE_MINUTE_IN_MS) / MS_TO_SECONDS_FACTOR);
      
      const response = await axios.get(this.lokiQueryUrl, {
        params: {
          query,
          start: `${start}${NANOSECOND_PADDING}`,
        }
      });

      const results = response.data.data.result;
      if (!results || results.length === 0) return [];

      /* Extract raw values in [timestamp_ns, log_message] format */
      const rawEntries: [string, string][] = results.flatMap((res: any) => res.values);
      
      /* Filter out previously processed entries using nanosecond timestamp comparison */
      const newEntries = rawEntries.filter(([ts]) => ts > this.lastProcessedTimestampNs);
      if (newEntries.length === 0) return [];

      /* Update state tracker with the latest log entry timestamp of this cycle */
      const timestamps = newEntries.map(([ts]) => ts);
      const maxTimestamp = timestamps.reduce((max, current) => current > max ? current : max, INITIAL_TIMESTAMP_NS);
      this.lastProcessedTimestampNs = maxTimestamp;

      /* Map raw elements and return error messages */
      const logs = newEntries.map(([, msg]) => msg);
      return logs;
    } catch (error: any) {
      this.logger.error(`Error fetching logs from Loki: ${error.message}`);
      return [];
    }
  }
}
