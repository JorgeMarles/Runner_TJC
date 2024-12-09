import Docker from "dockerode"
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
}

interface CodeExecutionParams {
    code: string;
    language: string;
    timeout: number;
    memoryLimit: number;
}

export class CodeExecutor {
    private docker: Docker;
    private languageMap: Record<string, { image: string; 
                                          buildCommand: (fileName: string) => string; 
                                          runCommand: (fileName: string) => string; 
                                          ext: string; }>;

    constructor() {
        this.docker = new Docker();
        this.languageMap = {
            python: {
                image: "python:3.10",
                buildCommand: (fileName: string) => "",
                runCommand: (fileName: string) => `python3 ${fileName}`,
                ext: "txt"
            },
            cpp: {
                image: "gcc:latest",
                buildCommand: (fileName: string) => `g++ -std=c++23 ${fileName} -o program`,
                runCommand: (fileName: string) => `./program`,
                ext: "cpp"
            },
            java: {
                image: "openjdk:17",
                buildCommand: (fileName: string) => `javac ${fileName}`,
                runCommand: (fileName: string) => `java ${fileName.replace(".java", "")}`,
                ext: "java"
            }
        };
    }

    async executeCode(params: CodeExecutionParams): Promise<ExecutionResult> {
        const {code, language, timeout, memoryLimit } = params;

        if (!this.languageMap[language]) {
            throw new Error(`Language not supported: ${language}`);
        }

        const { image, buildCommand, runCommand, ext } = this.languageMap[language];
        const uniqueId = uuidv4();
        const tempFilePath = `/tmp/${uniqueId}.${ext}`;
    
        fs.writeFileSync(tempFilePath, code);

        let container: Docker.Container | null = null;

        try {
            container = await this.docker.createContainer({
                Image: image,
                Tty: false, 
                Cmd: ["/bin/bash", "-c", `${buildCommand} && /usr/bin/time -f '%e' ${runCommand(`/code/${uniqueId}.${ext}`)}`],
                HostConfig: {
                    Binds: [`${tempFilePath}:/code/${uniqueId}.${ext}`],
                    Memory: memoryLimit * 1024 * 1024,
                    NanoCpus: 1000000000
                }
            });

            await container.start();

            const stream = await container.attach({ stream: true, stdout: true, stderr: true, });
            let stdout = "";
            let stderr = "";

            stream.on("data", (chunk) => {
                stdout += chunk.toString();
            });

            const timeoutPromise = new Promise<ExecutionResult>((_, reject) =>
                setTimeout(() => {
                    if (container) {
                        container.kill();
                    }
                  reject(new Error("Time Limit Exceeded"));
                }, timeout + 1000)
            );
            
            const execPromise = container.wait().then(async (data) => {
                const {StatusCode } = data;

                const executionTime = parseFloat(stdout.trim());

                return {
                    stdout,
                    stderr,
                    exitCode: StatusCode,
                    executionTime,
                };
            });

            const result =  await Promise.race([timeoutPromise, execPromise]);
            
            await container.remove({ force: true });
            
            return result;
        }
        catch (error) {
            if (container) {
                await container.remove({ force: true });
            }
            throw error;
        } 
        finally {
            fs.unlinkSync(tempFilePath);
        }
    }
}