import Docker from "dockerode"
import fs from "fs";
import { languageMap } from "./LanguageMap";
import e from "express";
import { exec } from "child_process";

interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTime: number;
}

interface CodeExecutionParams {
    problem_id: string;
    language: string;
    timeout: number;
    memoryLimit: number;
    filename: string;
    tempFilePath: string;
}

export class CodeExecutor {
    private docker: Docker;
    private maximunExecutionTime: number;

    constructor() {
        this.docker = new Docker();
        this.maximunExecutionTime = 20000;
    }

    async executeCode(params: CodeExecutionParams): Promise<ExecutionResult> {
        const {problem_id, language, timeout, memoryLimit, filename, tempFilePath } = params;

        console.log(problem_id);
        console.log(language);
        console.log(timeout);        
        console.log(memoryLimit);
        console.log(filename);
        console.log(tempFilePath);

        const { image, buildCommand, runCommand, ext } = languageMap[language];    

        let container: Docker.Container | null = null;

        try {
            container = await this.docker.createContainer({
                Image: image,
                Tty: false,
                Cmd: ["/bin/bash", "-c", "while true; do sleep 1; done"],
                HostConfig: {
                    Binds: [`${tempFilePath}:/code/${filename}`],
                    Memory: memoryLimit * 1024 * 1024,
                    NanoCpus: 1000000000
                }
            });
            // Cmd: ["/bin/bash", "-c", `${buildCommand(`/code/${filename}`)}${runCommand(`/code/${filename}`)}`],
            // /usr/bin/time -f '%e'
            await container.start();

            console.log("Container started");
            try {
                console.log(`g++ /code/${filename} -o /code/program 2>&1 && ./code/program 2>&1`);
                const exec: Docker.Exec = await container.exec({
                    Cmd: ["/bin/bash", "-c", `g++ /code/${filename} -o /code/program 2>&1 && ./code/program 2>&1`],
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: false,
                });

                // while (true) {
                //     const { State } = await container.inspect();
                //     if (!State.Running) {
                //         break;
                //     }
                //     await new Promise(resolve => setTimeout(resolve, 1000));
                // }

                const stream = await exec.start({});
                let stdout = "";
                let stderr = "";
                
                stream.on("data", (chunk) => {
                    const streamType = chunk.readUInt8(0);
                    const payload = chunk.slice(8);
                    if (streamType === 1) {
                        stdout += payload.toString();
                    }
                    else if (streamType === 2) {
                        stderr += payload.toString();
                    }
                });
                
                let executionKilled = false;

                const executionPromise = new Promise<ExecutionResult>(
                    async (resolve, reject) => {
                        stream.on("end", async () => {
                            const { ExitCode } = await exec!.inspect();
                            clearTimeout(timeoutHandle);
                            if (executionKilled) {
                                reject(new Error("Time Limit Exceeded"));
                            }
                            resolve({ stdout: stdout, stderr: stderr, exitCode: ExitCode, executionTime: 0});
                        });
        
                        stream.on("error", (error) => {
                            reject(new Error(`Stream error: ${error.message}`));
                        });
                    }
                );

                let timeoutHandle: NodeJS.Timeout;

                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutHandle = setTimeout(async () => {
                        try {
                            executionKilled = true;
                            await container?.kill();
                        } 
                        catch (err) {
                            console.error("Failed to kill the process:", err);
                        }
                        reject(new Error("Time Limit Exceeded"));
                    }, this.maximunExecutionTime);
                });
    
                const result = await Promise.race([timeoutPromise, executionPromise]);

                return result;
            }
            catch (error) {
                if (container) {
                    await container.remove({ force: true });
                    container = null;
                }
                throw error;
            }
        }
        catch (error) {
            if (container) {
                await container.remove({ force: true });
                container = null;
            }
            throw error;
        } 
        finally {
            if (container) {
                container.remove({ force: true });
                container = null;
            };
            fs.unlinkSync(tempFilePath);
        }
    }
}