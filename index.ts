import express from 'express';
import "reflect-metadata";
import bodyParser from 'body-parser';
import { PORT } from './config/index';
import cors from 'cors';
import { testCasesRouter } from './routers/TestCasesRouter';
import { runnerRouter } from './routers/RunnerRouter';
import { connectRabbitMQ } from './service/RabbitMQ';

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
    app.listen(PORT, () => console.log(`Listening in port ${PORT}`));
};

run();