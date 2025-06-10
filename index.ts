import express from 'express';
import "reflect-metadata";
import bodyParser from 'body-parser';
import { PORT } from './config/index';
import cors from 'cors';
import { testCasesRouter } from './routers/TestCasesRouter';
import { runnerRouter } from './routers/RunnerRouter';
import { connectRabbitMQ } from './service/RabbitMQ';
import { registerService } from "./services/Consul";

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use('/testCases', testCasesRouter);
app.use('/runner', runnerRouter);

const run = async () => {
    try {
        await connectRabbitMQ();
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error(e.message);
        }
        else console.error("Error connecting to RabbitMQ");
    }
    app.get("/health", (req: express.Request, res: express.Response) => {
        res.status(200).send("OK");
    });
    app.listen(PORT, async() => {
        console.log(`Listening in port ${PORT}`);
        await registerService();
    })
};

run();