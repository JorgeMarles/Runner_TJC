import Docker from "dockerode"
import fs from "fs";
import { languageMap } from "./LanguageMap";
import { ROOT_DIR } from "../config";
import path from "path";
import * as crypto from 'crypto';

interface ExecutionResult {
    stdout: string;
    stderr: string;
    status: string;
    executionTime: number;
    executionId: string;
}

interface CodeExecutionParams {
    problem_id: string;
    language: string;
    timeout: number;
    memoryLimit: number;
    filename: string;
    tempFilePath: string;
}

function getFileHash(filePath: string): string {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
}

function areFilesEqual(filePath1: string, filePath2: string): boolean {
    try {
        const hash1 = getFileHash(filePath1);
        const hash2 = getFileHash(filePath2);
        return hash1 === hash2;
    } 
    catch (err) {
        console.error('Error processing the files:', err);
        return false;
    }
}

export class CodeExecutor {
    private docker: Docker;
    // private maximunExecutionTime: number;

    constructor() {
        this.docker = new Docker();
        // this.maximunExecutionTime = 20000;
    }

    private async ensureImageExists(imageName: string): Promise<void> {
        try {
            await this.docker.getImage(imageName).inspect();
            console.log(`Image ${imageName} already exists locally`);
        } catch (error) {
            console.log(`Image ${imageName} not found locally, pulling...`);
            await new Promise((resolve, reject) => {
                this.docker.pull(imageName, (err: any, stream: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }
    
                    this.docker.modem.followProgress(stream, (err: any, output: any) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log(`Image ${imageName} pulled successfully`);
                        resolve(output);
                    });
                });
            });
        }
    }

    async executeCode(params: CodeExecutionParams): Promise<ExecutionResult> {
        const {problem_id, language, timeout, memoryLimit, filename, tempFilePath } = params;

        const { image, buildCommand, runCommand, ext } = languageMap[language];    

        let container: Docker.Container | null = null;
        let maximunTestCaseExecutionTime = 0;
        
        const inputsPathDir = path.join(ROOT_DIR, "testCases", `problem_${problem_id}`, "input");
        const outputsPathDir = path.join(ROOT_DIR, "testCases", `problem_${problem_id}`, "output");

        const inputs = fs.readdirSync(inputsPathDir);
        const outputs = fs.readdirSync(outputsPathDir);

        const executionId = path.basename(filename).replace(path.extname(filename), '');
        const executionOutputsDirPath = path.join(path.dirname(tempFilePath), `output_${executionId}`);
        fs.mkdirSync(executionOutputsDirPath, { recursive: true });

        try {
            await this.ensureImageExists(image);
            container = await this.docker.createContainer({
                Image: image,
                Tty: false,
                Cmd: ["/bin/bash", "-c", "while true; do sleep 1; done"],
                HostConfig: {
                    Binds: [`${tempFilePath}:/code/${filename}`, `${ROOT_DIR}/testCases:/testCases`],
                    Memory: memoryLimit * 1024 * 1024,
                    NanoCpus: 1000000000
                }
            });
            // /usr/bin/time -f '%e'
            await container.start();

            try {
                const exec: Docker.Exec = await container.exec({
                    Cmd: ["/bin/bash", "-c", `${buildCommand(filename)}`],
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: false,
                });

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

                const compilationResult = await new Promise<ExecutionResult>(
                    async (resolve, reject) => {
                        stream.on("end", async () => {
                            const { ExitCode } = await exec!.inspect();
                            if (ExitCode !== 0) {
                                console.error("Compilation error:", stderr, stdout);
                                resolve({ stdout: stdout, stderr: stderr, status: "Compilation error", executionTime: 0, executionId: executionId});
                            }
                            resolve({ stdout: "", stderr: "", status: "OK", executionTime: 0, executionId: executionId});
                        });
        
                        stream.on("error", (error) => {
                            reject(new Error(`Stream error: ${error.message}`));
                        });
                    }
                );

                if (compilationResult.status !== "OK") {
                    await fs.promises.rm(tempFilePath, { recursive: true, force: true });
                    await fs.promises.rm(executionOutputsDirPath, { recursive: true, force: true });
                    container?.remove({ force: true });
                    return compilationResult;
                }
            }
            catch (error) {
                throw error;
            }

            for (let i = 0; i < inputs.length; ++i) {
                try {
                    const inputFilename = `/testCases/problem_${problem_id}/input/${path.basename(inputs[i])}`;
                    const exec: Docker.Exec = await container.exec({
                        Cmd: ["/bin/bash", "-c", `${runCommand(filename, inputFilename)}`],
                        AttachStdout: true,
                        AttachStderr: true,
                        Tty: false,
                    });
    
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
                    let timeoutHandle: NodeJS.Timeout;
    
                    const executionPromise = new Promise<ExecutionResult>(
                        async (resolve, reject) => {
                            stream.on("end", async () => {
                                clearTimeout(timeoutHandle);
                                if (executionKilled) {
                                    resolve({ stdout: stdout, stderr: stderr, status: "Time Limit Exceeded", executionTime: timeout, executionId: executionId});
                                }
                                const { ExitCode } = await exec!.inspect();
                                if (ExitCode !== 0) {
                                    resolve({ stdout: stdout, stderr: stderr, status: "Runtime error", executionTime: 0, executionId: executionId});
                                }
                                resolve({ stdout: stdout, stderr: stderr, status: "OK", executionTime: 0, executionId: executionId});
                            });
            
                            stream.on("error", (error) => {
                                reject(new Error(`Stream error: ${error.message}`));
                            });
                        }
                    );
    
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutHandle = setTimeout(async () => {
                            try {
                                executionKilled = true;
                                await container?.kill();
                            } 
                            catch (err) {
                                console.error("Failed to kill the process:", err);
                            }
                            reject(new Error("Timeout"));
                        }, timeout);
                    });
        
                    const result = await Promise.race([timeoutPromise, executionPromise]);
                    
                    if (result.status !== "OK") {
                        await fs.promises.rm(tempFilePath, { recursive: true, force: true });
                        await fs.promises.rm(executionOutputsDirPath, { recursive: true, force: true });
                        container?.remove({ force: true });
                        return result;
                    }
                    fs.writeFileSync(path.join(executionOutputsDirPath, outputs[i]), result.stdout);
                }
                catch (error) {
                    throw error;
                }
            }
        }
        catch (error) {
            await fs.promises.rm(tempFilePath, { recursive: true, force: true });
            await fs.promises.rm(executionOutputsDirPath, { recursive: true, force: true });
            container?.remove({ force: true });
            throw error;
        } 
        await fs.promises.rm(tempFilePath, { recursive: true, force: true });
        container?.remove({ force: true });

        for (let output of outputs) {
            const executionOutputPath = path.join(executionOutputsDirPath, output);
            const expectedOutputPath = path.join(outputsPathDir, output);
            
            if (!areFilesEqual(executionOutputPath, expectedOutputPath)) {
                return { stdout: "", stderr: "", status: "Wrong answer", executionTime: maximunTestCaseExecutionTime, executionId: executionId };
            }
        }

        await fs.promises.rm(executionOutputsDirPath, { recursive: true, force: true });

        return { stdout: "", stderr: "", status: "Accepted", executionTime: maximunTestCaseExecutionTime, executionId: executionId };
    }
}
