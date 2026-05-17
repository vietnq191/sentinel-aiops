import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { SHORT_CONTAINER_ID_LENGTH, TARGET_CONTAINER_NAME } from './constants/self-healing.constants.js';
import { MitigationResult } from './interfaces/self-healing.interface.js';

@Injectable()
export class SelfHealingService {
  private readonly logger = new Logger(SelfHealingService.name);
  private docker: Docker;

  constructor() {
    /* Connects to /var/run/docker.sock by default on Unix systems */
    this.docker = new Docker();
  }

  /* Automatically mitigate system errors via container orchestration */
  async mitigateError(errorCode: string): Promise<MitigationResult> {
    this.logger.log(`Evaluating mitigation strategy for error: ${errorCode}`);

    /* Define remediation pathways based on error codes */
    if (errorCode === 'ERR_SYS_OOM' || errorCode.includes('OOM') || errorCode.includes('heap out of memory')) {
      this.logger.warn(`OOM Error detected! Initiating container restart for: ${TARGET_CONTAINER_NAME}`);
      
      try {
        const action = await this.restartContainer(TARGET_CONTAINER_NAME);
        return { success: true, action };
      } catch (err: any) {
        this.logger.error(`OOM Mitigation failed: ${err.message}`);
        return { success: false, action: 'Restart Simulator Container', error: err.message };
      }
    }

    if (errorCode === 'ERR_DB_001' || errorCode.includes('Database connection timed out')) {
      this.logger.warn(`Database Timeout Error detected! Initiating recovery routine by restarting consumer app: ${TARGET_CONTAINER_NAME}`);
      
      try {
        const action = await this.restartContainer(TARGET_CONTAINER_NAME);
        return { success: true, action };
      } catch (err: any) {
        this.logger.error(`DB Timeout Mitigation failed: ${err.message}`);
        return { success: false, action: 'Restart Database Consumer', error: err.message };
      }
    }

    this.logger.log(`No automatic mitigation policy defined for error: ${errorCode}. Skipping self-healing.`);
    return { success: false, action: 'No Action Defined' };
  }

  /* Perform standard docker container restart mitigation */
  private async restartContainer(name: string): Promise<string> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const targetContainer = containers.find(c => 
        c.Names.some(n => n.includes(name))
      );

      if (!targetContainer) {
        throw new Error(`Container "${name}" not found on the host`);
      }

      this.logger.log(`Found container ID: ${targetContainer.Id}. Sending restart command...`);
      const container = this.docker.getContainer(targetContainer.Id);
      await container.restart();
      
      const successMsg = `Successfully restarted container "${name}" (${targetContainer.Id.substring(0, SHORT_CONTAINER_ID_LENGTH)})`;
      this.logger.log(successMsg);
      return successMsg;
    } catch (error: any) {
      this.logger.error(`Failed to restart container "${name}": ${error.message}`);
      throw error;
    }
  }
}
