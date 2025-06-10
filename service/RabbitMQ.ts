import ampq from 'amqplib';
import { RABBITMQ_HOST, RABBITMQ_PASSWORD, RABBITMQ_PORT, RABBITMQ_USERNAME } from '../config';

type QueueInfo = {
    type: string,
    exchange: string,
    arguments: {
        [key: string]: any
    }
}

type QueueOutData = {
    info?: QueueInfo,
    queue: ampq.Replies.AssertQueue | null,
}

type QueueInData = {
    info?: QueueInfo,
    queue: ampq.Replies.AssertQueue | null,
    consume: (channel: ampq.Channel, msg: ampq.ConsumeMessage | null) => Promise<any>
}

type RabbitMQUtils = {
    queuesOut: {
        [key: string]: QueueOutData
    },
    queuesIn?: {
        [key: string]: QueueInData
    }
    channel: ampq.Channel | null
}

const rmq: RabbitMQUtils = {
    queuesOut: {
        'submission-stats': {
            queue: null,
        },
        'submission-update': {
            queue: null
        }
    },
    channel: null
}

export const connectRabbitMQ = async () => {
    try {
        console.log('Connecting to RabbitMQ at', getRabbitMQURL(), '...');

        const connection = await ampq.connect(getRabbitMQURL());
        const channel = await connection.createChannel();

        for (const key in rmq.queuesOut) {
            const queue = key;
            rmq.queuesOut[key].queue = await channel.assertQueue(queue, { durable: true });
            if (rmq.queuesOut[key].info) {
                const { type, exchange } = rmq.queuesOut[key].info;
                await channel.assertExchange(exchange, type, { durable: true, arguments: rmq.queuesOut[key].info.arguments });
                await channel.bindQueue(queue, exchange, key);
            }
            console.log(`Queue ${queue} is ready`);
        }

        for (const key in rmq.queuesIn) {
            const queue = key;
            rmq.queuesIn[key].queue = await channel.assertQueue(queue, { durable: true });
            channel.consume(queue, async (msg) => rmq.queuesIn![key].consume(channel, msg), { noAck: false });
        }

        rmq.channel = channel;

    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        throw error;
    }
}



type SubmissionData = {
    submissionId: string;
    userId: number;
    problemId: number;
    veredict: string;
    submissionTime: Date;
}


type SubmissionMessage = {
    type: "submission";
    data: SubmissionData;
}

export type SubmissionUpdateInfo = {
    id: string;
    type_update?: "save" | "end" | "error"
    veredict: string;
    output: string;
    time_running: number;
}

type Message = SubmissionMessage | SubmissionUpdateInfo;

export const sendRegisterSubmission = async (submissionId: string, userId: number, problemId: number, veredict: string, submissionTime: Date) => {
    const message: Message = {
        type: "submission",
        data: {
            submissionId,
            userId,
            problemId,
            veredict,
            submissionTime
        }
    }
    await publishMessage('submission-stats', JSON.stringify(message));
    console.log(`Submission ${submissionId} registered`);
}

export const sendSubmissionUpdateMessage = async (type_update: "save" | "end" | "error", submissionId: string, veredict: string, output: string, time_running: number) => {
    const message: SubmissionUpdateInfo = {
        type_update,
        id: submissionId,
        output,
        time_running,
        veredict
    }
    await publishMessage('submission-update', JSON.stringify(message))
    console.log(`Submission ${submissionId} updated`);
    
}

const publishMessage = async (queue: string, message: string, options?: ampq.Options.Publish) => {
    try {
        const queueObj: ampq.Replies.AssertQueue | null = rmq.queuesOut[queue].queue;
        if (!queueObj || !rmq.channel) {
            throw new Error(`Either the Channel or the Queue ${queue} is not initialized or does not exist.`);
        }
        rmq.channel.sendToQueue(queueObj.queue, Buffer.from(message), { ...options, persistent: true });
    } catch (error) {
        console.error(`Error publishing message in queue ${queue} to RabbitMQ:`, error);
        throw error;
    }
}

const getRabbitMQURL = () => {
    return `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
}